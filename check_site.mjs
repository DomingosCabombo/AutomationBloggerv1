fetch('https://www.vicentenews.com/musica/', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  .then(r => r.text())
  .then(html => {
    const regex = /href="(https?:\/\/[^"]*\/musica\/[^"]+)"[^>]*>([^<]{5,100})<\/a/g;
    const seen = new Set();
    const titles = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      const title = m[2].trim().replace(/\s+/g, ' ');
      if (!seen.has(title) && title.length > 5) {
        seen.add(title);
        titles.push(title);
      }
    }
    console.log('=== MÚSICAS ACTUAIS NO VICENTENEWS (' + titles.length + ') ===');
    titles.slice(0, 30).forEach((t, i) => console.log((i+1) + '. ' + t));
  })
  .catch(e => console.error('Erro:', e.message));
