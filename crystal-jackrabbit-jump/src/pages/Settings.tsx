"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Cloud, FileText, Music, Save, Loader2, AlertCircle, Link2, Wand2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [settings, setSettings] = React.useState({
    blogger_blog_id: '',
    blogger_client_id: '',
    blogger_client_secret: '',
    drive_folder_id: '',
    slogan_position: 'beginning',
    bitrate: '192',
    auto_publish: true
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
        ...(automationData || {}),
        blogger_blog_id: secureData?.blog_id || automationData?.blogger_blog_id || '',
        blogger_client_id: secureData?.client_id || automationData?.blogger_client_id || '',
        blogger_client_secret: secureData?.client_secret || automationData?.blogger_client_secret || ''
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
          auto_publish: settings.auto_publish
        }, { onConflict: 'user_id' });

      if (automationError) throw automationError;
      showSuccess("Definições guardadas com sucesso.");
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Definições</h1>
            <p className="text-muted-foreground">Configura as tuas credenciais e preferências.</p>
          </div>
          <Button onClick={handleSave} className="gap-2 px-8" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? "A guardar..." : "Guardar Tudo"}
          </Button>
        </div>

        <Tabs defaultValue="google" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="google" className="gap-2">
              <Link2 size={16} /> Conexão Google
            </TabsTrigger>
            <TabsTrigger value="blogger" className="gap-2">
              <FileText size={16} /> Blogger
            </TabsTrigger>
            <TabsTrigger value="drive" className="gap-2">
              <Cloud size={16} /> Google Drive
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Music size={16} /> Áudio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Autenticação Google</CardTitle>
                <CardDescription>Conecta a tua conta para permitir o upload no Drive e posts no Blogger.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="bloggerClientId">Google Client ID</Label>
                    <Input 
                      id="bloggerClientId" 
                      type="password" 
                      value={settings.blogger_client_id}
                      onChange={(e) => setSettings({...settings, blogger_client_id: e.target.value})}
                      placeholder="Introduz o teu Client ID" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bloggerSecret">Google Client Secret</Label>
                    <Input 
                      id="bloggerSecret" 
                      type="password" 
                      value={settings.blogger_client_secret}
                      onChange={(e) => setSettings({...settings, blogger_client_secret: e.target.value})}
                      placeholder="Introduz o teu Client Secret" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className="text-sm font-medium">
                      {isConnected ? 'Google Conectado' : 'Google Não Conectado'}
                    </span>
                  </div>
                  <Button 
                    variant={isConnected ? "outline" : "default"} 
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />}
                    {isConnected ? 'Reconectar Google' : 'Conectar Google'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="blogger">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Blogger</CardTitle>
                <CardDescription>ID do blog onde as músicas serão publicadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="blogId">Blog ID</Label>
                  <Input 
                    id="blogId" 
                    value={settings.blogger_blog_id}
                    onChange={(e) => setSettings({...settings, blogger_blog_id: e.target.value})}
                    placeholder="Ex: 1234567890" 
                  />
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label>Auto-publicar</Label>
                    <p className="text-xs text-muted-foreground">Publicar imediatamente em vez de guardar como rascunho.</p>
                  </div>
                  <Switch 
                    checked={settings.auto_publish}
                    onCheckedChange={(checked) => setSettings({...settings, auto_publish: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drive">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Google Drive</CardTitle>
                <CardDescription>ID da pasta de destino para os MP3s.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="folderId">ID da Pasta no Drive</Label>
                  <Input 
                    id="folderId" 
                    value={settings.drive_folder_id}
                    onChange={(e) => setSettings({...settings, drive_folder_id: e.target.value})}
                    placeholder="Copia o ID da URL da pasta no Drive" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Processamento de Áudio</CardTitle>
                <CardDescription>Qualidade e posição dos slogans.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="position">Posição do Slogan</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={settings.slogan_position}
                    onChange={(e) => setSettings({...settings, slogan_position: e.target.value})}
                  >
                    <option value="beginning">Início</option>
                    <option value="end">Fim</option>
                    <option value="both">Início e Fim</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bitrate">Bitrate de Saída</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={settings.bitrate}
                    onChange={(e) => setSettings({...settings, bitrate: e.target.value})}
                  >
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="320">320 kbps</option>
                  </select>
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