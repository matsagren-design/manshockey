export async function onRequest() {
  const queries = ['"Måns Ågren"','"Mans Agren"','"Brooks Bandits" "Agren"','"BCHL" "Måns"'];
  return Response.json({updated:new Date().toISOString(),queries,items:[]});
}
