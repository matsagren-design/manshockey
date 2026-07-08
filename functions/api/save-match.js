export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!context.env.DB) return Response.json({ ok: false, message: 'D1 not connected. Demo mode only.' });
    await context.env.DB.prepare(
      'INSERT INTO matches (opponent, game_date, home_away, arena, city, tv_link, report_before, report_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.opponent, body.game_date, body.home_away, body.arena || '', body.city || '', body.tv_link || '', body.report_before || '', body.report_after || '').run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
