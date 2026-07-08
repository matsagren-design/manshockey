function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}
function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const parts = cookie.split(';').map(x => x.trim());
  for (const part of parts) {
    const [k, ...v] = part.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
async function requireAdmin(context) {
  const sid = getCookie(context.request, 'mh_session');
  if (!sid || !context.env.DB) return null;
  const user = await context.env.DB.prepare(
    'SELECT users.id, users.email, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > datetime("now") LIMIT 1'
  ).bind(sid).first();
  if (!user || user.role !== 'admin') return null;
  return user;
}

const fallback = [{"id": 1, "match_id": 1, "goals": 0, "assists": 0, "points": 0, "plus_minus": 0, "pim": 0, "shots": 0, "toi": "", "hits": 0, "blocks": 0, "note": "Statistik redo."}];
export async function onRequestGet(context) {
  try {
    if (!context.env.DB) return json({ source:'fallback', items:fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM player_stats ORDER BY id DESC LIMIT 500').all();
    return json({ source:'d1', items:results });
  } catch (err) {
    return json({ source:'fallback-error', error:String(err), items:fallback });
  }
}
export async function onRequestPost(context) {
  const user = await requireAdmin(context);
  if (!user) return json({ ok:false, error:'Unauthorized' }, 401);
  try {
    const body = await readBody(context.request);
    const result = await context.env.DB.prepare('INSERT INTO player_stats (match_id, goals, assists, points, plus_minus, pim, shots, toi, hits, blocks, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(body.match_id ?? '', body.goals ?? '', body.assists ?? '', body.points ?? '', body.plus_minus ?? '', body.pim ?? '', body.shots ?? '', body.toi ?? '', body.hits ?? '', body.blocks ?? '', body.note ?? '').run();
    return json({ ok:true, action:'created', result });
  } catch (err) { return json({ ok:false, error:String(err) }, 500); }
}
export async function onRequestPut(context) {
  const user = await requireAdmin(context);
  if (!user) return json({ ok:false, error:'Unauthorized' }, 401);
  try {
    const body = await readBody(context.request);
    if (!body.id) return json({ ok:false, error:'Missing id' }, 400);
    const result = await context.env.DB.prepare('UPDATE player_stats SET match_id = ?, goals = ?, assists = ?, points = ?, plus_minus = ?, pim = ?, shots = ?, toi = ?, hits = ?, blocks = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.match_id ?? '', body.goals ?? '', body.assists ?? '', body.points ?? '', body.plus_minus ?? '', body.pim ?? '', body.shots ?? '', body.toi ?? '', body.hits ?? '', body.blocks ?? '', body.note ?? '', body.id).run();
    return json({ ok:true, action:'updated', result });
  } catch (err) { return json({ ok:false, error:String(err) }, 500); }
}
export async function onRequestDelete(context) {
  const user = await requireAdmin(context);
  if (!user) return json({ ok:false, error:'Unauthorized' }, 401);
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ ok:false, error:'Missing id' }, 400);
    const result = await context.env.DB.prepare('DELETE FROM player_stats WHERE id = ?').bind(id).run();
    return json({ ok:true, action:'deleted', result });
  } catch (err) { return json({ ok:false, error:String(err) }, 500); }
}
