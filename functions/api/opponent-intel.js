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
      hw+=w?1:0; hl+=l?1:0; ht+=t?1:0;
    }else{
      aw+=w?1:0; al+=l?1:0; at+=t?1:0;
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
  return r.ties?`${r.wins}-${r.losses}-${r.ties}`:`${r.wins}-${r.losses}`;
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
      keys.push(`Attackera målområdet konsekvent – ${target.opponent} har släppt in ${f.avg_against} mål/match i Form 5.`);
    }else if(f.avg_against>=3){
      keys.push(`Skapa trafik och andrachanser – ${target.opponent} har släppt in ${f.avg_against} mål/match i Form 5.`);
    }else{
      keys.push(`Ha tålamod offensivt och skapa skymning – ${target.opponent} har släppt in ${f.avg_against} mål/match i Form 5.`);
    }

    if(f.diff>0){
      keys.push(`Undvik gratisomställningar – ${target.opponent} har målskillnad +${f.diff} i Form 5.`);
    }else if(f.diff<0){
      keys.push(`Tryck på direkt efter puckvinst – ${target.opponent} har målskillnad ${f.diff} i Form 5.`);
    }else{
      keys.push(`${target.opponent} har jämn målskillnad i Form 5 – vinn detaljerna i fem-mot-fem.`);
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
    data_points:n,
    data_source:'HockeyTech statviewfeed'
  };
}

function advancedTacticalNotes(target,advancedSummary){
  const notes=[];
  if(!advancedSummary)return notes;

  const pp=advancedSummary.power_play||{};
  const pk=advancedSummary.penalty_kill||{};
  const shots=advancedSummary.shots||{};
  const discipline=advancedSummary.discipline||{};

  if(pp.pct!==null&&pp.pct!==undefined){
    if(pp.pct>=25)notes.push(`${target.opponent} har ett starkt Form 5-powerplay på ${pp.pct}%. Undvik onödiga utvisningar.`);
    else if(pp.pct<=12)notes.push(`${target.opponent} har haft ett svagt Form 5-powerplay på ${pp.pct}%. Spela aggressivt men disciplinerat i boxplay.`);
  }

  if(pk.pct!==null&&pk.pct!==undefined){
    if(pk.pct<=75)notes.push(`Deras Form 5-boxplay är ${pk.pct}%. Brooks bör attackera med trafik, returer och snabba puckförflyttningar.`);
    else if(pk.pct>=88)notes.push(`Deras Form 5-boxplay är starkt på ${pk.pct}%. Brooks behöver vinna tekningar och skapa andrachanser.`);
  }

  if(shots.for_per_game!==null&&shots.for_per_game!==undefined){
    if(shots.for_per_game>=32)notes.push(`${target.opponent} producerar ${shots.for_per_game} skott/match i Form 5. Begränsa pucktid och andravåg.`);
  }

  if(discipline.pim_per_game!==null&&discipline.pim_per_game!==undefined){
    if(discipline.pim_per_game>=12)notes.push(`${target.opponent} tar ${discipline.pim_per_game} PIM/match i Form 5. Håll tryck och tvinga fram försvarsaktioner.`);
  }

  return notes.slice(0,3);
}

