import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== FUNÇÕES AUXILIARES ====================

function normalizeText(t: string): string {
  if (!t) return "";
  // Decode entidades HTML antes de normalizar
  const decoded = t
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#038;/g, "e")
    .replace(/&amp;/g, "e")
    .replace(/&quot;/g, "")
    .replace(/&#039;/g, "")
    .replace(/&nbsp;/g, " ");
  return decoded
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim();
}

// Comparação inteligente: extrai APENAS artistas monitorizados do texto
function normalizeForComparison(text: string, monitoredArtists: string[]): string {
  if (!text) return "";

  let normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(feat|featuring|ft|prod|by|with|e|&|and|vs|versus)\b/gi, " ");

  const foundArtists: string[] = [];
  for (const artist of monitoredArtists) {
    const normalizedArtist = normalizeText(artist);
    if (normalizedArtist && normalized.includes(normalizedArtist)) {
      foundArtists.push(normalizedArtist);
      normalized = normalized.split(normalizedArtist).join(" ");
    }
  }

  foundArtists.sort();

  let title = normalized.replace(/\s+/g, " ").trim();
  title = title
    .split(" ")
    .filter((w) => w.length > 1)
    .join(" ");

  return [...foundArtists, title].join(" ").trim();
}

// Escapa caracteres especiais de regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resolve URL relativo em absoluto
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

// Segue redirecionamentos até encontrar o MP3 (profundidade máx: 4)
// Aceita HTML já obtido para evitar re-fetch desnecessário
async function followUntilMp3(
  url: string,
  maxDepth = 4,
  existingHtml?: string,
  supabase?: any,
  userId?: string | null
): Promise<string | null> {
  const log = async (level: string, msg: string) => {
    console.log(`[followUntilMp3] [${level.toUpperCase()}] ${msg}`);
  };

  await log("info", `🔍 [followUntilMp3] Profundidade ${5 - maxDepth}: ${url.substring(0, 100)}`);

  if (maxDepth <= 0) {
    await log("warn", "❌ [followUntilMp3] Profundidade máxima atingida");
    return null;
  }

  try {
    let html = existingHtml ?? "";
    let contentType = "";

    if (!existingHtml) {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        },
        redirect: "follow",
      });
      const finalUrl = response.url;
      contentType = response.headers.get("content-type") || "";

      // Já é um MP3 direto (garantir que não é um HTML retornado por engano)
      const isHtml = contentType.includes("text/html");
      const originalEndsWithMp3 = url.toLowerCase().split("?")[0].endsWith(".mp3");

      if (!isHtml && (contentType.includes("audio/") || contentType.includes("application/octet-stream"))) {
        await log("info", `✅ [followUntilMp3] MP3 direto encontrado (Content-Type): ${url}`);
        return url;
      }

      if (originalEndsWithMp3 && isHtml && finalUrl !== url) {
        await log("info", `ℹ️ [followUntilMp3] URL original termina em .mp3 mas redirecionou para HTML. Assumindo link de download válido: ${url}`);
        return url;
      }

      if (
        !isHtml &&
        originalEndsWithMp3
      ) {
        await log("info", `✅ [followUntilMp3] MP3 direto encontrado (Fallthrough): ${url}`);
        return url;
      }

      html = await response.text();
    }

    // 1. Link direto .mp3 em href
    let match = html.match(/href=["']([^"']+\.mp3(?:\?[^"']*)?)["']/i);
    if (match) {
      const resolved = resolveUrl(url, match[1]);
      await log("info", `✅ [followUntilMp3] Link .mp3 encontrado: ${resolved.substring(0, 80)}`);
      return resolved;
    }

    // 2. Data-src ou src com .mp3 (players de áudio embutidos)
    match = html.match(/(?:data-src|src)=["']([^"']+\.mp3(?:\?[^"']*)?)["']/i);
    if (match) {
      const resolved = resolveUrl(url, match[1]);
      await log("info", `✅ [followUntilMp3] Player MP3 encontrado: ${resolved.substring(0, 80)}`);
      return resolved;
    }

    // 3. Procurar botões de download por texto no link <a> (ex: "DOWNLOAD | BAIXAR MÚSICA")
    const aRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;
    const candidates: { href: string; priority: number }[] = [];

    while ((aMatch = aRegex.exec(html)) !== null) {
      const href = aMatch[1];
      const rawText = aMatch[2];
      const text = rawText.replace(/<[^>]*>/g, "").trim().toLowerCase();

      if (text.length > 0 && text.length < 100) {
        // Ignorar links óbvios de redes sociais, partilha, etc.
        if (
          href.includes("javascript:") ||
          href.startsWith("#") ||
          href.includes("facebook.com") ||
          href.includes("twitter.com") ||
          href.includes("pinterest.com") ||
          href.includes("linkedin.com") ||
          href.includes("whatsapp.com") ||
          href.includes("mailto:")
        ) {
          continue;
        }

        const isExactDownload = text === "download" || text === "baixar" || text === "descarregar";
        const hasKeywords = text.includes("download") || text.includes("baixar") || text.includes("descarregar") || text.includes("mp3");

        if (isExactDownload) {
          candidates.push({ href, priority: 3 });
        } else if (hasKeywords) {
          candidates.push({ href, priority: 2 });
        }
      }
    }

    // Ordenar os candidatos por prioridade descrescente
    candidates.sort((a, b) => b.priority - a.priority);

    for (const cand of candidates) {
      const nextUrl = resolveUrl(url, cand.href);
      await log("info", `🔗 [followUntilMp3] A seguir link de download: ${nextUrl.substring(0, 80)}`);
      const result = await followUntilMp3(nextUrl, maxDepth - 1, undefined, supabase, userId);
      if (result) return result;
    }

    // 4. Link com "download" ou "file" ou "get" na URL como fallback
    match = html.match(/href=["']([^"']*(?:\/download\/|\/file\/|\/get\/)[^"']*)["']/i);
    if (match) {
      const nextUrl = resolveUrl(url, match[1]);
      await log("info", `🔗 [followUntilMp3] Link download fallback: ${nextUrl.substring(0, 80)}`);
      const result = await followUntilMp3(nextUrl, maxDepth - 1, undefined, supabase, userId);
      if (result) return result;
    }

    // 5. Link com parâmetro ?download ou ?dl= como fallback
    match = html.match(/href=["']([^"']*\?(?:download|dl)[^"']*)["']/i);
    if (match) {
      const nextUrl = resolveUrl(url, match[1]);
      await log("info", `🔗 [followUntilMp3] Link com parâmetro download fallback: ${nextUrl.substring(0, 80)}`);
      const result = await followUntilMp3(nextUrl, maxDepth - 1, undefined, supabase, userId);
      if (result) return result;
    }

    await log("warn", "❌ [followUntilMp3] Nenhum link de download encontrado");
    return null;
  } catch (error: any) {
    await log("error", `❌ [followUntilMp3] Erro: ${error.message}`);
    return null;
  }
}

async function logToSupabase(
  supabase: any,
  userId: string | null,
  level: string,
  message: string
) {
  console.log(`[music-automation] ${level.toUpperCase()}: ${message}`);
  if (!userId) return;
  try {
    await supabase.from("logs").insert({ user_id: userId, level, message });
  } catch (e) {
    console.error("[music-automation] Erro log:", e);
  }
}

// ==================== SCRAPING VICENTENEWS ====================

async function scrapeVicenteNews(artistNames: string[], supabase: any, userId: string | null): Promise<any[]> {
  try {
    const siteRes = await fetch("https://www.vicentenews.com/musica/", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await siteRes.text();

    const foundSongs: any[] = [];
    const linkRegex =
      /<a[^>]+href=["']([^"']+\/musica\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const rawTitle = match[2];
      const title = rawTitle.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (!title || !href || !href.includes("/musica/")) continue;

      const key = `${href}::${title}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const normTitle = normalizeText(title);
      for (const artist of artistNames) {
        if (normTitle.includes(normalizeText(artist))) {
          console.log(`🎵 [vicentenews] Encontrado: "${title}" — artista: ${artist}`);
          foundSongs.push({ title, link: href, artist, sourceSite: "vicentenews" });
          break;
        }
      }
    }

    return foundSongs;
  } catch (error: any) {
    console.error(`❌ [scrapeVicenteNews] Erro: ${error.message}`);
    return [];
  }
}

async function getVicenteNewsDetails(musicPageUrl: string, supabase?: any, userId?: string | null): Promise<any> {
  try {
    const res = await fetch(musicPageUrl, { 
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      } 
    });
    const html = await res.text();

    console.log(`[getVicenteNewsDetails] Status: ${res.status}, HTML length: ${html.length}`);

    // Passa o HTML já obtido para evitar re-fetch
    const mp3Url = await followUntilMp3(musicPageUrl, 4, html, supabase, userId);

    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    const coverUrl = ogImageMatch ? ogImageMatch[1] : null;

    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const extractField = (regex: RegExp) => {
      const m = textContent.match(regex);
      return m ? m[1].trim() : "";
    };

    const extractedArtist = extractField(
      /Artista:\s*(.*?)(?:Ano de lan|Categoria|M[uú]sica|Titulo|Partilhar|$)/i
    );
    const extractedYear =
      extractField(
        /Ano de lan[çc]amento:\s*(.*?)(?:Categoria|Artista|M[uú]sica|Titulo|Partilhar|$)/i
      ) || String(new Date().getFullYear());

    let extractedCategory = extractField(
      /Categoria:\s*(.*?)(?:Ano de lan|Artista|M[uú]sica|Titulo|Partilhar|$)/i
    );
    if (!extractedCategory) {
      const catMatch = html.match(/<a[^>]*rel=["']category tag["'][^>]*>([\s\S]*?)<\/a>/i);
      extractedCategory = catMatch
        ? catMatch[1].replace(/<[^>]*>/g, "").trim()
        : "Música";
    }

    let extractedTitle =
      extractField(
        /M[uú]sica:\s*(.*?)(?:Ano de lan|Categoria|Artista|Formato|Qualidade|Partilhar|$)/i
      ) ||
      extractField(
        /Titulo:\s*(.*?)(?:Ano de lan|Categoria|Artista|Formato|Qualidade|Partilhar|$)/i
      );

    if (!extractedTitle) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const rawTitle = h1Match ? h1Match[1].replace(/<[^>]*>/g, "").trim() : "";
      if (rawTitle.includes(" – ")) {
        extractedTitle = rawTitle.split(" – ")[1].trim();
      } else if (rawTitle.includes(" - ")) {
        extractedTitle = rawTitle.split(" - ")[1].trim();
      } else {
        extractedTitle = rawTitle.trim();
      }
    }

    return { mp3Url, coverUrl, extractedArtist, extractedTitle, extractedCategory, extractedYear };
  } catch (error: any) {
    console.error(`❌ [getVicenteNewsDetails] Erro: ${error.message}`);
    return {
      mp3Url: null,
      coverUrl: null,
      extractedArtist: "",
      extractedTitle: "",
      extractedCategory: "",
      extractedYear: "",
    };
  }
}

// ==================== SCRAPING BUEDEMUSICA ====================

async function scrapeBueDeMusica(artistNames: string[], supabase: any, userId: string | null): Promise<any[]> {
  try {
    const siteUrl = "https://buedemusica.com";
    const response = await fetch(siteUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      },
    });
        const html = await response.text();

    console.log(`[buedemusica] Status: ${response.status}, HTML length: ${html.length}`);

    const foundSongs: any[] = [];
    const seenUrls = new Set<string>();

    const decodeTitle = (raw: string): string =>
      raw
        .replace(/<[^>]*>/g, " ")
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&amp;/g, "&")
        .replace(/&#038;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const processMatch = async (link: string, rawTitle: string) => {
      if (!link || !rawTitle) return;
      if (
        link.includes("/page/") ||
        link.includes("/category/") ||
        link.includes("/tag/") ||
        link.includes("/wp-content/") ||
        link.includes("#") ||
        link.includes("?")
      ) return;

      if (seenUrls.has(link)) return;
      seenUrls.add(link);

      const title = decodeTitle(rawTitle);
      if (!title) return;

      const normTitle = normalizeText(title);
      for (const artist of artistNames) {
        if (normTitle.includes(normalizeText(artist))) {
          console.log(`🎵 [buedemusica] Encontrado: "${title}" — artista: ${artist}`);
          foundSongs.push({ title, link, artist, sourceSite: "buedemusica" });
          break;
        }
      }
    };

    let match;
    let totalArticles = 0;

    const articleRegex = /<article[^>]*class="[^"]*latestPost[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    while ((match = articleRegex.exec(html)) !== null) {
      totalArticles++;
      const articleHtml = match[1];
      const linkMatch = articleHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']([^"']+)["']/i);
      if (linkMatch) {
        const rawLink = linkMatch[1];
        const rawT = linkMatch[2];
        const decodedT = decodeTitle(rawT);
        console.log(`🔎 [buedemusica] Artigo #${totalArticles}: "${decodedT}" → ${rawLink}`);
        await processMatch(rawLink, rawT);
      }
    }

    // Estratégia fallback: <h2 class="title..."><a href title>TÍTULO</a></h2>
    const h2Regex = /<h2[^>]*class="[^"]*(?:title|front-view-title|entry-title|post-title)[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["'](https?:\/\/buedemusica\.com\/[^"']+)["'][^>]*title=["']([^"']+)["'][^>]*>/gi;
    while ((match = h2Regex.exec(html)) !== null) {
      await processMatch(match[1], match[2]);
    }

    console.log(`📊 [buedemusica] ${totalArticles} artigos no HTML → ${foundSongs.length} músicas para os teus artistas`);
    return foundSongs;
  } catch (error: any) {
    await logToSupabase(
      supabase,
      userId,
      "error",
      `❌ [scrapeBueDeMusica] Erro: ${error.message}`
    );
    return [];
  }
}

async function getBueDeMusicaDetails(postUrl: string, supabase?: any, userId?: string | null): Promise<any> {
  try {
    const response = await fetch(postUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      },
    });
    const html = await response.text();

    console.log(`[getBueDeMusicaDetails] Status: ${response.status}, HTML length: ${html.length}`);

    // Tenta obter o título de várias formas
    let rawTitle = "";
    const h1Matches = [
      html.match(/<h1[^>]*class="[^"]*(?:single-title|entry-title|post-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i),
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
    ];
    for (const m of h1Matches) {
      if (m) {
        rawTitle = m[1].replace(/<[^>]*>/g, "").trim();
        break;
      }
    }

    // Também tenta og:title
    if (!rawTitle) {
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitle) rawTitle = ogTitle[1].trim();
    }

    let extractedArtist = "";
    let extractedTitle = rawTitle;

    if (rawTitle.includes(" – ")) {
      [extractedArtist, extractedTitle] = rawTitle.split(" – ").map((s) => s.trim());
    } else if (rawTitle.includes(" - ")) {
      [extractedArtist, extractedTitle] = rawTitle.split(" - ").map((s) => s.trim());
    }

    const coverMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<img[^>]*class="[^"]*(?:wp-post-image|attachment|featured)[^"]*"[^>]*src=["']([^"']+)["']/i);
    const coverUrl = coverMatch ? coverMatch[1] : null;

    // Passa o HTML já obtido para evitar re-fetch
    const mp3Url = await followUntilMp3(postUrl, 4, html, supabase, userId);

    // Tenta obter categoria
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const categoryPatterns = [
      /Gén?ero:\s*([^|<\n]+)/i,
      /Categoria:\s*([^|<\n]+)/i,
      /Genre:\s*([^|<\n]+)/i,
    ];
    let category = "";
    for (const p of categoryPatterns) {
      const m = textContent.match(p);
      if (m) {
        category = m[1].trim();
        break;
      }
    }
    if (!category) {
      const catLink = html.match(/<a[^>]*rel=["']category tag["'][^>]*>([\s\S]*?)<\/a>/i);
      category = catLink ? catLink[1].replace(/<[^>]*>/g, "").trim() : "Música";
    }

    const yearPatterns = [
      /Ano de Lan[çc]amento:\s*(\d{4})/i,
      /Ano:\s*(\d{4})/i,
      /(\b20\d{2}\b)/,
    ];
    let year = String(new Date().getFullYear());
    for (const p of yearPatterns) {
      const m = textContent.match(p);
      if (m) {
        year = m[1];
        break;
      }
    }

    return {
      mp3Url,
      coverUrl,
      extractedArtist,
      extractedTitle,
      extractedCategory: category,
      extractedYear: year,
    };
  } catch (error: any) {
    console.error(`❌ [getBueDeMusicaDetails] Erro: ${error.message}`);
    return {
      mp3Url: null,
      coverUrl: null,
      extractedArtist: "",
      extractedTitle: "",
      extractedCategory: "",
      extractedYear: "",
    };
  }
}

// ==================== VERIFICAÇÃO DE DUPLICADOS COM LÓGICA INTELIGENTE ====================

function cleanStringForDeduplication(str: string): string {
  if (!str) return "";
  
  let text = str
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/&#038;/g, "e")
    .replace(/&amp;/g, "e")
    .replace(/&quot;/g, "")
    .replace(/&#039;/g, "")
    .replace(/&nbsp;/g, " ");

  text = text.toLowerCase();
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove parentheses/brackets content containing feat/featuring/ft/prod/download/etc.
  text = text.replace(/\s*[\(\[][^\)\]]*(?:feat|featuring|ft|prod|by|with|e|&|and|vs|versus|download|mp3|original|completo)[^\)\]]*[\)\]]/gi, "");
  text = text.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "");

  // Clean special characters but keep alphanumeric, spaces and dashes
  text = text.replace(/[^\w\s\-]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function getArtistWords(artistStr: string): string[] {
  const stopwords = ["de", "do", "da", "em", "um", "uma", "os", "as", "com", "feat", "prod", "and", "the", "para"];
  return artistStr
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopwords.includes(w));
}

function getCoreArtistAndTitle(artist: string, title: string) {
  const cleanTitle = cleanStringForDeduplication(title);
  const cleanArtist = cleanStringForDeduplication(artist);

  let coreArtist = cleanArtist;
  let coreTitle = cleanTitle;

  if (cleanTitle.includes("-")) {
    const parts = cleanTitle.split("-");
    coreArtist = parts[0].trim();
    coreTitle = parts[1].trim();
  }

  // Remove the artist name from coreTitle if it is included
  if (coreArtist && coreTitle.includes(coreArtist)) {
    coreTitle = coreTitle.replace(coreArtist, "").replace(/\s+/g, " ").trim();
  }

  return {
    artist: coreArtist,
    title: coreTitle
  };
}

async function isDuplicateSong(
  supabase: any,
  userId: string,
  artist: string,
  title: string,
  sourceUrl: string,
  monitoredArtists: string[]
): Promise<boolean> {
  const newCore = getCoreArtistAndTitle(artist, title);

  console.log(`\n📝 [isDuplicate] Comparando: "${artist} - ${title}"`);
  console.log(`🔍 [isDuplicate] Core novo: artist="${newCore.artist}", title="${newCore.title}"`);

  // Primeiro verifica por URL (mais rápido)
  const { data: byUrl } = await supabase
    .from("processed_posts")
    .select("id")
    .eq("user_id", userId)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (byUrl) {
    console.log(`📌 [isDuplicate] Duplicado por URL: ${sourceUrl}`);
    return true;
  }

  // Depois verifica semanticamente
  const { data: existing } = await supabase
    .from("processed_posts")
    .select("artist, title")
    .eq("user_id", userId);

  if (!existing || existing.length === 0) {
    console.log("✅ [isDuplicate] Nenhum processado, música é única.");
    return false;
  }

  for (const song of existing) {
    const existingCore = getCoreArtistAndTitle(song.artist, song.title);
    if (newCore.title === existingCore.title) {
      const newWords = getArtistWords(newCore.artist);
      const existingWords = getArtistWords(existingCore.artist);
      const hasCommonArtist = newWords.some(w => existingWords.includes(w));

      if (hasCommonArtist || newCore.artist === existingCore.artist) {
        console.log(`🎵 [isDuplicate] DUPLICADO SEMÂNTICO (Smart)!`);
        console.log(`   Nova: "${artist} - ${title}"`);
        console.log(`   Existente: "${song.artist} - ${song.title}"`);
        return true;
      }
    }
  }

  console.log("✅ [isDuplicate] Música única, vai ser processada.");
  return false;
}

function parseFeaturedArtists(rawArtist: string, rawTitle: string): { title: string; artist: string } {
  let title = rawTitle.trim();
  let artist = rawArtist.trim();
  let featured = "";

  // 1. Extrair featured do título em parênteses ou colchetes
  const featRegex = /\s*[\(\[](?:feat|featuring|ft|part|participação|participacao)\.?\s+([^\)\]]+)[\)\]]/i;
  const featMatch = title.match(featRegex);

  if (featMatch) {
    featured = featMatch[1].trim();
    title = title.replace(featRegex, "").trim();
  } else {
    // Tenta fora de parênteses/colchetes
    const featRegexOutside = /\s+\b(?:feat|featuring|ft|part|participação|participacao)\.?\s+([^\n\-]+)/i;
    const featMatchOutside = title.match(featRegexOutside);
    if (featMatchOutside) {
      featured = featMatchOutside[1].trim();
      title = title.replace(featRegexOutside, "").trim();
    }
  }

  // 2. Se o artista original contiver "feat" ou similar, extrai dele também
  const artistFeatRegex = /\s*[,e]?\s*\b(?:feat|featuring|ft|part|participação|participacao)\.?\s+(.+)/i;
  const artistFeatMatch = artist.match(artistFeatRegex);
  if (artistFeatMatch) {
    if (!featured) {
      featured = artistFeatMatch[1].trim();
    }
    artist = artist.replace(artistFeatRegex, "").trim();
  }

  // 3. Normalizar os separadores do artista principal
  let primaryList = artist
    .split(/\s*,\s*|\s+e\s+|\s+&\s+/)
    .map(a => a.trim())
    .filter(a => a.length > 0);

  let featuredList = featured
    ? featured
        .split(/\s*,\s*|\s+e\s+|\s+&\s+/)
        .map(a => a.trim())
        .filter(a => a.length > 0)
    : [];

  // Filtrar featured list para não conter ninguém que já esteja na primary list
  featuredList = featuredList.filter(
    f => !primaryList.some(p => p.toLowerCase() === f.toLowerCase())
  );

  const primaryStr = primaryList.join(" , ");
  const featuredStr = featuredList.join(" , ");

  let finalArtist = primaryStr;
  if (featuredStr) {
    finalArtist = `${primaryStr} feat. ${featuredStr}`;
  }

  // Limpar hífens extras no título
  title = title.replace(/^\s*-\s*|\s*-\s*$/g, "").trim();

  return {
    title,
    artist: finalArtist
  };
}

