export async function onRequest(context) {
  const fallback = [
    { airline: 'Air Canada', origin: 'ARN', destination: 'YYC', max_price_sek: 10000, depart_after: '09:30', avoid_usa: 1, note: 'Bevaka direkt hos Air Canada/Google Flights.' },
    { airline: 'KLM', origin: 'ARN', destination: 'YYC', max_price_sek: 10000, depart_after: '09:30', avoid_usa: 1, note: 'Bevaka ARN–AMS–YYC.' },
    { airline: 'Finnair', origin: 'ARN', destination: 'YYC', max_price_sek: 10000, depart_after: '09:30', avoid_usa: 1, note: 'Bevaka ARN–HEL–YYC.' }
  ];
  try {
    if (!context.env.DB) return Response.json({ source: 'fallback', travel: fallback });
    const { results } = await context.env.DB.prepare('SELECT * FROM travel_watch ORDER BY created_at DESC LIMIT 100').all();
    return Response.json({ source: 'd1', travel: results.length ? results : fallback });
  } catch (err) {
    return Response.json({ source: 'fallback-error', error: String(err), travel: fallback });
  }
}
