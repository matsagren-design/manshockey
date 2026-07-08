function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

const fallback = [{"id": 1, "opponent": "Spruce Grove Saints", "game_date": "2026-09-09T03:00:00+02:00", "home_away": "Hemma", "arena": "Centennial Regional Arena", "city": "Brooks", "tv_link": "https://www.flohockey.tv/", "report_before": "Fokus på enkel puckhantering."}, {"id": 2, "opponent": "Okotoks Oilers", "game_date": "2026-09-12T03:05:00+02:00", "home_away": "Borta", "arena": "Viking Rentals Centre", "city": "Okotoks", "tv_link": "https://www.flohockey.tv/", "report_before": "Tidigt bortatest."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM matches ORDER BY id DESC LIMIT 300').all();
    return json({ source: 'd1', items: results });
  } catch (err) {
    return json({ source: 'fallback-error', error: String(err), items: fallback });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await readBody(context.request);
    if (!context.env.DB) return json({ ok: false, demo: true, item: body, message: 'D1 not connected. Saved only in browser state.' });
    const result = await context.env.DB.prepare(
      'INSERT INTO matches (opponent, game_date, home_away, arena, city, tv_link, result, report_before, report_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.opponent ?? '', body.game_date ?? '', body.home_away ?? '', body.arena ?? '', body.city ?? '', body.tv_link ?? '', body.result ?? '', body.report_before ?? '', body.report_after ?? '').run();
    return json({ ok: true, result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
