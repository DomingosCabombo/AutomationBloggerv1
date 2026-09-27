"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RefreshCw, Zap, Music2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface ProgressState {
  current: number;
  total: number;
  label: string;
}

const AutomationControls = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<ProgressState | null>(null);
  const progressChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Subscrição Realtime aos logs PROGRESS: ──
  const startProgressListener = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Remove canal anterior se existir
    if (progressChannelRef.current) {
      supabase.removeChannel(progressChannelRef.current);
    }

    const channel = supabase
      .channel(`progress_watch_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const msg: string = payload.new?.message ?? '';
          if (!msg.startsWith('PROGRESS:')) return;

          const content = msg.replace('PROGRESS:', '').trim();

          if (content.startsWith('DONE')) {
            setProgress(null);
            setIsProcessing(false);
            progressChannelRef.current && supabase.removeChannel(progressChannelRef.current);
            progressChannelRef.current = null;
            return;
          }

          // Formato: "X/Y — Label..."
          const match = content.match(/^(\d+)\/(\d+)\s*[—-]?\s*(.*)/);
          if (match) {
            const current = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            const label = match[3]?.trim() || '';
            setProgress({ current, total, label });
          }
        }
      )
      .subscribe();

    progressChannelRef.current = channel;
  }, []);

  // Limpa o canal ao desmontar
  React.useEffect(() => {
    return () => {
      if (progressChannelRef.current) {
        supabase.removeChannel(progressChannelRef.current);
      }
    };
  }, []);

  const toggleAutomation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Please log in to control automation.");
      return;
    }

    const newState = !isRunning;
    setIsRunning(newState);
    
    await supabase
      .from('automation_settings')
      .upsert({ user_id: user.id, is_running: newState }, { onConflict: 'user_id' });

    if (newState) {
      showSuccess("Automation engine started successfully.");
    } else {
      showSuccess("Automation engine stopped.");
    }
  };

  const runManual = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Please log in to run manual scrape.");
      return;
    }

    setIsProcessing(true);
    setProgress(null);
    showSuccess("Extração manual iniciada...");

    // Começa a escutar os logs de progresso ANTES de disparar a Edge Function
    await startProgressListener();

    try {
      const { data, error } = await supabase.functions.invoke('music-automation', {
        body: { action: 'run-scrape', userId: user.id }
      });

      if (error) throw error;

      // Se não houve músicas (PROGRESS:DONE pode já ter chegado via Realtime)
      // mas como fallback, garantimos que o estado é limpo
      showSuccess("Extração manual concluída com sucesso.");
    } catch (error) {
      console.error("Manual run error:", error);
      showError("Ocorreu um erro durante a extração manual.");
    } finally {
      // Só limpa se não estiver a espera de progresso via Realtime
      if (!progressChannelRef.current) {
        setIsProcessing(false);
        setProgress(null);
      }
    }
  };

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden">
      <div className={`h-1 w-full ${isRunning ? 'bg-green-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-slate-700'}`} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Zap className={isRunning ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-slate-500"} size={20} />
          Motor de Automação
        </CardTitle>
        <CardDescription className="text-slate-400">
          Controla o robô que extrai, mistura as tuas músicas e as publica automaticamente no Blogger.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <Button 
            size="lg" 
            variant={isRunning ? "destructive" : "default"}
            className="min-w-[160px] gap-2 font-semibold"
            onClick={toggleAutomation}
          >
            {isRunning ? (
              <>
                <Square size={18} fill="currentColor" />
                STOP ENGINE
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                START ENGINE
              </>
            )}
          </Button>

          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-60"
            onClick={runManual}
            disabled={isProcessing}
          >
            <RefreshCw size={18} className={isProcessing ? "animate-spin" : ""} />
            Forçar Extração Manual
          </Button>

          <div className="flex-1 flex items-center justify-end">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-400">Próxima ronda em:</p>
              <p className="text-2xl font-mono font-bold text-indigo-400">14:52</p>
            </div>
          </div>
        </div>

        {/* ── Barra de Progresso em Tempo Real ── */}
        {isProcessing && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <Music2 size={15} className="text-indigo-400 animate-pulse" />
                <span>
                  {progress
                    ? `A processar música ${progress.current} de ${progress.total}`
                    : 'A iniciar extração...'}
                </span>
              </div>
              <span className="text-xs font-mono text-indigo-400 font-bold tabular-nums">
                {progress ? `${progressPercent}%` : '—'}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="h-2 w-full rounded-full bg-slate-700/80 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: progress ? `${progressPercent}%` : '0%',
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  boxShadow: progress && progressPercent > 0
                    ? '0 0 8px rgba(139, 92, 246, 0.6)'
                    : 'none',
                }}
              />
            </div>

            {/* Label da música actual */}
            {progress?.label && (
              <p className="text-xs text-slate-400 truncate leading-relaxed" title={progress.label}>
                {progress.label}
              </p>
            )}

            {/* Indicador de carregamento inicial (antes de chegar o primeiro PROGRESS) */}
            {!progress && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationControls;