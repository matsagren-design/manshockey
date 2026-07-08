export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  return Response.json({ answer: `AI Coach demo: frågan var "${body.question || ''}". Nästa steg är att koppla riktig AI och D1-data.` });
}
