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

export async function onRequestPost(context) {
  try {
    const sid = getCookie(context.request, 'mh_session');
    if (sid && context.env.DB) await context.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
    return json({ ok:true }, 200, { 'Set-Cookie': 'mh_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  } catch {
    return json({ ok:true }, 200, { 'Set-Cookie': 'mh_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }
}
