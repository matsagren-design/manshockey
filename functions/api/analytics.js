export async function onRequest(context) {
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT COUNT(*) AS count FROM matches').first();
      const scout = await context.env.DB.prepare('SELECT AVG(score) AS avg_score FROM scout_reports').first();
      return Response.json({
        points: [{label:'Matcher', value: Number(matches?.count || 0)}],
        scout: [{label:'Scoutsnitt', value: Math.round(Number(scout?.avg_score || 0)) || 0}]
      });
    }
  } catch {}
  return Response.json({
    points: [{label:'Sep',value:0},{label:'Okt',value:0},{label:'Nov',value:0},{label:'Dec',value:0}],
    scout: [{label:'Defensiv',value:92},{label:'Förstapass',value:88},{label:'Boxplay',value:94},{label:'Fysik',value:90}]
  });
}
