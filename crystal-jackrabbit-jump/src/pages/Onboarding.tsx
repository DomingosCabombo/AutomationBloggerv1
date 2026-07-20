import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Music, HardDrive, Globe, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import SloganUpload from '@/components/dashboard/SloganUpload';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [blogId, setBlogId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({
    hasSlogans: false,
    hasGoogleDrive: false,
    hasBlogId: false
  });

  useEffect(() => {
    checkStatus();
  }, [session]);

  const checkStatus = async () => {
    if (!session?.user) return;
    
    // Check Settings
    const { data: settings } = await supabase
      .from('settings')
      .select('blog_id, client_id, client_secret, refresh_token')
      .eq('user_id', session.user.id)
      .maybeSingle();
      
    // Check Automation Settings
    const { data: autoSettings } = await supabase
      .from('automation_settings')
      .select('slogan1_url')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (settings?.blog_id) setBlogId(settings.blog_id);
    if (settings?.client_id) setClientId(settings.client_id);
    if (settings?.client_secret) setClientSecret(settings.client_secret);

    const newStatus = {
      hasSlogans: !!autoSettings?.slogan1_url,
      hasGoogleDrive: !!settings?.refresh_token,
      hasBlogId: !!settings?.blog_id
    };
    
    setStatus(newStatus);
    
    // Auto-advance step if completed
    if (step === 1 && newStatus.hasSlogans) setStep(2);
    if (step === 2 && newStatus.hasGoogleDrive) setStep(3);
  };

  const handleGoogleAuth = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      showError("Por favor, preenche o teu Client ID e Client Secret.");
      return;
    }
    
    setSaving(true);
    try {
      // Guarda temporariamente as chaves de acesso
      const { error } = await supabase.functions.invoke('save-blogger-settings', {
        body: {
          blogId: blogId || '',
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        }
      });
      if (error) throw error;

      // Gera o URL do Google para autorização
      const redirectUri = window.location.origin + '/onboarding';
      const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/blogger';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting Google Auth:', error);
      showError("Erro ao preparar a ligação ao Google.");
      setSaving(false);
    }
  };

  const saveBloggerId = async () => {
    if (!blogId.trim() || !session?.user) {
      showError("O ID do Blog é obrigatório.");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { user_id: session.user.id, blog_id: blogId.trim() },
          { onConflict: 'user_id' }
        );
        
      if (error) throw error;
      
      showSuccess("ID do Blogger guardado com sucesso!");
      setStatus(prev => ({ ...prev, hasBlogId: true }));
      
      // If everything is done, go to dashboard
      if (status.hasSlogans && status.hasGoogleDrive) {
        navigate('/dashboard');
      }
    } catch (error) {
      showError("Erro ao guardar o ID do Blogger.");
    } finally {
      setSaving(false);
    }
  };
  
  // Handle Google OAuth callback if code is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && session?.user) {
      const exchangeCode = async () => {
        try {
          const { error } = await supabase.functions.invoke('exchange-google-code', {
            body: { 
              code, 
              redirectUri: window.location.origin + '/onboarding',
              user_id: session.user.id
            }
          });
          
          if (error) throw error;
          showSuccess("Google Drive conectado com sucesso!");
          checkStatus();
          // Remove code from URL
          window.history.replaceState({}, document.title, '/onboarding');
        } catch (error) {
          showError("Erro ao conectar Google Drive.");
        }
      };
      
      exchangeCode();
    }
  }, [session]);

  const finishOnboarding = () => {
    if (status.hasSlogans && status.hasGoogleDrive && status.hasBlogId) {
      navigate('/dashboard');
    } else {
      showError("Por favor completa todos os passos primeiro.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-white">Bem-vindo ao MusicFlow 👋</h1>
          <p className="text-indigo-200">Antes de começarmos a automatizar, precisas de configurar 3 passos essenciais.</p>
        </div>

        {/* Progresso */}
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 -z-10 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          
          {[
            { id: 1, name: 'Slogans', icon: Music, done: status.hasSlogans },
            { id: 2, name: 'Google Drive', icon: HardDrive, done: status.hasGoogleDrive },
            { id: 3, name: 'Blogger', icon: Globe, done: status.hasBlogId }
          ].map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  s.done ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 
                  step === s.id ? 'bg-slate-900 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {s.done ? <CheckCircle2 size={24} /> : <s.icon size={20} />}
              </div>
              <span className={`text-sm font-medium ${step === s.id ? 'text-indigo-400 drop-shadow-md' : 'text-slate-500'}`}>{s.name}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Slogans */}
        {step === 1 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-2xl text-white">1. Upload dos Slogans</CardTitle>
              <CardDescription className="text-slate-400">Carrega os áudios promocionais que a Inteligência Artificial vai misturar nas músicas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SloganUpload />
              
              <div className="flex justify-end pt-4 border-t border-white/10">
                <Button 
                  onClick={() => {
                    checkStatus();
                    setStep(2);
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Continuar para Passo 2 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Google Drive */}
        {step === 2 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-2xl text-white">2. Ligar ao Google Drive</CardTitle>
              <CardDescription className="text-slate-400">O sistema precisa de autorização para guardar os MP3 misturados diretamente na tua Nuvem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                  <HardDrive className="text-indigo-400" size={40} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Google Drive Storage</h3>
                  <p className="text-slate-400 mt-2">Isto é necessário para obtermos os links de download direto que irão para o teu blog.</p>
                </div>
                
                {status.hasGoogleDrive ? (
                  <div className="flex items-center gap-2 text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-full mt-4">
                    <CheckCircle2 size={20} /> Conta Google Autenticada
                  </div>
                ) : (
                  <div className="w-full space-y-5 text-left mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="clientId" className="text-slate-300">Google Client ID</Label>
                      <Input 
                        id="clientId" 
                        type="password" 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="O teu Google Client ID" 
                        className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 h-12"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clientSecret" className="text-slate-300">Google Client Secret</Label>
                      <Input 
                        id="clientSecret" 
                        type="password" 
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="O teu Google Client Secret" 
                        className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 h-12"
                      />
                    </div>
                    <Button onClick={handleGoogleAuth} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 w-full mt-2 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                      Autorizar Google Drive
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between pt-6 border-t border-white/10">
                <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setStep(1)}>Voltar</Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Continuar para Passo 3 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Blogger */}
        {step === 3 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-2xl text-white">3. O teu Blog de Destino</CardTitle>
              <CardDescription className="text-slate-400">Diz-nos qual é o Blog (ID) onde a IA deve publicar as novidades musicais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">ID do teu Blogger</Label>
                  <Input 
                    placeholder="Ex: 5220669809486590139" 
                    value={blogId}
                    onChange={(e) => setBlogId(e.target.value)}
                    className="bg-slate-900/50 border-white/10 text-white h-12 placeholder:text-slate-600 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-2">Podes encontrar este número no URL quando entras no teu painel do blogger.com</p>
                </div>
                
                <Button 
                  onClick={saveBloggerId} 
                  disabled={saving}
                  className={`w-full h-12 font-bold ${status.hasBlogId ? "bg-white/10 hover:bg-white/20 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                >
                  {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                  {status.hasBlogId ? "Atualizar ID" : "Guardar ID"}
                </Button>
              </div>
              
              <div className="flex justify-between pt-6 border-t border-white/10">
                <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setStep(2)}>Voltar</Button>
                <Button 
                  onClick={finishOnboarding} 
                  disabled={!status.hasSlogans || !status.hasGoogleDrive || !status.hasBlogId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar e Abrir Painel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
