export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export function ok(module, data = {}) {
  return json({
    ok: true,
    module,
    ...data,
    timestamp: new Date().toISOString()
  });
}

export function fail(module, error, status = 500) {
  return json({
    ok: false,
    module,
    error: String(error?.message || error)
  }, status);
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}