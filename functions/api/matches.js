export async function onRequest(context) {
  const fallback = [
    { id: 1, opponent: 'Spruce Grove Saints', game_date: '2026-09-09T03:00:00+02:00', home_away: 'Hemma', arena: 'Centennial Regional Arena', city: 'Brooks', tv_link: 'https://www.flohockey.tv/', report_before: 'Fokus på enkel puckhantering, första pass och defensiv trygghet.' },
    { id: 2, opponent: 'Okotoks Oilers', game_date: '2026-09-12T03:05:00+02:00', home_away: 'Borta', arena: 'Viking Rentals Centre', city: 'Okotoks', tv_link: 'https://www.flohockey.tv/', report_before: 'Tidigt bortatest. Håll koll på special teams och sargspel.' }
  ];
  try {
    if (!context.env.DB) return Response.json({ source: 'fallback', matches: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM matches ORDER BY game_date ASC LIMIT 300').all();
    return Response.json({ source: 'd1', matches: results.length ? results : fallback });
  } catch (err) {
    return Response.json({ source: 'fallback-error', error: String(err), matches: fallback });
  }
}
