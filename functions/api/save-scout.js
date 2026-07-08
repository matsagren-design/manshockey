export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!context.env.DB) return Response.json({ ok: false, message: 'D1 not connected. Demo mode only.' });
    await context.env.DB.prepare(
      'INSERT INTO scout_reports (match_id, category, score, note) VALUES (?, ?, ?, ?)'
    ).bind(body.match_id || null, body.category, body.score, body.note || '').run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
