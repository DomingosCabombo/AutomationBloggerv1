import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeText(t: string) {
  if (!t) return "";
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').trim();
}

async function logToSupabase(supabase: any, userId: string | null, level: string, message: string) {
  console.log(`[music-automation] ${level.toUpperCase()}: ${message}`);
  if (!userId) return;
  try {
    await supabase.from('logs').insert({ user_id: userId, level, message });
  } catch (e) {
    console.error("[music-automation] Erro log:", e);
  }
}

async function uploadToGoogleDrive(supabase: any, userId: string, fileName: string, buffer: ArrayBuffer, folderId: string) {
  const { data: settings } = await supabase.from('settings').select('client_id, client_secret, refresh_token').eq('user_id', userId).maybeSingle();
  if (!settings?.refresh_token) throw new Error("Google Drive não autorizado.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      refresh_token: settings.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  const metadata = { name: fileName, parents: [folderId], mimeType: "audio/mpeg" };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }));

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    body: form,
  });

  const uploadData = await uploadRes.json();
  return uploadData.id;
}



async function processWithAudioMixAPI(
  apiUrl: string, 
  audioBuffer: ArrayBuffer, 
  fileName: string, 
  introBuffer?: ArrayBuffer, 
  outroBuffer?: ArrayBuffer
) {
  console.log(`[music-automation] Processando áudio no Audio Mix API (${apiUrl})...`);
  
  const form = new FormData();
  form.append("music", new Blob([audioBuffer], { type: "audio/mpeg" }), fileName);
  if (introBuffer) form.append("slogan1", new Blob([introBuffer], { type: "audio/wav" }), "slogan1.wav");
  if (outroBuffer) form.append("slogan2", new Blob([outroBuffer], { type: "audio/wav" }), "slogan2.wav");
  
  const res = await fetch(`${apiUrl}/mix`, {
    method: "POST",
    headers: {
      "Bypass-Tunnel-Reminder": "true"
    },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Audio Mix API: Falha ao processar (${res.status}) - ${errText}`);
  }
  
  return await res.arrayBuffer();
}

async function getSongDetails(musicPageUrl: string): Promise<{ mp3Url: string | null, coverUrl: string | null, extractedArtist: string, extractedTitle: string, extractedCategory: string, extractedYear: string }> {
  try {
    const res = await fetch(musicPageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    const allLinks = Array.from(doc?.querySelectorAll("a") || []);
    const directLink = allLinks.find(a => a.getAttribute("href")?.toLowerCase().endsWith(".mp3"));
    const mp3Url = directLink?.getAttribute("href") || null;
    
    const ogImage = doc?.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const wpImage = doc?.querySelector('img.wp-post-image')?.getAttribute("src");
    const articleImg = doc?.querySelector('article img')?.getAttribute("src");
    const coverUrl = ogImage || wpImage || articleImg || null;
    
    const textContent = doc?.body?.textContent || "";
    
    const extractField = (regex: RegExp) => {
        const match = textContent.match(regex);
        return match ? match[1].trim() : "";
    };

    const extractedArtist = extractField(/Artista:\s*(.*?)(?:Ano de lan|Categoria|M[uú]sica|Titulo|Partilhar|$)/i);
    const extractedYear = extractField(/Ano de lan[çc]amento:\s*(.*?)(?:Categoria|Artista|M[uú]sica|Titulo|Partilhar|$)/i) || String(new Date().getFullYear());
    
    let extractedCategory = extractField(/Categoria:\s*(.*?)(?:Ano de lan|Artista|M[uú]sica|Titulo|Partilhar|$)/i);
    if (!extractedCategory) {
      const catElement = doc?.querySelector('a[rel="category tag"]');
      extractedCategory = catElement?.textContent?.trim() || "Música";
    }

    let extractedTitle = extractField(/M[uú]sica:\s*(.*?)(?:Ano de lan|Categoria|Artista|Formato|Qualidade|Partilhar|$)/i) || extractField(/Titulo:\s*(.*?)(?:Ano de lan|Categoria|Artista|Formato|Qualidade|Partilhar|$)/i);
    
    let rawTitle = extractedTitle;
    if (!rawTitle) {
      rawTitle = doc?.querySelector('h1')?.textContent || "";
    }
    
    // Separar sempre pelo hífen
    if (rawTitle.includes(" – ")) {
      extractedTitle = rawTitle.split(" – ")[1].trim();
    } else if (rawTitle.includes(" - ")) {
      extractedTitle = rawTitle.split(" - ")[1].trim();
    } else {
      extractedTitle = rawTitle.trim();
    }
    
    return { mp3Url, coverUrl, extractedArtist, extractedTitle, extractedCategory, extractedYear };
  } catch { return { mp3Url: null, coverUrl: null, extractedArtist: "", extractedTitle: "", extractedCategory: "", extractedYear: "" }; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const url = new URL(req.url);

  if (url.pathname.endsWith('/upload-slogan')) {
    try {
      const authHeader = req.headers.get('Authorization');
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', '') || '');
      if (!user) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

      const formData = await req.formData();
      const file = formData.get('slogan1') || formData.get('slogan2');
      const field = formData.has('slogan1') ? 'slogan1_url' : 'slogan2_url';

      if (!(file instanceof File)) throw new Error("Ficheiro inválido");

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabaseClient.storage.from('slogans').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage.from('slogans').getPublicUrl(filePath);
      
      await supabaseClient.from('automation_settings').upsert({ user_id: user.id, [field]: publicUrl }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ [field.replace('_url', '')]: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
  }

  let currentUserId: string | null = null;
  try {
    const body = await req.json();
    currentUserId = body.userId;
    
    await logToSupabase(supabaseClient, currentUserId, 'info', '🏁 Motor iniciado. Verificando novos lançamentos...');

    const { data: artists } = await supabaseClient.from('artists').select('name').eq('user_id', currentUserId);
    const artistNames = (artists || []).map(a => a.name);
    
    const { data: autoSettings } = await supabaseClient.from('automation_settings').select('*').eq('user_id', currentUserId).single();
    const { data: secureSettings } = await supabaseClient.from('settings').select('blog_id').eq('user_id', currentUserId).maybeSingle();

    const siteRes = await fetch("https://www.vicentenews.com/musica/", { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await siteRes.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc?.querySelectorAll("a") || []);
    
    const foundSongs = [];
    for (const a of links) {
      const title = a.textContent?.trim();
      const href = a.getAttribute("href");
      if (!title || !href || !href.includes("/musica/")) continue;
      const normTitle = normalizeText(title);
      for (const artist of artistNames) {
        if (normTitle.includes(normalizeText(artist))) {
          foundSongs.push({ title, link: href, artist });
          break;
        }
      }
    }

    let processedCount = 0;
    for (const song of foundSongs) {
      const { data: exists } = await supabaseClient.from('processed_posts').select('id').eq('source_url', song.link).eq('user_id', currentUserId).maybeSingle();
      if (exists) continue;

      const { mp3Url, coverUrl, extractedArtist, extractedTitle, extractedCategory, extractedYear } = await getSongDetails(song.link);
      if (!mp3Url) continue;

      const audioMixUrl = Deno.env.get('AUDIO_MIX_API_URL');
      
      // Fluxo 1: Se estiver usando o Audio Mix API local (Assíncrono e Leve)
      if (audioMixUrl && (autoSettings?.slogan1_url || autoSettings?.slogan2_url)) {
        let driveToken = "";
        if (autoSettings?.drive_folder_id) {
            const { data: settings } = await supabaseClient.from('settings').select('client_id, client_secret, refresh_token').eq('user_id', currentUserId).maybeSingle();
            if (settings?.refresh_token) {
                const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                    client_id: settings.client_id,
                    client_secret: settings.client_secret,
                    refresh_token: settings.refresh_token,
                    grant_type: "refresh_token",
                    }),
                });
                const tokenData = await tokenRes.json();
                driveToken = tokenData.access_token || "";
                if (!driveToken) {
                    await logToSupabase(supabaseClient, currentUserId, 'error', `Google Drive Auth Error: ${JSON.stringify(tokenData)}`);
                }
            } else {
                await logToSupabase(supabaseClient, currentUserId, 'error', `Refresh token do Google Drive não encontrado nos settings.`);
            }
        }
        
        if (!driveToken) {
             throw new Error("Autorização do Google Drive falhou. Por favor reconecta a tua conta Google nas configurações.");
        }
        
        const finalArtist = extractedArtist || song.artist;
        const finalTitle = extractedTitle || song.title;

        const payload = {
            music_url: mp3Url,
            slogan1_url: (autoSettings.slogan_position === 'beginning' || autoSettings.slogan_position === 'both') ? autoSettings.slogan1_url : null,
            slogan2_url: (autoSettings.slogan_position === 'end' || autoSettings.slogan_position === 'both') ? autoSettings.slogan2_url : null,
            drive_token: driveToken,
            drive_folder_id: autoSettings?.drive_folder_id || "",
            song_title: finalTitle,
            user_id: currentUserId,
            artist_name: finalArtist,
            cover_url: coverUrl,
            blog_id: secureSettings?.blog_id || "",
            bitrate: autoSettings?.bitrate || "192",
            category: extractedCategory,
            year: extractedYear,
            source_url: song.link,
            supabase_url: Deno.env.get('SUPABASE_URL'),
            supabase_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        };
        
        const apiRes = await fetch(`${audioMixUrl}/mix-async`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true"
            },
            body: JSON.stringify(payload)
        });
        
        if (!apiRes.ok) {
            const errText = await apiRes.text();
            throw new Error(`Audio Mix API falhou: ${apiRes.status} - ${errText}`);
        }
        
        await logToSupabase(supabaseClient, currentUserId, 'info', `🎵 Música encontrada e enviada p/ API de mixagem: ${finalTitle}`);
        await supabaseClient.from('processed_posts').insert({ user_id: currentUserId, artist: finalArtist, title: finalTitle, source_url: song.link, cover_url: coverUrl });
        processedCount++;
        continue; // Passa para a próxima música sem fazer upload no Supabase
      }
      

    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), { headers: corsHeaders });

  } catch (error: any) {
    await logToSupabase(supabaseClient, currentUserId, 'error', `❌ Erro: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});