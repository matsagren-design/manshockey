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

const fallback = [{"id": 1, "category": "Defensivt spel", "score": 92, "note": "Stark framför mål."}, {"id": 2, "category": "Förstapass", "score": 88, "note": "Snabb första puck."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM scout_reports ORDER BY id DESC LIMIT 500').all();
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
      'INSERT INTO scout_reports (match_id, category, score, note) VALUES (?, ?, ?, ?)'
    ).bind(body.match_id ?? '', body.category ?? '', body.score ?? '', body.note ?? '').run();
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
      'UPDATE scout_reports SET match_id = ?, category = ?, score = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(body.match_id ?? '', body.category ?? '', body.score ?? '', body.note ?? '', body.id).run();
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
    const result = await db.prepare('DELETE FROM scout_reports WHERE id = ?').bind(id).run();
    return json({ ok: true, action: 'deleted', result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
