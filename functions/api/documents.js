function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

const fallback = [{"id": 1, "title": "Pass", "category": "Resa", "note": "Kopia och giltighet."}, {"id": 2, "title": "Försäkring", "category": "Dokument", "note": "BCHL + svensk."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM documents ORDER BY id DESC LIMIT 300').all();
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
      'INSERT INTO documents (title, category, note, file_key, url) VALUES (?, ?, ?, ?, ?)'
    ).bind(body.title ?? '', body.category ?? '', body.note ?? '', body.file_key ?? '', body.url ?? '').run();
    return json({ ok: true, result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
