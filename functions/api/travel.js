function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

const fallback = [{"id": 1, "origin": "ARN", "destination": "YYC", "airline": "Air Canada", "max_price_sek": 10000, "depart_after": "09:30", "avoid_usa": 1, "note": "Bevaka utan USA-transit."}, {"id": 2, "origin": "ARN", "destination": "YYC", "airline": "KLM", "max_price_sek": 10000, "depart_after": "09:30", "avoid_usa": 1, "note": "Prioritera AMS."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM travel_watch ORDER BY id DESC LIMIT 300').all();
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
      'INSERT INTO travel_watch (origin, destination, airline, max_price_sek, depart_after, avoid_usa, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.origin ?? '', body.destination ?? '', body.airline ?? '', body.max_price_sek ?? '', body.depart_after ?? '', body.avoid_usa ?? '', body.note ?? '').run();
    return json({ ok: true, result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
