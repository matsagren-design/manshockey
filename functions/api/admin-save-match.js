export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!context.env.DB) return Response.json({ ok: false, message: 'D1 database is not connected yet. Local demo mode only.' }, { status: 200 });
    await context.env.DB.prepare(
      'INSERT INTO matches (opponent, game_date, home_away, arena, scout_level, tv_link) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(body.opponent, body.game_date, body.home_away, body.arena || '', body.scout_level || '', body.tv_link || '').run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
