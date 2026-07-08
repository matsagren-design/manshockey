function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}
function requireDb(context) {
  if (!context.env.DB) throw new Error('D1 binding DB is missing');
  return context.env.DB;
}

const fallback = [{"id": 1, "origin": "ARN", "destination": "YYC", "airline": "Air Canada", "max_price_sek": 10000, "depart_after": "09:30", "avoid_usa": 1, "note": "Bevaka utan USA-transit."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM travel_watch ORDER BY id DESC LIMIT 500').all();
    return json({ source: 'd1', items: results });
  } catch (err) {
    return json({ source: 'fallback-error', error: String(err), items: fallback });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await readBody(context.request);
    const db = requireDb(context);
    const result = await db.prepare(
      'INSERT INTO travel_watch (origin, destination, airline, max_price_sek, depart_after, avoid_usa, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.origin ?? '', body.destination ?? '', body.airline ?? '', body.max_price_sek ?? '', body.depart_after ?? '', body.avoid_usa ?? '', body.note ?? '').run();
    return json({ ok: true, action: 'created', result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const body = await readBody(context.request);
    if (!body.id) return json({ ok:false, error:'Missing id' }, 400);
    const db = requireDb(context);
    const result = await db.prepare(
      'UPDATE travel_watch SET origin = ?, destination = ?, airline = ?, max_price_sek = ?, depart_after = ?, avoid_usa = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(body.origin ?? '', body.destination ?? '', body.airline ?? '', body.max_price_sek ?? '', body.depart_after ?? '', body.avoid_usa ?? '', body.note ?? '', body.id).run();
    return json({ ok: true, action: 'updated', result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ ok:false, error:'Missing id' }, 400);
    const db = requireDb(context);
    const result = await db.prepare('DELETE FROM travel_watch WHERE id = ?').bind(id).run();
    return json({ ok: true, action: 'deleted', result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
