"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SloganUpload from '@/components/dashboard/SloganUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  Sliders, 
  RefreshCw, 
  Upload, 
  Check, 
  Sparkles, 
  BrainCircuit, 
  Headphones, 
  Info,
  Clock,
  AudioLines,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const AudioSlogan = () => {
  const [slogans, setSlogans] = React.useState<{ slogan1_url?: string; slogan2_url?: string }>({});
  const [testMusic, setTestMusic] = React.useState<File | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = React.useState('http://localhost:8001');
  const [isMixing, setIsMixing] = React.useState(false);
  const [isSavingExample, setIsSavingExample] = React.useState(false);
  const [mixedAudioUrl, setMixedAudioUrl] = React.useState<string | null>(null);
  const [songDuration, setSongDuration] = React.useState(0);
  
  // Slogan positions state
  const [slogan1Pos, setSlogan1Pos] = React.useState(10);
  const [slogan2Pos, setSlogan2Pos] = React.useState(120);
  const [originalS1Pos, setOriginalS1Pos] = React.useState(10);
  const [originalS2Pos, setOriginalS2Pos] = React.useState(120);
  const [mixMethod, setMixMethod] = React.useState('sound_engineer_pro');
  const [isModified, setIsModified] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Audio player references
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);

  React.useEffect(() => {
    const loadSlogans = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('automation_settings')
          .select('slogan1_url, slogan2_url, audio_mix_api_url')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setSlogans(data);
          if (data.audio_mix_api_url) {
            setApiBaseUrl(data.audio_mix_api_url);
          }
        }
      }
    };
    loadSlogans();
  }, []);

  const handleSyncSupabaseUrl = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from('automation_settings')
        .update({ audio_mix_api_url: apiBaseUrl })
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess("Link da API sincronizado com o Supabase com sucesso!");
    } catch (e: any) {
      showError(`Erro ao sincronizar link: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [isGeneratingTunnel, setIsGeneratingTunnel] = React.useState(false);

  const handleGenerateAndSyncTunnel = async () => {
    setIsGeneratingTunnel(true);
    try {
      const res = await fetch("/api/start-tunnel", {
        method: "POST"
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Erro desconhecido ao gerar o túnel.");
      }
      
      const newUrl = data.url;
      setApiBaseUrl(newUrl);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('automation_settings')
          .update({ audio_mix_api_url: newUrl })
          .eq('user_id', user.id);
        if (error) throw error;
      }
      
      showSuccess(`Túnel Cloudflare gerado e sincronizado com sucesso: ${newUrl}`);
    } catch (e: any) {
      showError(`Falha ao gerar e sincronizar túnel: ${e.message}`);
    } finally {
      setIsGeneratingTunnel(false);
    }
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('audio')) {
        showError("Por favor seleciona um ficheiro de áudio MP3 válido.");
        return;
      }
      setTestMusic(file);
      setMixedAudioUrl(null);
      setIsModified(false);
    }
  };

  const fetchFileAsBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao obter slogan da cloud");
    return await response.blob();
  };

  const handleMix = async (useManualPositions = false) => {
    if (!testMusic) {
      showError("Carrega primeiro uma música de teste.");
      return;
    }

    setIsMixing(true);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();

    try {
      const formData = new FormData();
      formData.append("music", testMusic);

      // Download slogans as blobs and append to form
      if (slogans.slogan1_url) {
        const s1Blob = await fetchFileAsBlob(slogans.slogan1_url);
        formData.append("slogan1", s1Blob, "slogan1.wav");
      }
      if (slogans.slogan2_url) {
        const s2Blob = await fetchFileAsBlob(slogans.slogan2_url);
        formData.append("slogan2", s2Blob, "slogan2.wav");
      }

      // If we are overriding manually
      if (useManualPositions) {
        formData.append("slogan1_pos", slogan1Pos.toString());
        formData.append("slogan2_pos", slogan2Pos.toString());
      }

      formData.append("job_id", "test_" + Math.random().toString(36).substring(7));

      const res = await fetch(`${apiBaseUrl}/mix`, {
        method: "POST",
        headers: {
          "Bypass-Tunnel-Reminder": "true"
        },
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Falha ao misturar.");
      }

      // Parse positions from headers
      const mixInfoRaw = res.headers.get("X-Mix-Info");
      if (mixInfoRaw) {
        const mixInfo = JSON.parse(mixInfoRaw);
        const s1 = parseFloat(mixInfo.slogan1_position || 0);
        const s2 = parseFloat(mixInfo.slogan2_position || 0);
        
        setSlogan1Pos(s1);
        setSlogan2Pos(s2);
        
        if (!useManualPositions) {
          setOriginalS1Pos(s1);
          setOriginalS2Pos(s2);
        }
        setMixMethod(mixInfo.method || 'sound_engineer_pro');
      }

      const audioBlob = await res.blob();
      const objectUrl = URL.createObjectURL(audioBlob);
      setMixedAudioUrl(objectUrl);
      setIsModified(useManualPositions);
      showSuccess(useManualPositions ? "Mistura manual processada!" : "Mistura inteligente computada com sucesso!");
    } catch (e: any) {
      console.error(e);
      showError(`Erro ao comunicar com a API local: ${e.message}. Verifica se a API está a correr na porta 8001.`);
    } finally {
      setIsMixing(false);
    }
  };

  const handleSaveToML = async () => {
    if (!testMusic || slogan1Pos === 0 || slogan2Pos === 0) return;
    setIsSavingExample(true);
    try {
      const formData = new FormData();
      formData.append("music", testMusic);
      formData.append("slogan1_position", slogan1Pos.toString());
      formData.append("slogan2_position", slogan2Pos.toString());
      formData.append("genre", "TestMix");

      const res = await fetch(`${apiBaseUrl}/train/add`, {
        method: "POST",
        headers: {
          "Bypass-Tunnel-Reminder": "true"
        },
        body: formData
      });

      if (!res.ok) throw new Error("Erro na API ao gravar exemplo.");
      showSuccess("Exemplo gravado! O modelo de IA irá aprender a replicar estas posições.");
    } catch (e: any) {
      showError(`Erro ao treinar IA: ${e.message}`);
    } finally {
      setIsSavingExample(false);
    }
  };

  // Player controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setSongDuration(audioRef.current.duration);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || songDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedPercentage = x / rect.width;
    const newTime = clickedPercentage * songDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const s1Percentage = songDuration ? (slogan1Pos / songDuration) * 100 : 0;
  const s2Percentage = songDuration ? (slogan2Pos / songDuration) * 100 : 0;
  const currentPercentage = songDuration ? (currentTime / songDuration) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            Gestão & Teste de Slogans <AudioLines className="text-indigo-400" size={24} />
          </h1>
          <p className="text-slate-400 text-sm">Carrega slogans oficiais e faz testes interativos de mistura com as tuas próprias faixas de áudio.</p>
        </div>

        {/* 1. SECTION: SLOGAN UPLOADS */}
        <SloganUpload />

        {/* 2. SECTION: INTERACTIVE TEST AND FINE-TUNING PANEL */}
        <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sliders size={20} className="text-indigo-400" />
              Painel de Ajuste Fino & Preview Visual
            </CardTitle>
            <CardDescription className="text-slate-400">
              Arrasta uma música para o painel de teste abaixo e analisa as posições de slogans inteligentes em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* API BASE URL AND FILE SELECTION ROW */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="apiUrl" className="text-slate-300 font-medium">Porta da API de Mixagem Local</Label>
                <Input 
                  id="apiUrl" 
                  className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="Ex: http://localhost:8001" 
                />
                <div className="flex gap-2 mt-1">
                  <Button
                    onClick={handleSyncSupabaseUrl}
                    disabled={isSyncing || isGeneratingTunnel}
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-slate-300 text-xs gap-1.5 h-9 flex-1"
                    title="Sincronizar link atual com o Supabase"
                  >
                    {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    Sincronizar Manual
                  </Button>
                  <Button
                    onClick={handleGenerateAndSyncTunnel}
                    disabled={isSyncing || isGeneratingTunnel}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 h-9 flex-1 font-bold shadow-md shadow-indigo-600/10"
                    title="Gerar novo túnel Cloudflare e sincronizar com Supabase com 1 clique"
                  >
                    {isGeneratingTunnel ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    Gerar e Sincronizar (1-Clique)
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2 grid gap-2">
                <Label className="text-slate-300 font-medium">Carregar Música de Teste (MP3)</Label>
                <div className="flex items-center gap-4">
                  <Label 
                    htmlFor="testSongInput"
                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/20 hover:border-indigo-500/50 rounded-lg cursor-pointer bg-slate-950/20 text-xs text-slate-300 hover:bg-slate-950/50 transition-all font-medium h-10 w-full justify-center"
                  >
                    <Upload size={16} className="text-indigo-400" />
                    {testMusic ? testMusic.name : "Selecionar Ficheiro Mp3"}
                  </Label>
                  <Input 
                    id="testSongInput" 
                    type="file" 
                    accept=".mp3" 
                    className="hidden" 
                    onChange={handleMusicChange}
                  />

                  {testMusic && (
                    <Button 
                      onClick={() => handleMix(false)} 
                      disabled={isMixing || (!slogans.slogan1_url && !slogans.slogan2_url)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-10 shrink-0 px-6 gap-2"
                    >
                      {isMixing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {isMixing ? "A misturar..." : "Mistura Inteligente"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ERROR INSTRUCTIONS IF NO SLOGANS UPLOADED */}
            {!slogans.slogan1_url && !slogans.slogan2_url && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex items-start gap-2.5 text-xs">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso:</strong> Carrega pelo menos um Slogan (Inicial ou Final) na secção acima para poderes fazer um teste de mistura interativo.
                </p>
              </div>
            )}

            {/* 3. SUBSECTION: MIXED PLAYER & TIMELINE VISUALIZER */}
            {mixedAudioUrl && (
              <div className="pt-6 border-t border-white/5 space-y-6 animate-in fade-in duration-300">
                
                {/* TIMELINE PLAYER HEADER */}
                <div className="flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={togglePlay} 
                      className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center p-0 shadow-lg shadow-indigo-600/30 shrink-0"
                    >
                      {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} className="ml-1" fill="white" />}
                    </Button>
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Headphones size={16} className="text-indigo-400" />
                        Preview da Música Misturada
                      </h4>
                      <p className="text-[11px] text-indigo-300 font-mono">
                        {isModified ? "Remisturada com posições manuais" : `IA inteligente: ${mixMethod}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <Clock size={14} className="text-slate-500" />
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-slate-600">/</span>
                    <span>{formatTime(songDuration)}</span>
                  </div>
                </div>

                {/* VISUAL TIMELINE COMPONENT */}
                <div className="space-y-1.5">
                  <div 
                    className="relative w-full h-8 bg-slate-950/80 rounded-lg border border-white/10 overflow-hidden cursor-pointer shadow-inner shadow-black"
                    onClick={handleTimelineClick}
                  >
                    {/* SVG WAVEFORM SIMULATION */}
                    <div className="absolute inset-0 flex items-center justify-between px-1 opacity-20 pointer-events-none">
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = 15 + Math.sin(i * 0.4) * 10 + (i % 3 === 0 ? 8 : 0);
                        return <div key={i} className="w-[3px] bg-slate-400 rounded-full" style={{ height: `${h}px` }} />;
                      })}
                    </div>

                    {/* CURRENT PLAY PROGRESS */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 border-r-2 border-indigo-500 transition-all pointer-events-none duration-100"
                      style={{ width: `${currentPercentage}%` }}
                    />

                    {/* SLOGAN 1 MARKER */}
                    {slogans.slogan1_url && (
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] group"
                        style={{ left: `${s1Percentage}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                          Slogan 1 (Intro): {formatTime(slogan1Pos)}
                        </span>
                      </div>
                    )}

                    {/* SLOGAN 2 MARKER */}
                    {slogans.slogan2_url && (
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                        style={{ left: `${s2Percentage}%` }}
                      >
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                          Slogan 2 (Outro): {formatTime(slogan2Pos)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
                    <span>Início</span>
                    <span>Metade</span>
                    <span>Fim</span>
                  </div>
                </div>

                {/* HIDDEN HTML5 AUDIO TAG */}
                <audio 
                  ref={audioRef} 
                  src={mixedAudioUrl} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="hidden"
                />

                {/* 4. SUBSECTION: CONTROLS & MANUAL ADJUSTMENT */}
                <div className="grid gap-6 md:grid-cols-2 bg-slate-950/20 p-5 rounded-xl border border-white/5">
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Sliders size={16} className="text-indigo-400" />
                      Ajuste Fino de Posições
                    </h5>
                    
                    {slogans.slogan1_url && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <Label htmlFor="s1Slider" className="text-slate-300 font-medium flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Slogan Inicial (Intro)
                          </Label>
                          <span className="font-mono text-emerald-400 font-semibold">{slogan1Pos.toFixed(1)}s</span>
                        </div>
                        <input 
                          id="s1Slider"
                          type="range" 
                          min={0.1} 
                          max={Math.min(60, songDuration / 2 || 30)} 
                          step={0.1}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          value={slogan1Pos}
                          onChange={(e) => {
                            setSlogan1Pos(parseFloat(e.target.value));
                            setIsModified(true);
                          }}
                        />
                      </div>
                    )}

                    {slogans.slogan2_url && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <Label htmlFor="s2Slider" className="text-slate-300 font-medium flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Slogan Final (Outro)
                          </Label>
                          <span className="font-mono text-rose-400 font-semibold">{slogan2Pos.toFixed(1)}s</span>
                        </div>
                        <input 
                          id="s2Slider"
                          type="range" 
                          min={Math.max(slogan1Pos + 5, songDuration / 2 || 60)} 
                          max={Math.max(slogan1Pos + 6, songDuration - 2 || 180)} 
                          step={0.1}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          value={slogan2Pos}
                          onChange={(e) => {
                            setSlogan2Pos(parseFloat(e.target.value));
                            setIsModified(true);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* SAVING TO MODEL OR RE-MIXING BUTTONS */}
                  <div className="flex flex-col justify-end gap-3.5 pt-4 md:pt-0">
                    <Button 
                      onClick={() => handleMix(true)} 
                      disabled={isMixing}
                      variant="outline"
                      className="border-white/10 hover:bg-white/5 text-slate-200 h-11 text-xs gap-2 font-medium"
                    >
                      <RefreshCw className={isMixing ? "animate-spin" : ""} size={16} />
                      Recalcular Mixagem Manual
                    </Button>

                    <Button 
                      onClick={handleSaveToML} 
                      disabled={isSavingExample}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 h-11 text-xs gap-2 font-medium"
                    >
                      {isSavingExample ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                      {isSavingExample ? "A guardar exemplo..." : "Gravar Exemplo para Aprendizado (IA)"}
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AudioSlogan;