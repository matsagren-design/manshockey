function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function getCookie(request,name){
  const c=request.headers.get('Cookie')||'';
  for(const p of c.split(';').map(x=>x.trim())){
    const[k,...v]=p.split('=');
    if(k===name)return decodeURIComponent(v.join('='));
  }
  return null;
}

async function requireUser(context){
  const sid=getCookie(context.request,'mh_session');
  if(!sid||!context.env.DB)return null;
  return await context.env.DB.prepare(
    'SELECT users.id,users.email,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime("now") LIMIT 1'
  ).bind(sid).first();
}

function safeParse(s,fallback=[]){
  try{return JSON.parse(s)}catch{return fallback}
}

function resultParts(result=''){
  const m=String(result).match(/(\d+)\s*[-:]\s*(\d+)/);
  return m ? {for:Number(m[1]),against:Number(m[2])} : null;
}

function summarizeForm(rows){
  const games=[];
  let wins=0,losses=0,gf=0,ga=0;

  for(const r of rows){
    const p=resultParts(r.result);
    if(!p)continue;

    // result is stored Brooks-opponent. Reverse to opponent perspective.
    const oppFor=p.against;
    const oppAgainst=p.for;
    const win=oppFor>oppAgainst;

    if(win)wins++; else losses++;
    gf+=oppFor; ga+=oppAgainst;

    games.push({
      date:r.game_date,
      opponent:'Brooks Bandits',
      result:`${oppFor}-${oppAgainst}`,
      outcome:win?'W':'L',
      venue:String(r.home_away||'').toLowerCase()==='hemma'?'Away':'Home'
    });
  }

  return {
    games,wins,losses,gf,ga,
    avg_for:games.length?Number((gf/games.length).toFixed(2)):0,
    avg_against:games.length?Number((ga/games.length).toFixed(2)):0
  };
}

function buildNarrative(target,form){
  if(!form.games.length){
    return `Ingen verifierad resultatserie finns ännu för ${target.opponent} i MansHockey-datan.`;
  }

  const trend=form.wins>form.losses?'positiv':form.wins<form.losses?'svag':'jämn';

  return `${target.opponent} har ${form.wins}-${form.losses} i de verifierade matcher som finns i D1. Formtrenden är ${trend}. Laget gör i snitt ${form.avg_for} mål och släpper in ${form.avg_against}.`;
}

async function generateAI(env,target,form){
  if(!env.OPENAI_API_KEY)return null;

  const prompt=`Du är hockeyanalytiker.
Skriv en kort svensk pre-game-analys inför Brooks Bandits mot ${target.opponent}.
Använd endast följande verifierade data och hitta inte på något:
${JSON.stringify(form)}
Om underlaget saknar verifierade matcher ska du uttryckligen säga att analysunderlaget är begränsat.
Max 120 ord.`;

  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'gpt-4.1-mini',
      messages:[{role:'user',content:prompt}],
      temperature:0.2,
      max_tokens:220
    })
  });

  if(!r.ok)return null;
  const d=await r.json().catch(()=>null);
  return d?.choices?.[0]?.message?.content?.trim()||null;
}

async function compute(context,matchId){
  const db=context.env.DB;

  const target=await db.prepare(
    'SELECT id,opponent,game_date,home_away FROM matches WHERE id=? LIMIT 1'
  ).bind(matchId).first();

  if(!target)throw new Error('Match hittades inte');

  const rows=(await db.prepare(`
    SELECT id,opponent,game_date,home_away,result,game_status
      FROM matches
     WHERE opponent=?
       AND id<>?
       AND result IS NOT NULL
       AND trim(result)<>''
     ORDER BY game_date DESC
     LIMIT 5
  `).bind(target.opponent,target.id).all()).results||[];

  const form=summarizeForm(rows);
  const baseSummary=buildNarrative(target,form);
  const ai=await generateAI(context.env,target,form);

  const homeGames=form.games.filter(g=>g.venue==='Home');
  const awayGames=form.games.filter(g=>g.venue==='Away');

  const homeAwaySummary=form.games.length
    ? `Hemma ${homeGames.length} verifierade matcher, borta ${awayGames.length}.`
    : 'Ingen verifierad hemma/borta-serie ännu.';

  const scoringSummary=form.games.length
    ? `${form.avg_for} mål framåt / ${form.avg_against} bakåt i snitt.`
    : 'Måltrend saknas ännu.';

  const confidence=Math.min(1,form.games.length/5);

  await db.prepare(`
    INSERT INTO opponent_intel(
      match_id,opponent,generated_at,source,
      form_summary,last_games_json,home_away_summary,
      scoring_summary,ai_summary,confidence
    )
    VALUES(?,?,CURRENT_TIMESTAMP,'D1',?,?,?,?,?,?)
    ON CONFLICT(match_id) DO UPDATE SET
      opponent=excluded.opponent,
      generated_at=CURRENT_TIMESTAMP,
      source='D1',
      form_summary=excluded.form_summary,
      last_games_json=excluded.last_games_json,
      home_away_summary=excluded.home_away_summary,
      scoring_summary=excluded.scoring_summary,
      ai_summary=excluded.ai_summary,
      confidence=excluded.confidence
  `).bind(
    target.id,target.opponent,baseSummary,
    JSON.stringify(form.games),
    homeAwaySummary,
    scoringSummary,
    ai||baseSummary,
    confidence
  ).run();

  return {
    match_id:Number(target.id),
    opponent:target.opponent,
    form_summary:baseSummary,
    last_games:form.games,
    home_away_summary:homeAwaySummary,
    scoring_summary:scoringSummary,
    ai_summary:ai||baseSummary,
    confidence
  };
}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);

  const url=new URL(context.request.url);
  const matchId=Number(url.searchParams.get('match_id')||0);
  if(!matchId)return json({ok:false,error:'match_id krävs'},400);

  const target=await context.env.DB.prepare(
    'SELECT id,opponent FROM matches WHERE id=? LIMIT 1'
  ).bind(matchId).first();

  if(!target)return json({ok:false,error:'Match hittades inte'},404);

  const cached=await context.env.DB.prepare(
    'SELECT * FROM opponent_intel WHERE match_id=? LIMIT 1'
  ).bind(matchId).first();

  // Critical binding guard:
  // cache is valid only if it still belongs to the exact current match/opponent.
  if(cached && Number(cached.match_id)===Number(target.id) &&
     String(cached.opponent||'')===String(target.opponent||'')){
    return json({
      ok:true,
      cached:true,
      item:{
        ...cached,
        match_id:Number(cached.match_id),
        last_games:safeParse(cached.last_games_json,[])
      }
    });
  }

  // Stale/wrong cache row: remove it before recomputing.
  if(cached){
    await context.env.DB.prepare(
      'DELETE FROM opponent_intel WHERE match_id=?'
    ).bind(matchId).run();
  }

  try{
    const item=await compute(context,matchId);
    return json({ok:true,cached:false,item});
  }catch(err){
    return json({ok:false,error:String(err)},500);
  }
}

export async function onRequestPost(context){
  const user=await requireUser(context);
  if(!user)return json({ok:false,error:'Unauthorized'},401);

  try{
    const body=await context.request.json();
    const matchId=Number(body?.match_id||0);
    if(!matchId)return json({ok:false,error:'match_id krävs'},400);

    const item=await compute(context,matchId);
    return json({ok:true,item});
  }catch(err){
    return json({ok:false,error:String(err)},500);
  }
}
