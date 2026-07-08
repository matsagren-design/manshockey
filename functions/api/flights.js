export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const from = url.searchParams.get('from') || 'ARN';
  const to = url.searchParams.get('to') || 'YYC';
  const depart = url.searchParams.get('depart') || '';
  return Response.json({
    checked_at: new Date().toISOString(),
    route: `${from}-${to}`,
    depart,
    status: 'placeholder',
    message: 'Flygpriser kräver API-koppling, exempelvis Amadeus, Skyscanner eller Kiwi. UI:t i appen är klart och kan kopplas mot denna endpoint.',
    offers: []
  });
}
