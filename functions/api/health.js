export async function onRequest(context) {
  return Response.json({ ok: true, app: 'MansHockey', structured: true, d1: Boolean(context.env.DB), r2: Boolean(context.env.FILES) });
}
