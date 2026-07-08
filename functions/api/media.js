export async function onRequest(context) {
  const q = encodeURIComponent('"Måns Ågren" OR "Mans Agren" Brooks Bandits BCHL');
  const fallback = [
    { title: 'Google News – Måns Ågren', source: 'Google News', url: `https://news.google.com/search?q=${q}`, tag: 'Måns' },
    { title: 'Brooks Bandits', source: 'Brooks', url: 'https://www.brooksbandits.ca/', tag: 'Lag' },
    { title: 'BCHL', source: 'BCHL', url: 'https://bchl.ca/', tag: 'Liga' },
    { title: 'EliteProspects – Måns', source: 'EP', url: 'https://www.eliteprospects.com/player/801209/mans-agren', tag: 'Statistik' }
  ];
  try {
    if (!context.env.DB) return Response.json({ source: 'fallback', media: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM media_items ORDER BY published_at DESC, created_at DESC LIMIT 100').all();
    return Response.json({ source: 'd1', media: results.length ? results : fallback });
  } catch (err) {
    return Response.json({ source: 'fallback-error', error: String(err), media: fallback });
  }
}
