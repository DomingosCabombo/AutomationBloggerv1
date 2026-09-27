import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vazbmthmfgtaypjpkeyy.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log("=== TESTE DE SCRAPING ===\n");

  // 1. Buscar utilizadores
  const { data: users, error: usersErr } = await supabase.from('settings').select('user_id').limit(10);
  if (usersErr) { console.error("Erro ao buscar utilizadores:", usersErr.message); process.exit(1); }
  
  if (!users || users.length === 0) {
    console.log("❌ Nenhum utilizador encontrado na tabela settings");
    process.exit(1);
  }

  for (const user of users) {
    const userId = user.user_id;
    console.log(`\n👤 Utilizador: ${userId}`);

    // 2. Buscar artistas
    const { data: artists } = await supabase.from('artists').select('name').eq('user_id', userId);
    const artistNames = (artists || []).map(a => a.name);
    
    if (artistNames.length === 0) {
      console.log("  ⚠️  Nenhum artista cadastrado para este utilizador");
      continue;
    }
    console.log(`  🎤 Artistas cadastrados (${artistNames.length}): ${artistNames.join(', ')}`);

    // 3. Fazer scraping do site
    console.log("\n  🌐 A fazer scraping de vicentenews.com...");
    const res = await fetch("https://www.vicentenews.com/musica/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();
    
    // Extrair links de musica simples (sem deno_dom, usar regex)
    const linkRegex = /<a[^>]+href="([^"]*\/musica\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const allLinks = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].trim();
      if (title && title.length > 3) {
        allLinks.push({ href, title });
      }
    }
    
    console.log(`  📋 Links de músicas encontrados no site: ${allLinks.length}`);
    if (allLinks.length > 0) {
      console.log(`  📋 Primeiros 5 títulos:`);
      allLinks.slice(0, 5).forEach(l => console.log(`     - "${l.title}"`));
    }

    // 4. Testar correspondência
    const foundSongs = [];
    for (const { href, title } of allLinks) {
      const normTitle = normalizeText(title);
      for (const artist of artistNames) {
        const normArtist = normalizeText(artist);
        if (normTitle.includes(normArtist)) {
          foundSongs.push({ title, href, artist });
          break;
        }
      }
    }

    console.log(`\n  🎵 Músicas que correspondem aos artistas: ${foundSongs.length}`);
    if (foundSongs.length > 0) {
      foundSongs.forEach(s => console.log(`  ✅ "${s.title}" → artista: "${s.artist}"`));
    } else {
      console.log("  ❌ NENHUMA CORRESPONDÊNCIA encontrada!");
      console.log("\n  🔍 A verificar porquê... Testando normalização:");
      for (const artist of artistNames.slice(0, 5)) {
        const normArtist = normalizeText(artist);
        const matches = allLinks.filter(l => normalizeText(l.title).includes(normArtist));
        console.log(`     Artista "${artist}" → norm: "${normArtist}" → ${matches.length > 0 ? `✅ ${matches.length} match(es)` : '❌ sem match no site agora'}`);
      }
    }
  }
}

main().catch(console.error);
