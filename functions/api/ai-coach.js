export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const question = body.question || '';
  let contextText = 'D1 är inte kopplad ännu.';
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT opponent, game_date, home_away, result, report_before, report_after FROM matches ORDER BY game_date DESC LIMIT 20').all();
      contextText = JSON.stringify(matches.results || []);
    }
  } catch {}
  return Response.json({
    ok: true,
    answer: `AI Coach demo: frågan var "${question}". Jag kan läsa matcher/scouting från D1 när databasen är kopplad. Aktuell kontext: ${contextText.slice(0, 500)}`
  });
}
