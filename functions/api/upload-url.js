export async function onRequestPost(context) {
  if (!context.env.FILES) return Response.json({ ok:false, message:'R2 bucket not connected yet.' });
  return Response.json({ ok:false, message:'R2 placeholder. Implementera presigned upload/direct put här.' });
}
