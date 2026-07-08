export async function onRequest(context) {
  const fallback = [
    { category: 'Defensivt spel', score: 92, note: 'Stark framför mål och låg risk.' },
    { category: 'Förstapass', score: 88, note: 'Snabb första puck ur zon.' },
    { category: 'Boxplay', score: 94, note: 'Tydlig special teams-profil.' }
  ];
  try {
    if (!context.env.DB) return Response.json({ source: 'fallback', reports: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM scout_reports ORDER BY created_at DESC LIMIT 100').all();
    return Response.json({ source: 'd1', reports: results });
  } catch (err) {
    return Response.json({ source: 'fallback-error', error: String(err), reports: fallback });
  }
}
