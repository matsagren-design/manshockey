function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

const fallback = [{"id": 1, "title": "Google News – Måns Ågren", "source": "Google News", "url": "https://news.google.com/search?q=%22M%C3%A5ns%20%C3%85gren%22", "tag": "Måns", "summary": "Mediabevakning."}, {"id": 2, "title": "Brooks Bandits", "source": "Brooks", "url": "https://www.brooksbandits.ca/", "tag": "Lag", "summary": "Klubbnyheter."}];

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source: 'fallback', items: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM media_items ORDER BY id DESC LIMIT 300').all();
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
      'INSERT INTO media_items (title, source, url, tag, summary, published_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(body.title ?? '', body.source ?? '', body.url ?? '', body.tag ?? '', body.summary ?? '', body.published_at ?? '').run();
    return json({ ok: true, result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
