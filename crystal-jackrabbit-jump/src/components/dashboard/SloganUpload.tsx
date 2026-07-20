"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Upload, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const SloganUpload = () => {
  const [uploading, setUploading] = React.useState<{ [key: string]: boolean }>({});
  const [slogans, setSlogans] = React.useState<{ slogan1_url?: string; slogan2_url?: string }>({});

  React.useEffect(() => {
    const loadSlogans = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('automation_settings')
          .select('slogan1_url, slogan2_url')
          .eq('user_id', user.id)
          .single();
        if (data) setSlogans(data);
      }
    };
    loadSlogans();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'slogan1' | 'slogan2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio')) {
      showError("Please upload an MP3 or WAV file.");
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Generate a unique filename using timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${field}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('slogans')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('slogans')
        .getPublicUrl(fileName);

      // Save to automation_settings
      const { error: dbError } = await supabase
        .from('automation_settings')
        .update({ [`${field}_url`]: publicUrl })
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setSlogans(prev => ({ ...prev, [`${field}_url`]: publicUrl }));
      showSuccess(`${field === 'slogan1' ? 'Slogan 1' : 'Slogan 2'} carregado com sucesso.`);
    } catch (error) {
      console.error("Upload error:", error);
      showError("Failed to upload slogan.");
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const removeSlogan = async (field: 'slogan1_url' | 'slogan2_url') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('automation_settings')
      .update({ [field]: null })
      .eq('user_id', user.id);

    setSlogans(prev => ({ ...prev, [field]: undefined }));
    showSuccess("Slogan removed.");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2].map((num) => {
        const field = num === 1 ? 'slogan1' : 'slogan2';
        const url = slogans[`${field}_url` as keyof typeof slogans];
        
        return (
          <Card key={num} className="bg-white/5 border-white/10 backdrop-blur-md shadow-lg shadow-black/20 text-slate-50">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-white">
                <Music className="text-indigo-400" size={20} />
                {num === 1 ? 'Slogan Inicial' : 'Slogan Final'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {num === 1 ? 'Toca no início da música.' : 'Toca no final da música.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {url ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 font-medium">
                    <CheckCircle2 size={18} />
                    Slogan {num} carregado
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSlogan(`${field}_url` as 'slogan1_url' | 'slogan2_url')}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="w-full">
                    <Label 
                      htmlFor={`slogan-${num}`}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading[field] ? (
                          <Loader2 className="animate-spin text-indigo-400 w-8 h-8 mb-3" />
                        ) : (
                          <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        )}
                        <p className="mb-2 text-sm text-slate-300">
                          {uploading[field] ? (
                            <span className="font-semibold text-indigo-400">A fazer upload...</span>
                          ) : (
                            <><span className="font-semibold text-indigo-400">Clica para enviar</span> ou arrasta</>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">MP3 ou WAV (MAX. 10MB)</p>
                      </div>
                    </Label>
                  <Input 
                    id={`slogan-${num}`} 
                    type="file" 
                    accept=".mp3,.wav" 
                    className="hidden" 
                    onChange={(e) => handleUpload(e, field as any)}
                    disabled={uploading[field]}
                  />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SloganUpload;