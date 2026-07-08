export async function onRequest() {
  return Response.json({ travel: [
    {airline:'Air Canada', origin:'ARN', destination:'YYC', max_price_sek:10000, depart_after:'09:30', avoid_usa:1, note:'Bevaka direkt och jämför mot Google Flights.'},
    {airline:'KLM', origin:'ARN', destination:'YYC', max_price_sek:10000, depart_after:'09:30', avoid_usa:1, note:'Prioritera ARN–AMS–YYC.'},
    {airline:'Finnair', origin:'ARN', destination:'YYC', max_price_sek:10000, depart_after:'09:30', avoid_usa:1, note:'Alternativ via Helsingfors.'}
  ]});
}
