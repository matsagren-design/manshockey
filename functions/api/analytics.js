export async function onRequest(context) {
  const fallback = {
    points: [{label:'Sep',value:0},{label:'Okt',value:0},{label:'Nov',value:0},{label:'Dec',value:0}],
    scout: [{label:'Defensiv',value:92},{label:'Förstapass',value:88},{label:'Boxplay',value:94},{label:'Fysik',value:90}]
  };
  return Response.json(fallback);
}
