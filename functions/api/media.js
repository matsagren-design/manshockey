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

const fallback = [{"id": 1, "title": "Google News – Måns Ågren", "source": "Google News", "url": "https://news.google.com/search?q=%22M%C3%A5ns%20%C3%85gren%22", "tag": "Måns", "summary": "Mediabevakning."}, {"id": 2, "title": "Brooks Bandits", "source": "Brooks", "url": "https://www.brooksbandits.ca/", "tag": "Lag", "summary": "Klubbnyheter."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM media_items ORDER BY id DESC LIMIT 500').all();
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
      'INSERT INTO media_items (title, source, url, tag, summary, published_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(body.title ?? '', body.source ?? '', body.url ?? '', body.tag ?? '', body.summary ?? '', body.published_at ?? '').run();
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
      'UPDATE media_items SET title = ?, source = ?, url = ?, tag = ?, summary = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(body.title ?? '', body.source ?? '', body.url ?? '', body.tag ?? '', body.summary ?? '', body.published_at ?? '', body.id).run();
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
    const result = await db.prepare('DELETE FROM media_items WHERE id = ?').bind(id).run();
    return json({ ok: true, action: 'deleted', result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