async function generateAI(env,target,f,a,advancedSummary){
  if(!env.OPENAI_API_KEY)return null;

  const prompt=`Du är hockeyanalytiker och skriver på svenska.

MATCH:
Brooks Bandits möter ${target.opponent}.

VIKTIG BINDNINGSREGEL:
ALL statistik nedan gäller ENDAST ${target.opponent}.
Den gäller INTE Brooks Bandits.
Brooks är laget som ska anpassa sin taktik utifrån motståndarens siffror.

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

Verifierad Advanced Form 5 från HockeyTech gameSummary:
${JSON.stringify(advancedSummary||null)}

Skriv en kort pre-game-analys, max 140 ord.
Om advanced-data saknas ska du inte låtsas att den finns.`;

  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{
      Authorization:`Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'gpt-4.1-mini',
      messages:[
        {
          role:'system',
          content:'Du är en noggrann hockeyanalytiker. Blanda aldrig ihop motståndarens statistik med Brooks Bandits statistik.'
        },
        {role:'user',content:prompt}
      ],
      temperature:.1,
      max_tokens:260
    })
  });

  if(!r.ok)return null;
  const d=await r.json().catch(()=>null);
  return d?.choices?.[0]?.message?.content?.trim()||null;
}

async function loadAdvanced(db,matchId){
  const row=await db.prepare(`
    SELECT match_id,opponent,generated_at,source,
           games_requested,games_complete,confidence,
           summary_json,games_json
      FROM opponent_advanced
     WHERE match_id=?
     LIMIT 1
  `).bind(matchId).first();

  if(!row)return null;

  return {
    match_id:Number(row.match_id),
    opponent:row.opponent,
    generated_at:row.generated_at,
    source:row.source,
    games_requested:Number(row.games_requested||0),
    games_complete:Number(row.games_complete||0),
    confidence:Number(row.confidence||0),
    summary:safeParse(row.summary_json,{}),
    games:safeParse(row.games_json,[])
  };
}

async function compute(context,id){
  const db=context.env.DB;

  const target=await db.prepare(
    'SELECT id,opponent,game_date,home_away FROM matches WHERE id=? LIMIT 1'
  ).bind(id).first();

  if(!target)throw new Error('Match hittades inte');

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
  const adv=await loadAdvanced(db,id);

  const advValid=
    adv &&
    String(adv.opponent||'')===String(target.opponent||'') &&
    adv.games_complete>0;

  const advancedSummary=advValid?adv.summary:null;
  const tactical=advancedTacticalNotes(target,advancedSummary);

  const summary=f.games.length
    ? `${target.opponent} har ${f.wins}-${f.losses}${f.ties?`-${f.ties}`:''} i sina senaste ${f.games.length} verifierade HockeyTech-matcher före den valda matchen. ${target.opponent} gör ${f.avg_for} mål/match och släpper in ${f.avg_against}.`
    : `Ingen verifierad HockeyTech Form 5-data finns före den valda matchen för ${target.opponent}.`;

  const ai=await generateAI(context.env,target,f,a,advancedSummary);

  const home=f.games.length
    ? `${target.opponent}: hemma ${a.home_record}, borta ${a.away_record} i Form 5.`
    : 'Ingen verifierad hemma/borta-data ännu.';

  const score=f.games.length
    ? `${target.opponent}: ${f.avg_for} mål framåt / ${f.avg_against} bakåt. Målskillnad ${f.diff>=0?'+':''}${f.diff}.`
    : 'Måltrend saknas ännu.';

  const confidence=Math.min(1,f.games.length/5);

  const mergedAdvanced={
    ...a,
    special_teams:advancedSummary
      ? {
          available:true,
          power_play:advancedSummary.power_play||null,
          penalty_kill:advancedSummary.penalty_kill||null,
          confidence:adv.confidence,
          games_complete:adv.games_complete,
          games_requested:adv.games_requested
        }
      : {
          available:false,
          note:'Advanced Form 5-data saknas ännu för vald match.'
        },
    shots:advancedSummary?.shots||null,
    discipline:advancedSummary?.discipline||null,
    periods:advancedSummary?.periods||[],
    advanced_confidence:advValid?adv.confidence:0,
    advanced_games_complete:advValid?adv.games_complete:0,
    tactical_notes:tactical
  };

  await db.prepare(`
    INSERT INTO opponent_intel(
      match_id,opponent,generated_at,source,
      form_summary,last_games_json,home_away_summary,
      scoring_summary,ai_summary,confidence,advanced_json
    )
    VALUES(?,?,CURRENT_TIMESTAMP,'HockeyTech E30.7.2',?,?,?,?,?,?,?)
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
    JSON.stringify(mergedAdvanced)
  ).run();

  return {
    match_id:Number(target.id),
    opponent:target.opponent,
    source:'HockeyTech E30.7.2',
    form_summary:summary,
    last_games:f.games,
    home_away_summary:home,
    scoring_summary:score,
    ai_summary:ai||summary,
    confidence,
    form5:a.form5,
    record:a.record,
    home_record:a.home_record,
    away_record:a.away_record,
    gf:a.gf,
    ga:a.ga,
    diff:a.diff,
    avg_for:a.avg_for,
    avg_against:a.avg_against,
    data_points:a.data_points,
    advanced:mergedAdvanced
  };
}

export async function onRequestGet(context){
  if(!context.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  const u=new URL(context.request.url);
  const id=Number(u.searchParams.get('match_id')||0);
  if(!id)return json({ok:false,error:'match_id krävs'},400);

  const target=await context.env.DB.prepare(
    'SELECT id,opponent FROM matches WHERE id=?'
  ).bind(id).first();

  if(!target)return json({ok:false,error:'Match hittades inte'},404);

  const cached=await context.env.DB.prepare(
    'SELECT * FROM opponent_intel WHERE match_id=?'
  ).bind(id).first();

  if(
    cached &&
    Number(cached.match_id)===Number(target.id) &&
    String(cached.opponent||'')===String(target.opponent||'') &&
    String(cached.source||'')==='HockeyTech E30.7.2' &&
    cached.advanced_json
  ){
    const advanced=safeParse(cached.advanced_json,{});
    return json({
      ok:true,
      cached:true,
      item:{
        ...cached,
        match_id:Number(cached.match_id),
        last_games:safeParse(cached.last_games_json,[]),
        advanced,
        form5:advanced.form5||'–',
        record:advanced.record||'–',
        home_record:advanced.home_record||'–',
        away_record:advanced.away_record||'–',
        gf:advanced.gf??null,
        ga:advanced.ga??null,
        diff:advanced.diff??null,
        avg_for:advanced.avg_for??null,
        avg_against:advanced.avg_against??null,
        data_points:advanced.data_points||0
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
  if(!user)return json({ok:false,error:'Unauthorized'},401);

  try{
    const b=await context.request.json();
    const id=Number(b?.match_id||0);
    if(!id)return json({ok:false,error:'match_id krävs'},400);

    return json({
      ok:true,
      item:await compute(context,id)
    });
  }catch(e){
    return json({ok:false,error:String(e)},500);
  }
}
