export async function onRequest({request}) {
  const url=new URL(request.url); const opponent=url.searchParams.get('opponent')||'kommande motståndare';
  return Response.json({pre:`Inför match mot ${opponent}: följ Måns defensiva beslut, boxplay och första pass.`,post:'Efter match: fyll i resultat, Måns statistik, plus/minus, highlights och egna observationer.'});
}
