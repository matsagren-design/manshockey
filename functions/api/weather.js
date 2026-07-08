export async function onRequest() {
  return Response.json({
    source: 'placeholder',
    location: 'Brooks, Alberta',
    summary: 'Väder-API redo',
    temperature_c: null,
    note: 'Koppla valfri vädertjänst/API här.'
  });
}
