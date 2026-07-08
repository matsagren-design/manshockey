export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const question = body.question || '';
    const answer = `AI Coach demo: Jag kan svara på frågor om matcher, scouting, media och resor. Fråga mottagen: "${question}". Nästa steg är att koppla Cloudflare AI eller OpenAI via säker Worker.`;
    return Response.json({ ok:true, answer });
  } catch (err) {
    return Response.json({ ok:false, error:String(err) }, {status:500});
  }
}
