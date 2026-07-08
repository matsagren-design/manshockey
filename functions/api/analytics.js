export async function onRequest(context) {
  try {
    if (context.env.DB) {
      const matches = await context.env.DB.prepare('SELECT COUNT(*) AS count FROM matches').first();
      const scout = await context.env.DB.prepare('SELECT AVG(score) AS avg_score FROM scout_reports').first();
      const media = await context.env.DB.prepare('SELECT COUNT(*) AS count FROM media_items').first();
      return Response.json({
        points: [{label:'Matcher', value:Number(matches?.count || 0)}, {label:'Media', value:Number(media?.count || 0)}],
        scout: [{label:'Scoutsnitt', value:Math.round(Number(scout?.avg_score || 0)) || 0}]
      });
    }
  } catch {}
  return Response.json({ points:[{label:'Matcher',value:0}], scout:[{label:'Scoutsnitt',value:0}] });
}
