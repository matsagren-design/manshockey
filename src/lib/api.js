export async function getJson(url, fallback) {
  try { const response = await fetch(url); return await response.json(); } catch { return fallback; }
}
export async function getItems(resource, fallback = []) {
  try { const response = await fetch(`/api/${resource}`); const data = await response.json(); return data.items || fallback; } catch { return fallback; }
}
export async function createItem(resource, item) { return request(resource, 'POST', item); }
export async function updateItem(resource, item) { return request(resource, 'PUT', item); }
export async function deleteItem(resource, id) {
  try { const response = await fetch(`/api/${resource}?id=${encodeURIComponent(id)}`, { method:'DELETE' }); return await response.json(); } catch { return { ok:false }; }
}
async function request(resource, method, item) {
  try { const response = await fetch(`/api/${resource}`, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) }); return await response.json(); } catch { return { ok:false }; }
}
export async function login(email, password) {
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password}) });
  return await r.json();
}
export async function logout() { const r = await fetch('/api/auth/logout', { method:'POST' }); return await r.json(); }
export async function me() { return getJson('/api/auth/me', { ok:false, user:null }); }
export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('sv-SE', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(date));
}
export function isSameMatch(item, matchId) { return String(item.match_id || '') === String(matchId || ''); }
