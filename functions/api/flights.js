export async function onRequest() {
  return Response.json({ route:'ARN-YYC', airlines:['Air Canada','KLM','Finnair'], filters:{ avoidUSA:true, after:'09:30' }, note:'Koppla Amadeus/Kiwi/Skyscanner API här.' });
}
