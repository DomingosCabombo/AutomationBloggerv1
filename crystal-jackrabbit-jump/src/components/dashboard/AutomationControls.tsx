"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const AutomationControls = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

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
    showSuccess("Manual scrape initiated...");

    try {
      const { data, error } = await supabase.functions.invoke('music-automation', {
        body: { action: 'run-scrape', userId: user.id }
      });

      if (error) throw error;
      showSuccess("Manual run completed successfully.");
    } catch (error) {
      console.error("Manual run error:", error);
      showError("An error occurred during manual run.");
    } finally {
      setIsProcessing(false);
    }
  };

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
      <CardContent className="flex flex-wrap gap-4">
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
          className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
      </CardContent>
    </Card>
  );
};

export default AutomationControls;