export async function getItems(resource, fallback = []) {
  try {
    const response = await fetch(`/api/${resource}`);
    const data = await response.json();
    return data.items || data[resource] || data.media || data.travel || fallback;
  } catch {
    return fallback;
  }
}

export async function saveItem(resource, item) {
  try {
    const response = await fetch(`/api/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return await response.json();
  } catch {
    return { ok:false, demo:true };
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
