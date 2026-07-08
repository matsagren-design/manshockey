export async function onRequest(context) {
  return Response.json({
    ok: true,
    app: 'MansHockey X',
    version: '8.0',
    d1: Boolean(context.env.DB),
    r2: Boolean(context.env.FILES)
  });
}
