export async function onRequestPost(context) {
  if (!context.env.FILES) return Response.json({ ok:false, message:'R2 bucket not connected yet.' });
  return Response.json({ ok:false, message:'R2 placeholder: implementera filuppladdning när bucket är kopplad.' });
}
