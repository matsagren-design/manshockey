function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  })
}

async function safeAll(db,sql){
  try{
    const r=await db.prepare(sql).all();
    return r.results||[];
  }catch{
    return [];
  }
}

function isUpcoming(m){
  const d=new Date(m.game_date);
  return !isNaN(d)&&d>=new Date()&&!m.result;
}

function buildInsights(ctx){
  const next=ctx.nextMatch;
  const scoutAvg=ctx.scout.length
    ? Math.round(ctx.scout.reduce((a,s)=>a+Number(s.score||0),0)/ctx.scout.length)
    : null;

  const insights=[];

  if(next){
    insights.push({
      type:"match_preview",
      title:"Nästa match",
      text:`Brooks möter ${next.opponent}. Fokus bör ligga på enkel puckhantering, förstapass och tajt gap genom neutral zon.`
    });
  }

  if(scoutAvg){
    insights.push({
      type:"scout_trend",
      title:"Scout trend",
      text:`Aktuellt scoutsnitt är ${scoutAvg}. Fortsätt följa Gap Control, First Pass och Physical Play över tid.`
    });
  }else{
    insights.push({
      type:"scout_missing",
      title:"Scout saknas",
      text:"Ingen scoutdata finns ännu. Lägg in första rapporten efter match för att aktivera trendanalys."
    });
  }

  insights.push({
    type:"player_focus",
    title:"Måns fokus",
    text:"Veckans fokus: förstapass under press, boxplay-positionering och enkelt spel ur egen zon."
  });

  return insights;
}

export async function onRequest(context){
  try{
    const db=context.env.DB;
    if(!db)return json({ok:false,module:"AIIntelligence",error:"Database not connected"},500);

    const [matches,events,scout,stats,media]=await Promise.all([
      safeAll(db,"SELECT * FROM matches ORDER BY game_date ASC LIMIT 100"),
      safeAll(db,"SELECT * FROM game_events ORDER BY id DESC LIMIT 200"),
      safeAll(db,"SELECT * FROM scout_reports ORDER BY id DESC LIMIT 200"),
      safeAll(db,"SELECT * FROM player_stats ORDER BY id DESC LIMIT 200"),
      safeAll(db,"SELECT * FROM media_items ORDER BY id DESC LIMIT 100")
    ]);

    const nextMatch=matches.find(isUpcoming)||matches[0]||null;

    const ctx={matches,events,scout,stats,media,nextMatch};
    const insights=buildInsights(ctx);

    return json({
      ok:true,
      module:"AIIntelligence",
      summary:{
        matches:matches.length,
        events:events.length,
        scout:scout.length,
        stats:stats.length,
        media:media.length,
        nextOpponent:nextMatch?.opponent||null
      },
      insights,
      recommendation:insights[0]?.text||"AI Intelligence väntar på mer data.",
      timestamp:new Date().toISOString()
    });

  }catch(err){
    return json({ok:false,module:"AIIntelligence",error:err.message},500);
  }
}