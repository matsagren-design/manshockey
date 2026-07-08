export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const question = body.question || '';
  let contextText = 'D1 är inte kopplad ännu.';
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT * FROM matches ORDER BY game_date DESC LIMIT 20').all();
      const scout = await context.env.DB.prepare('SELECT * FROM scout_reports ORDER BY id DESC LIMIT 20').all();
      const media = await context.env.DB.prepare('SELECT * FROM media_items ORDER BY id DESC LIMIT 20').all();
      const travel = await context.env.DB.prepare('SELECT * FROM travel_watch ORDER BY id DESC LIMIT 20').all();
      contextText = JSON.stringify({ matches: matches.results || [], scout: scout.results || [], media: media.results || [], travel: travel.results || [] });
    }
  } catch {}
  return Response.json({ ok:true, answer:`Enterprise 2026 AI demo: frågan var "${question}". Kontext: ${contextText.slice(0, 1400)}` });
}
