export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const question = body.question || '';
  let contextText = 'D1 är inte kopplad ännu.';
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT * FROM matches ORDER BY game_date DESC LIMIT 20').all();
      const events = await context.env.DB.prepare('SELECT * FROM game_events ORDER BY id DESC LIMIT 50').all();
      const stats = await context.env.DB.prepare('SELECT * FROM player_stats ORDER BY id DESC LIMIT 20').all();
      const scout = await context.env.DB.prepare('SELECT * FROM scout_reports ORDER BY id DESC LIMIT 20').all();
      contextText = JSON.stringify({ matches: matches.results || [], events: events.results || [], stats: stats.results || [], scout: scout.results || [] });
    }
  } catch {}
  return Response.json({ ok:true, answer:`Enterprise 2026.1 AI demo: frågan var "${question}". Kontext: ${contextText.slice(0, 1600)}` });
}
