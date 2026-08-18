function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function auth(req,env){
  return !!env.SYNC_TOKEN &&
    (req.headers.get('authorization')||'')===`Bearer ${env.SYNC_TOKEN}`;
}

const PROD_URL='https://lscluster.hockeytech.com';
const APP_KEY='f3ed30007ad2124e';
const CLIENT_CODE='bchl';
const SITE_ID=0;

function cleanSpace(s){
  return String(s||'').replace(/\s+/g,' ').trim();
}

function canonical(s){
  return cleanSpace(s).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim();
}

function safeUrl(base,params){
  const u=new URL(base);
  for(const [k,v] of Object.entries(params||{})){
    if(v===undefined||v===null||v==='')continue;
    u.searchParams.set(k,String(v));
  }
  return u.toString();
}

function commonParams(){
  return {
    feed:'statviewfeed',
    key:APP_KEY,
    client_code:CLIENT_CODE,
    site_id:SITE_ID,
    lang:'en',
    fmt:'json'
  };
}

async function fetchText(url,timeout=15000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeout);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.7.1',
        'accept':'application/json,text/javascript,*/*;q=0.8',
        'referer':'https://bchl.ca/'
      },
      signal:ctl.signal
    });

    return {
      ok:r.ok,
      status:r.status,
      body:await r.text()
    };
  }catch(err){
    return {ok:false,status:0,body:'',error:String(err)};
  }finally{
    clearTimeout(timer);
  }
}

function parsePayload(raw){
  const text=String(raw||'').trim();
  if(!text)return {ok:false,error:'empty body'};

  try{
    return {ok:true,format:'json',data:JSON.parse(text)};
  }catch{}

  if(text.startsWith('(')&&text.endsWith(')')){
    try{
      return {
        ok:true,
        format:'parenthesized-json',
        data:JSON.parse(text.slice(1,-1).trim())
      };
    }catch{}
  }

  const first=text.indexOf('(');
  const last=text.lastIndexOf(')');
  if(first>0&&last>first){
    try{
      return {
        ok:true,
        format:'jsonp',
        data:JSON.parse(text.slice(first+1,last).trim())
      };
    }catch{}
  }

  return {
    ok:false,
    error:'not JSON/parenthesized-JSON/JSONP',
    preview:cleanSpace(text).slice(0,400)
  };
}

async function fetchPayload(url){
  const r=await fetchText(url);
  if(!r.ok)throw new Error(`HockeyTech HTTP ${r.status}`);

  const p=parsePayload(r.body);
  if(!p.ok)throw new Error(`HockeyTech parse error: ${p.error}; ${p.preview||''}`);
  return p.data;
}

function n(v){
  if(v===null||v===undefined||v===''||v==='-')return null;
  const x=Number(v);
  return Number.isFinite(x)?x:null;
}

function pct(num,den){
  if(!den)return null;
  return Number((100*num/den).toFixed(1));
}

function avg(num,den){
  if(!den)return null;
  return Number((num/den).toFixed(1));
}

function sameTeam(name,target){
  const a=canonical(name);
  const b=canonical(target);
  if(!a||!b)return false;
  return a===b||a.includes(b)||b.includes(a);
}

async function targetMatch(db,matchId){
  return await db.prepare(`
    SELECT id,opponent,game_date,season_type,home_away
      FROM matches
     WHERE id=?
     LIMIT 1
  `).bind(matchId).first();
}

