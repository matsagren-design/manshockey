export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const question = body.question || '';
  let contextText = 'D1 är inte kopplad ännu.';
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT opponent, game_date, home_away, result, report_before, report_after FROM matches ORDER BY game_date DESC LIMIT 20').all();
      const scout = await context.env.DB.prepare('SELECT category, score, note, ai_comment FROM scout_reports ORDER BY id DESC LIMIT 20').all();
      contextText = JSON.stringify({ matches: matches.results || [], scout: scout.results || [] });
    }
  } catch {}
  return Response.json({ ok:true, answer:`AI Coach demo: frågan var "${question}". Kontext: ${contextText.slice(0, 900)}` });
}
