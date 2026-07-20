"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Cloud, 
  FileText, 
  Music, 
  Save, 
  Loader2, 
  AlertCircle, 
  Link2, 
  Wand2, 
  Image, 
  Trash2, 
  Upload, 
  Code,
  Link,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [settings, setSettings] = React.useState({
    blogger_blog_id: '',
    blogger_client_id: '',
    blogger_client_secret: '',
    drive_folder_id: '',
    slogan_position: 'beginning',
    bitrate: '192',
    auto_publish: true,
    default_cover_url: '',
    blogger_template: '',
    shortlink_provider: 'none',
    shortlink_api_key: ''
  });

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: automationData } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const { data: secureData } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setSettings(prev => ({
        ...prev,
        blogger_blog_id: secureData?.blog_id || automationData?.blogger_blog_id || '',
        blogger_client_id: secureData?.client_id || automationData?.blogger_client_id || '',
        blogger_client_secret: secureData?.client_secret || automationData?.blogger_client_secret || '',
        drive_folder_id: automationData?.drive_folder_id || '',
        slogan_position: automationData?.slogan_position || 'beginning',
        bitrate: automationData?.bitrate || '192',
        auto_publish: automationData?.auto_publish !== false,
        default_cover_url: automationData?.default_cover_url || '',
        blogger_template: automationData?.blogger_template || '',
        shortlink_provider: automationData?.shortlink_provider || 'none',
        shortlink_api_key: automationData?.shortlink_api_key || ''
      }));

      if (secureData?.refresh_token) {
        setIsConnected(true);
      }
    }
  };

  React.useEffect(() => {
    loadSettings();
    
    const code = searchParams.get('code');
    if (code) {
      handleGoogleCallback(code);
    }
  }, [searchParams]);

  const handleGoogleCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      setSearchParams({});
      const redirectUri = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.functions.invoke('exchange-google-code', {
        body: { code, redirectUri }
      });
      if (error) throw error;
      showSuccess("Google Drive conectado com sucesso!");
      setIsConnected(true);
    } catch (error: any) {
      showError(error.message || "Falha ao conectar com o Google.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectGoogle = () => {
    const safeClientId = settings.blogger_client_id.trim();
    if (!safeClientId) {
      showError("Configura primeiro o Client ID do Google.");
      return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/blogger';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(safeClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      showError("Por favor, carrega uma imagem JPG ou PNG.");
      return;
    }

    setUploadingCover(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/default_cover_${Date.now()}.${fileExt}`;

      // Upload to 'slogans' bucket
      const { error: uploadError } = await supabase.storage
        .from('slogans')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('slogans')
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, default_cover_url: publicUrl }));
      showSuccess("Capa padrão carregada temporariamente. Clica em 'Guardar Tudo' para salvar.");
    } catch (error: any) {
      showError("Falha ao carregar a imagem de capa.");
      console.error(error);
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCover = async () => {
    setSettings(prev => ({ ...prev, default_cover_url: '' }));
    showSuccess("Capa padrão removida do formulário. Clica em 'Guardar Tudo' para salvar.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não encontrado");

      // Guardar credenciais seguras via Edge Function
      const { error: functionError } = await supabase.functions.invoke('save-blogger-settings', {
        body: {
          blogId: settings.blogger_blog_id?.trim() || '',
          clientId: settings.blogger_client_id?.trim() || '',
          clientSecret: settings.blogger_client_secret?.trim() || ''
        }
      });

      if (functionError) throw functionError;

      const { error: automationError } = await supabase
        .from('automation_settings')
        .upsert({ 
          user_id: user.id,
          drive_folder_id: settings.drive_folder_id,
          slogan_position: settings.slogan_position,
          bitrate: settings.bitrate,
          auto_publish: settings.auto_publish,
          default_cover_url: settings.default_cover_url,
          blogger_template: settings.blogger_template,
          shortlink_provider: settings.shortlink_provider,
          shortlink_api_key: settings.shortlink_api_key
        }, { onConflict: 'user_id' });

      if (automationError) throw automationError;
      showSuccess("Todas as definições foram guardadas com sucesso!");
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              Definições <Sparkles className="text-yellow-400 animate-pulse" size={24} />
            </h1>
            <p className="text-slate-400 text-sm">Configura as tuas credenciais, preferências de áudio, post templates e encurtadores.</p>
          </div>
          <Button onClick={handleSave} className="gap-2 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 text-white" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? "A guardar..." : "Guardar Tudo"}
          </Button>
        </div>

        <Tabs defaultValue="google" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-white/10 p-1 flex flex-wrap h-auto gap-1 md:flex-nowrap rounded-xl">
            <TabsTrigger value="google" className="gap-2 text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
              <Link2 size={16} /> Conexão Google
            </TabsTrigger>
            <TabsTrigger value="blogger" className="gap-2 text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
              <FileText size={16} /> Blogger & Post Template
            </TabsTrigger>
            <TabsTrigger value="drive" className="gap-2 text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
              <Cloud size={16} /> Google Drive
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2 text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
              <Music size={16} /> Áudio & Capa Padrão
            </TabsTrigger>
            <TabsTrigger value="shortlinks" className="gap-2 text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
              <Link size={16} /> Encurtadores
            </TabsTrigger>
          </TabsList>

          {/* GOOGLE DRIVE & BLOGGER API KEYS */}
          <TabsContent value="google">
            <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Autenticação Google APIs</CardTitle>
                <CardDescription className="text-slate-400">
                  Conecta a tua conta do Google para permitir o upload direto das músicas e publicações no Blogger.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="bloggerClientId" className="text-slate-300 font-medium">Google Client ID</Label>
                    <Input 
                      id="bloggerClientId" 
                      type="password" 
                      className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                      value={settings.blogger_client_id}
                      onChange={(e) => setSettings({...settings, blogger_client_id: e.target.value})}
                      placeholder="Introduz o teu Client ID" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bloggerSecret" className="text-slate-300 font-medium">Google Client Secret</Label>
                    <Input 
                      id="bloggerSecret" 
                      type="password" 
                      className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                      value={settings.blogger_client_secret}
                      onChange={(e) => setSettings({...settings, blogger_client_secret: e.target.value})}
                      placeholder="Introduz o teu Client Secret" 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-slate-600 animate-pulse'}`} />
                    <span className="text-sm font-semibold text-slate-200">
                      {isConnected ? 'Conta Google Conectada' : 'Google pendente de autorização'}
                    </span>
                  </div>
                  <Button 
                    variant={isConnected ? "outline" : "default"} 
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                    className={`gap-2 ${!isConnected ? 'bg-white hover:bg-slate-200 text-slate-950 font-bold border-none' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}
                  >
                    {isConnecting ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />}
                    {isConnected ? 'Reautorizar / Trocar Conta Google' : 'Conectar Conta Google'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BLOGGER & POST TEMPLATE */}
          <TabsContent value="blogger">
            <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Blogger & Template Personalizado</CardTitle>
                <CardDescription className="text-slate-400">
                  Configura o Blog de destino e edita o HTML padrão dos posts de música.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="blogId" className="text-slate-300 font-medium">ID do Blog (Blogger)</Label>
                    <Input 
                      id="blogId" 
                      className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                      value={settings.blogger_blog_id}
                      onChange={(e) => setSettings({...settings, blogger_blog_id: e.target.value})}
                      placeholder="Ex: 1234567890123" 
                    />
                  </div>
                  <div className="flex items-center justify-between border border-white/5 p-4 rounded-lg bg-slate-950/20">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200 font-medium">Auto-publicar Posts</Label>
                      <p className="text-xs text-slate-400">Publicar imediatamente no Blogger em vez de criar como Rascunho.</p>
                    </div>
                    <Switch 
                      checked={settings.auto_publish}
                      onCheckedChange={(checked) => setSettings({...settings, auto_publish: checked})}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="template" className="text-slate-300 font-medium flex items-center gap-2">
                      <Code size={18} className="text-indigo-400" /> Template HTML Personalizado do Post
                    </Label>
                    <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      HTML Suportado <Wand2 size={12} />
                    </span>
                  </div>
                  
                  <textarea
                    id="template"
                    rows={12}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Se deixares em branco, o sistema usará o template moderno padrão do Automation Blogger..."
                    value={settings.blogger_template}
                    onChange={(e) => setSettings({...settings, blogger_template: e.target.value})}
                  />
                  
                  <div className="bg-slate-950/40 border border-white/5 p-4 rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <HelpCircle size={16} className="text-indigo-400" /> Tags Dinâmicas Disponíveis:
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Utiliza as tags abaixo no teu HTML. O robô irá substituí-las automaticamente pelas informações reais da música raspada no momento de publicar:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs">
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{ARTIST}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{TITLE}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{COVER_URL}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{DOWNLOAD_LINK}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{BITRATE}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{FILE_SIZE_MB}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{CATEGORY}}"}</code>
                      <code className="bg-slate-950 border border-white/10 p-1.5 rounded text-indigo-300 font-mono text-center">{"{{YEAR}}"}</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GOOGLE DRIVE TARGET FOLDER */}
          <TabsContent value="drive">
            <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Google Drive</CardTitle>
                <CardDescription className="text-slate-400">
                  Copia e cola o ID da pasta do Google Drive onde os ficheiros MP3 misturados serão guardados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="folderId" className="text-slate-300 font-medium">ID da Pasta no Drive</Label>
                  <Input 
                    id="folderId" 
                    className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                    value={settings.drive_folder_id}
                    onChange={(e) => setSettings({...settings, drive_folder_id: e.target.value})}
                    placeholder="Ex: 1a2B3c4D5e6F7g8H9i0J_K-lmNoPqRsTu" 
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Nota: Encontras este ID na barra de endereço do navegador ao abrir a pasta no Google Drive (o código após /folders/...).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIO PROCESSING & DEFAULT COVER */}
          <TabsContent value="audio">
            <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Qualidade de Áudio & Capa Padrão</CardTitle>
                <CardDescription className="text-slate-400">
                  Preferências de exportação e imagem de capa padrão para músicas sem capa original.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="position" className="text-slate-300 font-medium">Posição Padrão do Slogan</Label>
                    <select 
                      id="position"
                      className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      value={settings.slogan_position}
                      onChange={(e) => setSettings({...settings, slogan_position: e.target.value})}
                    >
                      <option value="beginning">Início (Intro)</option>
                      <option value="end">Fim (Outro)</option>
                      <option value="both">Início e Fim (Ambas)</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bitrate" className="text-slate-300 font-medium">Bitrate do Ficheiro Final (MP3)</Label>
                    <select 
                      id="bitrate"
                      className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      value={settings.bitrate}
                      onChange={(e) => setSettings({...settings, bitrate: e.target.value})}
                    >
                      <option value="128">128 kbps (Mais leve - Recomendado para internet móvel)</option>
                      <option value="192">192 kbps (Qualidade Padrão / Excelente balanço)</option>
                      <option value="320">320 kbps (Qualidade Alta / Ficheiro pesado)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <Label className="text-slate-200 font-semibold flex items-center gap-2">
                    <Image size={18} className="text-indigo-400" /> Capa Padrão do Álbum (Tags ID3)
                  </Label>
                  <p className="text-xs text-slate-400">
                    Esta imagem será injetada diretamente nos metadados da música MP3 caso a música original raspada não tenha capa própria. Formatos aceitos: JPG, PNG (Quadrado recomendado: ex. 800x800).
                  </p>

                  <div className="flex items-center gap-6 flex-wrap">
                    {settings.default_cover_url ? (
                      <div className="flex items-center gap-4 border border-white/10 p-3 rounded-lg bg-slate-950/30">
                        <img 
                          src={settings.default_cover_url} 
                          alt="Capa Padrão" 
                          className="w-24 h-24 object-cover rounded-lg border border-white/10 shadow-lg"
                        />
                        <div className="space-y-1">
                          <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                            <AlertCircle size={14} /> Capa configurada
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{settings.default_cover_url}</p>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={removeCover}
                            className="h-8 gap-1.5 px-3 bg-red-600 hover:bg-red-500 text-white text-xs"
                          >
                            <Trash2 size={14} /> Remover Capa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <Label 
                          htmlFor="coverUploadInput"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-slate-950/30 hover:bg-slate-950/60 hover:border-indigo-500/50 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingCover ? (
                              <Loader2 className="animate-spin text-indigo-400 w-8 h-8 mb-3" />
                            ) : (
                              <Upload className="w-8 h-8 mb-2 text-slate-400" />
                            )}
                            <p className="text-sm text-slate-300">
                              {uploadingCover ? (
                                <span className="font-semibold text-indigo-400">A enviar ficheiro...</span>
                              ) : (
                                <><span className="font-semibold text-indigo-400">Clica para enviar</span> ou arrasta</>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">JPG ou PNG quadrado de alta qualidade (MAX. 5MB)</p>
                          </div>
                        </Label>
                        <Input 
                          id="coverUploadInput" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleCoverUpload}
                          disabled={uploadingCover}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LINK SHORTENERS / MONETIZATION */}
          <TabsContent value="shortlinks">
            <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Rentabilização & Encurtadores de Links</CardTitle>
                <CardDescription className="text-slate-400">
                  Encurta os teus links do Google Drive para ganhar dinheiro por cada clique/download.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="shortenerProvider" className="text-slate-300 font-medium">Provedor Encurtador</Label>
                    <select 
                      id="shortenerProvider"
                      className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      value={settings.shortlink_provider}
                      onChange={(e) => setSettings({...settings, shortlink_provider: e.target.value})}
                    >
                      <option value="none">Nenhum (Direto para Google Drive)</option>
                      <option value="tinyurl">TinyURL (Sem Token - Grátis e Ilimitado)</option>
                      <option value="cuttly">Cutt.ly (Requer Chave de API)</option>
                      <option value="shrinkme">ShrinkMe.io (Rentável / API Simples - Requer Token)</option>
                      <option value="shrinkearn">Shrinkearn.com (Rentável / Alto CPM - Requer Token)</option>
                      <option value="adfly">Adf.ly / Fly.io (Requer ID e Chave - Rentável)</option>
                      <option value="shortest">Shorte.st (Requer Token - Rentável)</option>
                    </select>
                  </div>

                  {settings.shortlink_provider !== 'none' && settings.shortlink_provider !== 'tinyurl' && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label htmlFor="shortenerKey" className="text-slate-300 font-medium">Chave de API / Credenciais</Label>
                      <Input 
                        id="shortenerKey" 
                        type="password"
                        className="bg-slate-950/50 border-white/10 text-white focus:border-indigo-500"
                        value={settings.shortlink_api_key}
                        onChange={(e) => setSettings({...settings, shortlink_api_key: e.target.value})}
                        placeholder={
                          settings.shortlink_provider === 'adfly' 
                          ? "Formato: userID:apiKey (Ex: 23149:a3b5...)" 
                          : "Colas aqui o teu Token de API/Chave de programador privada"
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/40 border border-white/5 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-indigo-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-slate-200">Como funciona o encurtamento?</h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ao ativar um encurtador, o robô irá obter o link direto de download do Google Drive da música misturada, enviá-lo ao provedor configurado e colocar o link encurtado resultante no botão de download do seu Blogger.
                    </p>
                    <ul className="text-xs text-indigo-400 list-disc list-inside space-y-1 pt-1.5">
                      <li><strong>TinyURL:</strong> Não precisas criar chaves, funciona instantaneamente e de forma gratuita!</li>
                      <li><strong>ShrinkMe.io:</strong> Regista-te em ShrinkMe.io e copia o teu token em 'Tools &gt; Developers API'.</li>
                      <li><strong>Shrinkearn.com:</strong> Regista-te em Shrinkearn.com e copia o teu token em 'Tools &gt; Developers API'.</li>
                      <li><strong>Adf.ly:</strong> Na secção API do Adf.ly, obtém o teu <code className="bg-black/30 px-1 py-0.5 rounded">User ID</code> e <code className="bg-black/30 px-1 py-0.5 rounded">API Key</code>, e junta-os usando dois pontos (Ex: <code className="bg-black/30 px-1 py-0.5 rounded text-white">123456:a1b2c3d4...</code>).</li>
                      <li><strong>Segurança:</strong> As tuas chaves são guardadas de forma 100% segura no teu banco de dados e nunca são partilhadas com terceiros.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;