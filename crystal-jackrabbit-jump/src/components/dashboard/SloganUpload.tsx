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
      const formData = new FormData();
      formData.append(field, file);

      const { data, error } = await supabase.functions.invoke('music-automation/upload-slogan', {
        body: formData
      });

      if (error) throw error;

      setSlogans(prev => ({ ...prev, [`${field}_url`]: data[field] }));
      showSuccess(`${field === 'slogan1' ? 'Slogan 1' : 'Slogan 2'} uploaded successfully.`);
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
          <Card key={num} className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music size={20} className="text-primary" />
                Audio Slogan {num}
              </CardTitle>
              <CardDescription>
                This slogan will be mixed at the {num === 1 ? 'beginning' : 'end'} of every track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {url ? (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500" size={20} />
                    <div>
                      <p className="text-sm font-medium">Slogan Active</p>
                      <audio src={url} controls className="h-8 mt-2" />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSlogan(`${field}_url` as any)}>
                    <Trash2 size={18} className="text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor={`slogan-${num}`} className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                      {uploading[field] ? (
                        <Loader2 className="animate-spin text-primary" size={32} />
                      ) : (
                        <Upload className="text-muted-foreground" size={32} />
                      )}
                      <span className="text-sm font-medium">Click to upload MP3/WAV</span>
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
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SloganUpload;