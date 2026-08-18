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

function summarize(rows){
  const games=[];
  let wins=0,losses=0,ties=0,gf=0,ga=0,hw=0,hl=0,ht=0,aw=0,al=0,at=0;

  for(const r of rows){
    const outcome=String(r.outcome||'').toUpperCase();
    const w=outcome==='W';
    const l=outcome==='L';
    const t=!w&&!l;

    wins+=w?1:0;
    losses+=l?1:0;
    ties+=t?1:0;

    const gameGf=Number(r.goals_for||0);
    const gameGa=Number(r.goals_against||0);

    gf+=gameGf;
    ga+=gameGa;

    if(r.home_away==='Home'){
      hw+=w?1:0;
      hl+=l?1:0;
      ht+=t?1:0;
    }else{
      aw+=w?1:0;
      al+=l?1:0;
      at+=t?1:0;
    }

    games.push({
      external_id:r.external_id||null,
      date:r.game_date,
      opponent:r.opponent_name,
      result:r.result,
      outcome,
      venue:r.home_away,
      gf:gameGf,
      ga:gameGa,
      source:r.source
    });
  }

  return {
    games,
    wins,losses,ties,
    gf,ga,diff:gf-ga,
    home:{wins:hw,losses:hl,ties:ht},
    away:{wins:aw,losses:al,ties:at},
    avg_for:games.length?Number((gf/games.length).toFixed(2)):0,
    avg_against:games.length?Number((ga/games.length).toFixed(2)):0
  };
}

function formatRecord(r){
  if(!r)return '–';
  return r.ties
    ? `${r.wins}-${r.losses}-${r.ties}`
    : `${r.wins}-${r.losses}`;
}

function buildAdvanced(target,f){
  const n=f.games.length;
  const keys=[];
  const mans=[];

  if(!n){
    keys.push('Spela strukturerat tills en verifierad motståndartrend finns tillgänglig.');
    mans.push('Prioritera position, kommunikation och enkla förstapass.');
  }else{
    if(f.avg_for>=4){
      keys.push(`Bromsa tempot i deras offensiva omställningar – ${target.opponent} gör ${f.avg_for} mål/match i Form 5.`);
    }else if(f.avg_for>=3){
      keys.push(`Begränsa ${target.opponent} tidigt – verifierat målsnitt ${f.avg_for}.`);
    }else{
      keys.push('Sätt press tidigt och etablera Brooks forecheck.');
    }

    if(f.avg_against>=4){
      keys.push(`Attackera målområdet konsekvent – ${f.avg_against} insläppta mål/match i Form 5.`);
    }else if(f.avg_against>=3){
      keys.push(`Skapa trafik och andrachanser – ${f.avg_against} insläppta mål/match i Form 5.`);
    }else{
      keys.push('Ha tålamod offensivt och skapa skymning mot ett relativt tätt försvar.');
    }

    if(f.diff>0){
      keys.push(`Undvik gratisomställningar – Form 5-målskillnaden är +${f.diff}.`);
    }else if(f.diff<0){
      keys.push(`Tryck på direkt efter puckvinst – Form 5-målskillnaden är ${f.diff}.`);
    }else{
      keys.push('Vinn specialdetaljerna i fem-mot-fem; Form 5 har jämn målskillnad.');
    }

    mans.push('Äg insidan framför eget mål och vinn första kroppskontakten.');
    mans.push(
      f.avg_for>=3
        ? 'Var extra vaksam på spelvändningar och andra vågen.'
        : 'Håll låg risk i första passet och flytta spelet snabbt ur egen zon.'
    );
    mans.push('Prioritera box-out, klubba på klubba och tydlig kommunikation.');
  }

  return {
    form5:f.games.slice(0,5).map(g=>g.outcome).join('–')||'–',
    record:n?`${f.wins}-${f.losses}${f.ties?`-${f.ties}`:''}`:'–',
    gf:n?f.gf:null,
    ga:n?f.ga:null,
    diff:n?f.diff:null,
    avg_for:n?f.avg_for:null,
    avg_against:n?f.avg_against:null,
    home_record:n?formatRecord(f.home):'–',
    away_record:n?formatRecord(f.away):'–',
    head_to_head_games:null,
    keys_to_game:keys.slice(0,3),
    mans_focus:mans.slice(0,3),
    special_teams:{
      available:false,
      note:'Verifierad PP/PK-data finns ännu inte i D1.'
    },
    data_points:n,
    data_source:'HockeyTech statviewfeed'
  };
}

