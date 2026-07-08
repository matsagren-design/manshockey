export async function onRequest() {
  const queries = ['"Måns Ågren"','"Mans Agren"','"Brooks Bandits" Måns','"BCHL" "Måns Ågren"'];
  return Response.json({ updated: new Date().toISOString(), queries, note: 'Koppla RSS/News API här.' });
}
