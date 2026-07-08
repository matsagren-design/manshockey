export async function onRequest({request}) {
  const url=new URL(request.url);
  return Response.json({route:'ARN-YYC',airlines:['Air Canada','KLM','Finnair'],filters:{noUS:true,departAfter:'09:30'},note:'Koppla Amadeus/Skyscanner/Kiwi API för livepriser.',date:url.searchParams.get('date')||null,items:[]});
}