async function generateAI(env,target,f,a){
  if(!env.OPENAI_API_KEY)return null;

  const prompt=`Du är hockeyanalytiker.
Skriv en kort svensk pre-game-analys inför Brooks Bandits mot ${target.opponent}.
Använd ENDAST verifierade HockeyTech-data nedan.
Hitta inte på statistik, special teams, spelare, skador eller annan information.

Vald match:
${JSON.stringify({
  opponent:target.opponent,
  game_date:target.game_date,
  home_away:target.home_away
})}

Verifierad Form 5:
${JSON.stringify(f)}

Härledda nycklar:
${JSON.stringify(a)}

Om data saknas eller är begränsad ska det framgå tydligt.
Max 120 ord.`;

  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{
      Authorization:`Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'gpt-4.1-mini',
      messages:[{role:'user',content:prompt}],
      temperature:.2,
      max_tokens:220
    })
  });

  if(!r.ok)return null;

  const d=await r.json().catch(()=>null);
  return d?.choices?.[0]?.message?.content?.trim()||null;
}

async function compute(context,id){
  const db=context.env.DB;

  const target=await db.prepare(
    'SELECT id,opponent,game_date,home_away FROM matches WHERE id=? LIMIT 1'
  ).bind(id).first();

  if(!target)throw new Error('Match hittades inte');

  // Production guardrails:
  // - only verified HockeyTech rows
  // - external_id must exist
  // - only games strictly before the selected target match
  const rows=(await db.prepare(`
    SELECT external_id,opponent,game_date,home_away,opponent_name,
           goals_for,goals_against,result,outcome,source
      FROM opponent_games
     WHERE opponent=?
       AND verified=1
       AND source='HockeyTech statviewfeed'
       AND external_id IS NOT NULL
       AND trim(external_id)<>''
       AND game_date < substr(?,1,10)
     ORDER BY game_date DESC, external_id DESC
     LIMIT 5
  `).bind(target.opponent,target.game_date).all()).results||[];

  const f=summarize(rows);
  const a=buildAdvanced(target,f);

  const summary=f.games.length
    ? `${target.opponent} har ${f.wins}-${f.losses}${f.ties?`-${f.ties}`:''} i sina senaste ${f.games.length} verifierade HockeyTech-matcher före den valda matchen. Målsnitt ${f.avg_for} framåt och ${f.avg_against} bakåt.`
    : `Ingen verifierad HockeyTech Form 5-data finns före den valda matchen för ${target.opponent}.`;

  const ai=await generateAI(context.env,target,f,a);

  const home=f.games.length
    ? `Hemma ${a.home_record}, borta ${a.away_record} i Form 5.`
    : 'Ingen verifierad hemma/borta-data ännu.';

  const score=f.games.length
    ? `${f.avg_for} mål framåt / ${f.avg_against} bakåt. Målskillnad ${f.diff>=0?'+':''}${f.diff}.`
    : 'Måltrend saknas ännu.';

  const confidence=Math.min(1,f.games.length/5);

  await db.prepare(`
    INSERT INTO opponent_intel(
      match_id,opponent,generated_at,source,
      form_summary,last_games_json,home_away_summary,
      scoring_summary,ai_summary,confidence,advanced_json
    )
    VALUES(?,?,CURRENT_TIMESTAMP,'HockeyTech E30.6.0',?,?,?,?,?,?,?)
    ON CONFLICT(match_id) DO UPDATE SET
      opponent=excluded.opponent,
      generated_at=CURRENT_TIMESTAMP,
      source=excluded.source,
      form_summary=excluded.form_summary,
      last_games_json=excluded.last_games_json,
      home_away_summary=excluded.home_away_summary,
      scoring_summary=excluded.scoring_summary,
      ai_summary=excluded.ai_summary,
      confidence=excluded.confidence,
      advanced_json=excluded.advanced_json
  `).bind(
    target.id,
    target.opponent,
    summary,
    JSON.stringify(f.games),
    home,
    score,
    ai||summary,
    confidence,
    JSON.stringify(a)
  ).run();

  return {
    match_id:Number(target.id),
    opponent:target.opponent,
    source:'HockeyTech E30.6.0',
    form_summary:summary,
    last_games:f.games,
    home_away_summary:home,
    scoring_summary:score,
    ai_summary:ai||summary,
    confidence,
    advanced:a
  };
}

export async function onRequestGet(context){
  if(!context.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  const u=new URL(context.request.url);
  const id=Number(u.searchParams.get('match_id')||0);

  if(!id){
    return json({ok:false,error:'match_id krävs'},400);
  }

  const target=await context.env.DB.prepare(
    'SELECT id,opponent FROM matches WHERE id=?'
  ).bind(id).first();

  if(!target){
    return json({ok:false,error:'Match hittades inte'},404);
  }

  const cached=await context.env.DB.prepare(
    'SELECT * FROM opponent_intel WHERE match_id=?'
  ).bind(id).first();

  // Cache is valid only if it belongs to this exact match/opponent
  // AND was generated by the production HockeyTech intelligence version.
  if(
    cached &&
    Number(cached.match_id)===Number(target.id) &&
    String(cached.opponent||'')===String(target.opponent||'') &&
    String(cached.source||'')==='HockeyTech E30.6.0' &&
    cached.advanced_json
  ){
    return json({
      ok:true,
      cached:true,
      item:{
        ...cached,
        match_id:Number(cached.match_id),
        last_games:safeParse(cached.last_games_json,[]),
        advanced:safeParse(cached.advanced_json,{})
      }
    });
  }

  if(cached){
    await context.env.DB.prepare(
      'DELETE FROM opponent_intel WHERE match_id=?'
    ).bind(id).run();
  }

  try{
    return json({
      ok:true,
      cached:false,
      item:await compute(context,id)
    });
  }catch(e){
    return json({ok:false,error:String(e)},500);
  }
}

export async function onRequestPost(context){
  const user=await requireUser(context);
  if(!user){
    return json({ok:false,error:'Unauthorized'},401);
  }

  try{
    const b=await context.request.json();
    const id=Number(b?.match_id||0);

    if(!id){
      return json({ok:false,error:'match_id krävs'},400);
    }

    return json({
      ok:true,
      item:await compute(context,id)
    });
  }catch(e){
    return json({ok:false,error:String(e)},500);
  }
}
