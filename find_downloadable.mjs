// Encontra a primeira música no site que tenha link de download direto (.mp3 ou "Download")
// e mostra os detalhes para teste

async function findFirstDownloadableSong() {
  console.log('🔍 A procurar músicas com download disponível em vicentenews.com...\n');
  
  const res = await fetch('https://www.vicentenews.com/musica/', { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
  });
  const html = await res.text();
  
  // Extrair todos os links de músicas únicos
  const linkRegex = /href=["'](https:\/\/www\.vicentenews\.com\/musica\/[^"']+)["']/gi;
  const links = [];
  const seen = new Set();
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    if (!seen.has(m[1]) && !m[1].endsWith('/musica/')) {
      seen.add(m[1]);
      links.push(m[1]);
    }
  }
  
  console.log(`📋 Total de páginas de músicas encontradas: ${links.length}`);
  console.log('⏳ A verificar as primeiras 15 para encontrar uma com download...\n');
  
  for (const link of links.slice(0, 15)) {
    try {
      const pageRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const pageHtml = await pageRes.text();
      
      // Check for direct .mp3 link
      const mp3Match = pageHtml.match(/href=["']([^"']+\.mp3)["']/i);
      // Check for Download button
      const dlMatch = pageHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*(?:<[^>]+>\s*)*Download\s*(?:<\/[^>]+>\s*)*<\/a>/i);
      
      const mp3Url = mp3Match ? mp3Match[1] : (dlMatch ? dlMatch[1] : null);
      
      if (mp3Url) {
        // Extract title from h1
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : link;
        
        // Get cover
        const coverMatch = pageHtml.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        const coverUrl = coverMatch ? coverMatch[1] : null;
        
        const isMp3 = mp3Url.includes('.mp3');
        console.log(`✅ ENCONTRADA! ${isMp3 ? 'MP3 Direto' : 'Link de Download (redirect)'}`);
        console.log(`   Título   : ${title}`);
        console.log(`   Página   : ${link}`);
        console.log(`   MP3 URL  : ${mp3Url}`);
        console.log(`   Capa     : ${coverUrl || 'Não encontrada'}`);
        return { title, link, mp3Url, coverUrl };
      }
    } catch (e) {
      // skip
    }
  }
  
  console.log('❌ Nenhuma das 15 primeiras músicas tem download direto disponível.');
  return null;
}

findFirstDownloadableSong().catch(console.error);
