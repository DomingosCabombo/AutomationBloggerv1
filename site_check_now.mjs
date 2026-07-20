fetch('https://www.vicentenews.com/musica/', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  .then(r => r.text())
  .then(html => {
    const artists = ['Filho do Zua', 'Gerilson Insrael', 'Soraia Ramos', 'Nair Nany', 'Deezy', 'Tshunami'];
    const linkRegex = /<a[^>]+href=["'](https:\/\/www\.vicentenews\.com\/musica\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const found = [];
    const seen = new Set();
    while ((m = linkRegex.exec(html)) !== null) {
      const title = m[2].replace(/<[^>]*>/g,' ').replace(/&#\d+;/g,' ').replace(/\s+/g,' ').trim();
      const href = m[1];
      if (!title || seen.has(href)) continue;
      seen.add(href);
      const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
      for (const a of artists) {
        if (norm(title).includes(norm(a))) {
          found.push({ artist: a, title, href });
          break;
        }
      }
    }
    console.log('=== Músicas actualmente no site para artistas com histórico de downloads ===');
    if (found.length === 0) {
      console.log('❌ Nenhuma música nova no site para estes artistas. O sistema ficará inativo até que surjam novas músicas.');
    } else {
      found.forEach(f => console.log('✅ ' + f.title + '\n   -> ' + f.href));
    }
  });
