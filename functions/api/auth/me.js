function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
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
function makeId() {
  return crypto.randomUUID();
}
async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

export async function onRequest(context) {
  try {
    const sid = getCookie(context.request, 'mh_session');
    if (!sid || !context.env.DB) return json({ ok:false, user:null });
    const row = await context.env.DB.prepare(
      'SELECT users.id, users.email, users.name, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > datetime("now") LIMIT 1'
    ).bind(sid).first();
    if (!row) return json({ ok:false, user:null });
    return json({ ok:true, user: row });
  } catch (err) {
    return json({ ok:false, user:null, error:String(err) });
  }
}
