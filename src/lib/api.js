export async function getItems(resource, fallback = []) {
  try {
    const response = await fetch(`/api/${resource}`);
    const data = await response.json();
    return data.items || fallback;
  } catch {
    return fallback;
  }
}

export async function createItem(resource, item) {
  return request(resource, 'POST', item);
}

export async function updateItem(resource, item) {
  return request(resource, 'PUT', item);
}

export async function deleteItem(resource, id) {
  try {
    const response = await fetch(`/api/${resource}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return await response.json();
  } catch {
    return { ok:false };
  }
}

async function request(resource, method, item) {
  try {
    const response = await fetch(`/api/${resource}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return await response.json();
  } catch {
    return { ok:false };
  }
}

export async function getJson(url, fallback) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch {
    return fallback;
  }
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('sv-SE', {
    weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
  }).format(new Date(date));
}
