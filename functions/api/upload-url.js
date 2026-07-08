export async function onRequestPost(context) {
  try {
    if (!context.env.FILES) return Response.json({ ok: false, message: 'R2 bucket not connected yet.' });
    return Response.json({ ok: false, message: 'R2 placeholder. Nästa steg: presigned upload eller direct put via Worker.' });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