async function recentGames(db,target){
  return (await db.prepare(`
    SELECT external_id,game_date,home_away,opponent_name,
           goals_for,goals_against,result,outcome
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
}

async function gameSummary(gameId){
  const url=safeUrl(`${PROD_URL}/feed/index.php`,{
    ...commonParams(),
    view:'gameSummary',
    game_id:gameId
  });

  return {
    url,
    data:await fetchPayload(url)
  };
}

function teamName(team){
  return team?.info?.name ||
    cleanSpace(`${team?.info?.city||''} ${team?.info?.nickname||''}`) ||
    team?.info?.abbreviation ||
    '';
}

function readTeamStats(team){
  const s=team?.stats||{};
  return {
    shots:n(s.shots),
    goals:n(s.goals??s.goalCount),
    pp_goals:n(s.powerPlayGoals),
    pp_opportunities:n(s.powerPlayOpportunities),
    pim:n(s.penaltyMinuteCount),
    infractions:n(s.infractionCount),
    faceoff_attempts:n(s.faceoffAttempts),
    faceoff_wins:n(s.faceoffWins),
    faceoff_pct:n(s.faceoffWinPercentage)
  };
}

function periodNo(p,index){
  return n(
    p?.id ??
    p?.period ??
    p?.periodNumber ??
    p?.period_number ??
    p?.number ??
    (index+1)
  );
}

function firstNum(obj,names){
  for(const name of names){
    const v=n(obj?.[name]);
    if(v!==null)return v;
  }
  return null;
}

function readPeriodScore(p,index,isHome){
  if(!p||typeof p!=='object')return null;

  const home=firstNum(p,[
    'homeGoalCount','homeGoals','home_goals','homeScore','home_score'
  ]);
  const away=firstNum(p,[
    'visitingGoalCount','visitingGoals','visiting_goals',
    'awayGoalCount','awayGoals','away_goals','awayScore','away_score'
  ]);

  if(home===null||away===null)return null;

  return {
    period:periodNo(p,index),
    gf:isHome?home:away,
    ga:isHome?away:home
  };
}

function resolveSides(data,targetName){
  const home=data?.homeTeam||null;
  const away=data?.visitingTeam||data?.awayTeam||null;

  const homeName=teamName(home);
  const awayName=teamName(away);

  if(sameTeam(homeName,targetName)){
    return {
      is_home:true,
      target:home,
      opponent:away,
      target_name:homeName,
      opponent_name:awayName
    };
  }

  if(sameTeam(awayName,targetName)){
    return {
      is_home:false,
      target:away,
      opponent:home,
      target_name:awayName,
      opponent_name:homeName
    };
  }

  return null;
}

function normalizeGame(row,summary){
  const sides=resolveSides(summary.data,row.target_name);
  if(!sides){
    return {
      game_id:String(row.external_id),
      date:row.game_date,
      complete:false,
      error:'Target team could not be resolved in gameSummary'
    };
  }

  const tf=readTeamStats(sides.target);
  const of=readTeamStats(sides.opponent);

  const periods=Array.isArray(summary.data?.periods)
    ? summary.data.periods
        .map((p,i)=>readPeriodScore(p,i,sides.is_home))
        .filter(Boolean)
    : [];

  const coreComplete=[
    tf.shots,tf.pp_goals,tf.pp_opportunities,tf.pim,tf.infractions,
    of.shots,of.pp_goals,of.pp_opportunities
  ].every(v=>v!==null);

  return {
    game_id:String(row.external_id),
    date:row.game_date,
    venue:sides.is_home?'Home':'Away',
    opponent:sides.opponent_name||row.opponent_name,
    result:row.result,
    outcome:row.outcome,
    source_url:summary.url,
    complete:coreComplete,
    team:{
      shots:tf.shots,
      goals:tf.goals,
      pp_goals:tf.pp_goals,
      pp_opportunities:tf.pp_opportunities,
      pim:tf.pim,
      infractions:tf.infractions,
      faceoff_attempts:tf.faceoff_attempts,
      faceoff_wins:tf.faceoff_wins,
      faceoff_pct:tf.faceoff_pct
    },
    opponent_stats:{
      shots:of.shots,
      goals:of.goals,
      pp_goals:of.pp_goals,
      pp_opportunities:of.pp_opportunities
    },
    periods,
    period_data_complete:periods.length>0
  };
}

function aggregate(games){
  const complete=games.filter(g=>g.complete);

  let shotsFor=0,shotsAgainst=0;
  let ppGoals=0,ppOpps=0;
  let oppPpGoals=0,oppPpOpps=0;
  let pim=0,infractions=0;

  const periodMap=new Map();

  for(const g of complete){
    shotsFor+=g.team.shots||0;
    shotsAgainst+=g.opponent_stats.shots||0;
    ppGoals+=g.team.pp_goals||0;
    ppOpps+=g.team.pp_opportunities||0;
    oppPpGoals+=g.opponent_stats.pp_goals||0;
    oppPpOpps+=g.opponent_stats.pp_opportunities||0;
    pim+=g.team.pim||0;
    infractions+=g.team.infractions||0;

    for(const p of g.periods||[]){
      const key=String(p.period);
      const cur=periodMap.get(key)||{period:p.period,gf:0,ga:0,games:0};
      cur.gf+=p.gf;
      cur.ga+=p.ga;
      cur.games++;
      periodMap.set(key,cur);
    }
  }

  const pkStops=Math.max(0,oppPpOpps-oppPpGoals);

  return {
    games_requested:games.length,
    games_complete:complete.length,
    confidence:games.length?Number((complete.length/games.length).toFixed(2)):0,

    shots:{
      for_total:shotsFor,
      against_total:shotsAgainst,
      for_per_game:avg(shotsFor,complete.length),
      against_per_game:avg(shotsAgainst,complete.length),
      differential_per_game:complete.length
        ? Number(((shotsFor-shotsAgainst)/complete.length).toFixed(1))
        : null
    },

    power_play:{
      goals:ppGoals,
      opportunities:ppOpps,
      pct:pct(ppGoals,ppOpps)
    },

    penalty_kill:{
      goals_against:oppPpGoals,
      opportunities:oppPpOpps,
      kills:pkStops,
      pct:pct(pkStops,oppPpOpps)
    },

    discipline:{
      pim_total:pim,
      pim_per_game:avg(pim,complete.length),
      infractions_total:infractions,
      infractions_per_game:avg(infractions,complete.length)
    },

    periods:[...periodMap.values()]
      .sort((a,b)=>Number(a.period)-Number(b.period))
      .map(p=>({
        ...p,
        gf_per_game:avg(p.gf,p.games),
        ga_per_game:avg(p.ga,p.games)
      })),

    notes:{
      pp:'PP% = powerPlayGoals / powerPlayOpportunities from HockeyTech gameSummary.',
      pk:'PK% = opponent PP opportunities successfully killed / opponent PP opportunities.',
      periods:periodMap.size
        ? 'Period scoring was available in gameSummary.'
        : 'Period objects existed but usable period goal totals were not detected.'
    }
  };
}

async function save(db,target,games,summary){
  await db.prepare(`
    INSERT INTO opponent_advanced(
      match_id,opponent,generated_at,source,
      games_requested,games_complete,confidence,
      summary_json,games_json
    )
    VALUES(?,?,CURRENT_TIMESTAMP,'HockeyTech gameSummary',?,?,?,?,?)
    ON CONFLICT(match_id) DO UPDATE SET
      opponent=excluded.opponent,
      generated_at=CURRENT_TIMESTAMP,
      source='HockeyTech gameSummary',
      games_requested=excluded.games_requested,
      games_complete=excluded.games_complete,
      confidence=excluded.confidence,
      summary_json=excluded.summary_json,
      games_json=excluded.games_json
  `).bind(
    target.id,
    target.opponent,
    summary.games_requested,
    summary.games_complete,
    summary.confidence,
    JSON.stringify(summary),
    JSON.stringify(games)
  ).run();
}

async function compute(db,matchId){
  const target=await targetMatch(db,matchId);
  if(!target)throw new Error('Match hittades inte');

  const rows=await recentGames(db,target);
  const games=[];

  for(const row of rows){
    try{
      const gs=await gameSummary(row.external_id);
      games.push(normalizeGame({
        ...row,
        target_name:target.opponent
      },gs));
    }catch(e){
      games.push({
        game_id:String(row.external_id),
        date:row.game_date,
        complete:false,
        error:String(e)
      });
    }
  }

  const summary=aggregate(games);
  await save(db,target,games,summary);

  return {
    ok:true,
    version:'E30.7.1',
    mode:'advanced Form 5',
    match_id:Number(target.id),
    opponent:target.opponent,
    target_date:String(target.game_date).slice(0,10),
    source:'HockeyTech gameSummary',
    summary,
    games
  };
}

export async function onRequestGet(c){
  if(!auth(c.request,c.env)){
    return json({ok:false,error:'Unauthorized'},401);
  }

  if(!c.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  const u=new URL(c.request.url);
  const matchId=Number(u.searchParams.get('match_id')||4);

  try{
    return json(await compute(c.env.DB,matchId));
  }catch(e){
    return json({ok:false,version:'E30.7.1',error:String(e)},500);
  }
}

export async function onRequestPost(c){
  if(!auth(c.request,c.env)){
    return json({ok:false,error:'Unauthorized'},401);
  }

  if(!c.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  try{
    const body=await c.request.json().catch(()=>({}));
    const matchId=Number(body?.match_id||4);
    return json(await compute(c.env.DB,matchId));
  }catch(e){
    return json({ok:false,version:'E30.7.1',error:String(e)},500);
  }
}