// ==================== FUNÇÃO PRINCIPAL ====================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const url = new URL(req.url);

  // ── Endpoint para upload de slogans ──
  if (url.pathname.endsWith("/upload-slogan")) {
    try {
      const authHeader = req.headers.get("Authorization");
      const {
        data: { user },
      } = await supabaseClient.auth.getUser(authHeader?.replace("Bearer ", "") || "");
      if (!user)
        return new Response("Não autorizado", { status: 401, headers: corsHeaders });

      const formData = await req.formData();
      const file = formData.get("slogan1") || formData.get("slogan2");
      const field = formData.has("slogan1") ? "slogan1_url" : "slogan2_url";

      if (!(file instanceof File)) throw new Error("Ficheiro inválido");

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("slogans")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("slogans").getPublicUrl(filePath);

      await supabaseClient
        .from("automation_settings")
        .upsert({ user_id: user.id, [field]: publicUrl }, { onConflict: "user_id" });

      return new Response(
        JSON.stringify({ [field.replace("_url", "")]: publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  }

  // ── Motor principal ──
  let currentUserId: string | null = null;
  try {
    const body = await req.json();
    currentUserId = body.userId;

    // Hardening: BFLA authorization check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    let isAuthorized = false;
    
    // Descodifica o payload do JWT para verificar a role sem precisar da chave secreta de assinatura
    // (a assinatura é garantidamente válida porque o gateway do Supabase já a verificou)
    let jwtRole = "";
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const data = JSON.parse(payload);
        jwtRole = data.role || "";
      }
    } catch (_) {}

    if (jwtRole === "service_role") {
      isAuthorized = true;
    } else {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (!authError && user && user.id === currentUserId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Não autorizado: Credenciais inválidas ou ID de utilizador incorreto." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logToSupabase(supabaseClient, currentUserId, "info", "🏁 Motor iniciado...");

    // Busca artistas do utilizador
    const { data: artists } = await supabaseClient
      .from("artists")
      .select("name")
      .eq("user_id", currentUserId);
    const artistNames: string[] = (artists || []).map((a: any) => a.name);

    if (artistNames.length === 0) {
      await logToSupabase(
        supabaseClient,
        currentUserId,
        "warn",
        "⚠️ Nenhum artista configurado."
      );
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📋 Artistas monitorizados: ${artistNames.join(", ")}`);

    const { data: autoSettings } = await supabaseClient
      .from("automation_settings")
      .select("*")
      .eq("user_id", currentUserId)
      .single();

    const { data: secureSettings } = await supabaseClient
      .from("settings")
      .select("blog_id, client_id, client_secret, refresh_token")
      .eq("user_id", currentUserId)
      .maybeSingle();

    // ── Scraping nos dois sites em paralelo ──
    console.log("🔍 A fazer scraping em vicentenews e buedemusica em paralelo...");

    const [songsVicente, songsBue] = await Promise.all([
      scrapeVicenteNews(artistNames, supabaseClient, currentUserId),
      scrapeBueDeMusica(artistNames, supabaseClient, currentUserId),
    ]);

    const allFoundSongs = [...songsVicente, ...songsBue];

    console.log(
      `📊 Total: ${allFoundSongs.length} música(s) encontrada(s) ` +
        `(${songsVicente.length} vicentenews, ${songsBue.length} buedemusica)`
    );

    if (allFoundSongs.length === 0) {
      await logToSupabase(
        supabaseClient,
        currentUserId,
        "info",
        "😴 Nenhuma música nova encontrada para os artistas monitorizados."
      );
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Google Drive token ──
    let driveToken = "";
    if (autoSettings?.drive_folder_id && secureSettings?.refresh_token) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: secureSettings.client_id,
            client_secret: secureSettings.client_secret,
            refresh_token: secureSettings.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const tokenData = await tokenRes.json();
        driveToken = tokenData.access_token || "";
        if (driveToken) {
          await logToSupabase(
            supabaseClient,
            currentUserId,
            "info",
            "✅ Google Drive autenticado com sucesso."
          );
        } else {
          await logToSupabase(
            supabaseClient,
            currentUserId,
            "warn",
            `⚠️ Google Drive: token vazio. ${JSON.stringify(tokenData)}`
          );
        }
      } catch (error: any) {
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "error",
          `Erro Google Drive: ${error.message}`
        );
      }
    }

    const audioMixUrl =
      autoSettings?.audio_mix_api_url || Deno.env.get("AUDIO_MIX_API_URL");

    if (!audioMixUrl) {
      await logToSupabase(
        supabaseClient,
        currentUserId,
        "error",
        "Audio Mix API não configurada."
      );
      return new Response(
        JSON.stringify({ success: false, error: "Audio Mix API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;
    let duplicateCount = 0;
    const duplicateTitles: string[] = [];
    const totalSongs = allFoundSongs.length;

    // Notifica o frontend do total de músicas a processar
    if (totalSongs > 0) {
      await logToSupabase(
        supabaseClient,
        currentUserId,
        "info",
        `PROGRESS:0/${totalSongs} — A iniciar processamento de ${totalSongs} música(s)...`
      );
    }

    for (const [songIndex, song] of allFoundSongs.entries()) {
      try {
        // ── Log de progresso: número actual na fila ──
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          `PROGRESS:${songIndex}/${totalSongs} — A verificar: "${song.title}" (${songIndex + 1}/${totalSongs})`
        );

        // ── Parse/Limpeza de Artistas e Feats no título ──
        const parsedScraped = parseFeaturedArtists(song.artist, song.title);

        // ── Verifica duplicado com lógica inteligente ──
        const isDup = await isDuplicateSong(
          supabaseClient,
          currentUserId,
          parsedScraped.artist,
          parsedScraped.title,
          song.link,
          artistNames
        );

        if (isDup) {
          console.log(`⏩ Saltado (duplicado): "${song.title}" [${song.sourceSite}]`);
          duplicateCount++;
          duplicateTitles.push(song.title);
          continue;
        }

        console.log(`🎯 Nova música: "${parsedScraped.title}" (${parsedScraped.artist}) [${song.sourceSite}]`);

        // ── Obtém detalhes específicos do site ──
        let details;
        if (song.sourceSite === "vicentenews") {
          details = await getVicenteNewsDetails(song.link, supabaseClient, currentUserId);
        } else {
          details = await getBueDeMusicaDetails(song.link, supabaseClient, currentUserId);
        }

        if (!details.mp3Url) {
          await logToSupabase(
            supabaseClient,
            currentUserId,
            "warn",
            `⚠️ Sem link de download para "${song.title}"`
          );
          continue;
        }

        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          `✅ Link MP3 obtido para "${song.title}"`
        );

        const rawFinalArtist = details.extractedArtist || song.artist;
        const rawFinalTitle = details.extractedTitle || song.title;

        const finalParsed = parseFeaturedArtists(rawFinalArtist, rawFinalTitle);
        const finalArtist = finalParsed.artist;
        const finalTitle = finalParsed.title;

        const payload = {
          music_url: details.mp3Url,
          slogan1_url:
            (autoSettings?.slogan_position === "beginning" ||
            autoSettings?.slogan_position === "both")
              ? (autoSettings.slogan1_url || "")
              : "",
          slogan2_url:
            (autoSettings?.slogan_position === "end" ||
            autoSettings?.slogan_position === "both")
              ? (autoSettings.slogan2_url || "")
              : "",
          drive_token: driveToken,
          drive_folder_id: autoSettings?.drive_folder_id || "",
          song_title: finalTitle,
          user_id: currentUserId,
          artist_name: finalArtist,
          cover_url: details.coverUrl || "",
          blog_id: secureSettings?.blog_id || "",
          bitrate: autoSettings?.bitrate || "192",
          category: details.extractedCategory,
          year: details.extractedYear,
          source_url: song.link,
          supabase_url: Deno.env.get("SUPABASE_URL"),
          supabase_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
          blogger_template: autoSettings?.blogger_template || "",
          shortlink_provider: autoSettings?.shortlink_provider || "none",
          shortlink_api_key: autoSettings?.shortlink_api_key || "",
          default_cover_url: autoSettings?.default_cover_url || "",
        };

        // ── AbortController: timeout de 55s por música para estabilidade ──
        const songAbort = new AbortController();
        const songTimeoutId = setTimeout(() => songAbort.abort(), 70_000);

        let apiRes: Response;
        try {
          apiRes = await fetch(`${audioMixUrl}/mix-async`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Bypass-Tunnel-Reminder": "true",
              "Authorization": authHeader || `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
            },
            body: JSON.stringify(payload),
            signal: songAbort.signal,
          });
        } catch (fetchErr: any) {
          if (fetchErr.name === "AbortError") {
            await logToSupabase(
              supabaseClient,
              currentUserId,
              "warn",
              `⏱️ Timeout (70s) ao enviar "${finalTitle}" — a saltar para a próxima música.`
            );
            continue; // Passa automaticamente para a próxima música
          }
          throw fetchErr; // Outros erros sobem para o catch externo
        } finally {
          clearTimeout(songTimeoutId);
        }

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          throw new Error(`Audio Mix API falhou: ${apiRes.status} - ${errText}`);
        }

        // Regista como processado
        await supabaseClient.from("processed_posts").insert({
          user_id: currentUserId,
          artist: finalArtist,
          title: finalTitle,
          source_url: song.link,
          cover_url: details.coverUrl,
        });

        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          `PROGRESS:${songIndex + 1}/${totalSongs} — 🎉 Enviado: "${finalTitle}" — ${finalArtist}`
        );
        processedCount++;
      } catch (songError: any) {
        // Erro numa música não deve parar as restantes
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "error",
          `❌ Erro ao processar "${song.title}": ${songError.message}`
        );
      }
    }

    // Notifica o frontend que o processamento terminou
    if (totalSongs > 0) {
      await logToSupabase(
        supabaseClient,
        currentUserId,
        "info",
        `PROGRESS:DONE — Processamento concluído: ${processedCount} nova(s) de ${totalSongs} música(s).`
      );
    }

    console.log(`✅ Finalizado. ${processedCount} música(s) nova(s) processada(s).`);

    if (processedCount === 0) {
      if (duplicateCount > 0) {
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          `😴 Nenhuma música nova (música(s) já existente(s) ignorada(s): ${duplicateTitles.join(', ')})`
        );
      } else {
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          "😴 Nenhuma música nova encontrada para os artistas monitorizados."
        );
      }
    } else {
      if (duplicateCount > 0) {
        await logToSupabase(
          supabaseClient,
          currentUserId,
          "info",
          `⏩ Ignoradas ${duplicateCount} música(s) já existente(s).`
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await logToSupabase(
      supabaseClient,
      currentUserId,
      "error",
      `❌ Erro fatal: ${error.message}`
    );
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});