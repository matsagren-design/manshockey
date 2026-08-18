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
        'user-agent':'Mozilla/5.0 MansHockey/30.7.0',
        'accept':'application/json,text/javascript,*/*;q=0.8',
        'referer':'https://bchl.ca/'
      },
      signal:ctl.signal
    });

    return {
      ok:r.ok,
      status:r.status,
      content_type:r.headers.get('content-type')||'',
      body:await r.text()
    };
  }catch(err){
    return {
      ok:false,
      status:0,
      content_type:'',
      body:'',
      error:String(err)
    };
  }finally{
    clearTimeout(timer);
  }
}

function parsePayload(raw){
  const text=String(raw||'').trim();
  if(!text)return {ok:false,error:'empty body',data:null};

  try{
    return {ok:true,format:'json',data:JSON.parse(text)};
  }catch{}

  if(text.startsWith('(')&&text.endsWith(')')){
    const inner=text.slice(1,-1).trim();
    try{
      return {ok:true,format:'parenthesized-json',data:JSON.parse(inner)};
    }catch{}
  }

  const first=text.indexOf('(');
  const last=text.lastIndexOf(')');
  if(first>0&&last>first){
    const inner=text.slice(first+1,last).trim();
    try{
      return {ok:true,format:'jsonp',data:JSON.parse(inner)};
    }catch{}
  }

  return {
    ok:false,
    error:'not JSON/parenthesized-JSON/JSONP',
    data:null,
    preview:cleanSpace(text).slice(0,500)
  };
}

async function fetchPayload(url){
  const r=await fetchText(url);
  if(!r.ok){
    return {
      ok:false,
      url,
      status:r.status,
      content_type:r.content_type,
      body_chars:r.body.length,
      error:r.error||`HTTP ${r.status}`
    };
  }

  const p=parsePayload(r.body);

  return {
    ok:p.ok,
    url,
    status:r.status,
    content_type:r.content_type,
    body_chars:r.body.length,
    format:p.format||null,
    data:p.data||null,
    error:p.error||null,
    preview:p.preview||null
  };
}

function summarizeObject(v){
  if(v===null||v===undefined)return v;
  if(typeof v!=='object')return v;
  if(Array.isArray(v))return {array_length:v.length};

  const out={};
  for(const [k,val] of Object.entries(v).slice(0,40)){
    if(val===null||['string','number','boolean'].includes(typeof val)){
      out[k]=typeof val==='string'?val.slice(0,220):val;
    }else if(Array.isArray(val)){
      out[k]={array_length:val.length};
    }else{
      out[k]={object:true};
    }
  }
  return out;
}

function collectObjects(obj,path='$',out=[]){
  if(out.length>=200)return out;

  if(Array.isArray(obj)){
    for(let i=0;i<obj.length;i++){
      if(obj[i]&&typeof obj[i]==='object'){
        out.push({path:`${path}[${i}]`,value:obj[i]});
        collectObjects(obj[i],`${path}[${i}]`,out);
      }
    }
    return out;
  }

  if(obj&&typeof obj==='object'){
    for(const [k,v] of Object.entries(obj)){
      if(v&&typeof v==='object'){
        out.push({path:`${path}.${k}`,value:v});
        collectObjects(v,`${path}.${k}`,out);
      }
    }
  }

  return out;
}

function findCandidates(obj,terms){
  const lowerTerms=terms.map(x=>x.toLowerCase());
  const hits=[];

  for(const item of collectObjects(obj)){
    const value=item.value;
    const text=JSON.stringify(value).toLowerCase();

    if(lowerTerms.some(t=>text.includes(t))){
      hits.push({
        path:item.path,
        sample:summarizeObject(value)
      });
    }

    if(hits.length>=30)break;
  }

  return hits;
}

function numberOrNull(v){
  if(v===null||v===undefined||v===''||v==='-')return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function teamNameMatch(a,b){
  const x=canonical(a),y=canonical(b);
  if(!x||!y)return false;
  return x===y||x.includes(y)||y.includes(x);
}

async function getTarget(db,matchId){
  return await db.prepare(`
    SELECT id,opponent,game_date,season_type,home_away
      FROM matches
     WHERE id=?
     LIMIT 1
  `).bind(matchId).first();
}

async function getRecentVerifiedGames(db,opponent,targetDate){
  return (await db.prepare(`
    SELECT external_id,game_date,home_away,opponent_name,
           goals_for,goals_against,result,outcome,source
      FROM opponent_games
     WHERE opponent=?
       AND verified=1
       AND source='HockeyTech statviewfeed'
       AND external_id IS NOT NULL
       AND trim(external_id)<>''
       AND game_date < substr(?,1,10)
     ORDER BY game_date DESC
     LIMIT 5
  `).bind(opponent,targetDate).all()).results||[];
}

async function bootstrap(){
  return await fetchPayload(safeUrl(`${PROD_URL}/feed/index.php`,{
    ...commonParams(),
    view:'bootstrap',
    season:'latest',
    page:'schedule',
    page_name:'schedule',
    division:-1,
    conference:-1
  }));
}

function chooseSeasonId(boot,target){
  const seasons=Array.isArray(boot?.seasons)?boot.seasons:[];
  const year=new Date(target.game_date).getUTCFullYear();
  const exhibition=String(target.season_type||'').toLowerCase().includes('exhibition');

  const exact=seasons.find(s=>{
    const name=String(s.name||'').toLowerCase();
    return name.includes(String(year)) &&
      (exhibition?name.includes('exhibition'):name.includes('regular season'));
  });

  return exact?.id || boot?.current_season_id || null;
}

function extractTeamsFromBootstrap(boot){
  const hits=findCandidates(boot,['team','abbreviation','nickname','city']);
  const teams=[];

  function walk(v){
    if(Array.isArray(v)){
      for(const x of v)walk(x);
      return;
    }

    if(!v||typeof v!=='object')return;

    const id=v.id??v.team_id??v.teamId;
    const name=v.name??v.team_name??v.teamName;
    const city=v.city??v.team_city??v.teamCity;
    const abbr=v.abbreviation??v.code??v.team_code;

    if(id!==undefined&&(name||city||abbr)){
      teams.push({
        id:String(id),
        name:name||'',
        city:city||'',
        abbreviation:abbr||''
      });
    }

    for(const x of Object.values(v)){
      if(x&&typeof x==='object')walk(x);
    }
  }

  walk(boot);

  const seen=new Set();
  return teams.filter(t=>{
    const key=`${t.id}|${t.name}|${t.city}|${t.abbreviation}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function resolveTeam(teams,targetName){
  return teams.find(t=>
    teamNameMatch(t.name,targetName)||
    teamNameMatch(t.city,targetName)||
    teamNameMatch(`${t.city} ${t.name}`,targetName)
  )||null;
}

function likelyStatViews(){
  return [
    'teamstats',
    'team-stats',
    'team_stats',
    'team',
    'standings',
    'specialteams',
    'special-teams',
    'special_teams'
  ];
}

async function probeTeamStats(seasonId,teamId){
  const results=[];

  for(const view of likelyStatViews()){
    const url=safeUrl(`${PROD_URL}/feed/index.php`,{
      ...commonParams(),
      view,
      season:seasonId,
      season_id:seasonId,
      team:teamId,
      team_id:teamId,
      location:'all'
    });

    const r=await fetchPayload(url);

    results.push({
      view,
      url,
      status:r.status,
      parse_ok:r.ok,
      format:r.format||null,
      body_chars:r.body_chars,
      error:r.error||null,
      candidates:r.ok
        ? findCandidates(r.data,[
            'power play','powerplay','pp%',
            'penalty kill','penaltykill','pk%',
            'power_play','penalty_kill',
            'short handed','shorthanded'
          ]).slice(0,15)
        : []
    });
  }

  return results;
}

function summarizeGamePayload(data){
  const candidates=findCandidates(data,[
    'powerplay','power play','penalty',
    'shots','period','goals','homeTeam',
    'visitingTeam','gameStatus'
  ]).slice(0,25);

  return {
    top_level:summarizeObject(data),
    candidates
  };
}

async function probeGame(gameId){
  const views=['gameSummary','game-summary','gamesummary','game','gamecenter'];

  const results=[];

  for(const view of views){
    const url=safeUrl(`${PROD_URL}/feed/index.php`,{
      ...commonParams(),
      view,
      game_id:gameId,
      game:gameId
    });

    const r=await fetchPayload(url);

    results.push({
      view,
      url,
      status:r.status,
      parse_ok:r.ok,
      format:r.format||null,
      body_chars:r.body_chars,
      error:r.error||null,
      summary:r.ok?summarizeGamePayload(r.data):null
    });
  }

  return results;
}

function h2hFromD1(rows,opponent){
  const games=rows.filter(r=>teamNameMatch(r.opponent_name,'Brooks Bandits'));

  let wins=0,losses=0,ties=0,gf=0,ga=0;

  for(const g of games){
    if(g.outcome==='W')wins++;
    else if(g.outcome==='L')losses++;
    else ties++;

    gf+=Number(g.goals_for||0);
    ga+=Number(g.goals_against||0);
  }

  return {
    source:'current verified opponent_games only',
    games:games.length,
    wins,losses,ties,
    goals_for:gf,
    goals_against:ga,
    individual_games:games
  };
}

async function runProbe(db,matchId){
  const target=await getTarget(db,matchId);
  if(!target)throw new Error('Match hittades inte');

  const recent=await getRecentVerifiedGames(db,target.opponent,target.game_date);

  const bootRes=await bootstrap();
  if(!bootRes.ok){
    throw new Error(`Bootstrap misslyckades: ${bootRes.error||bootRes.status}`);
  }

  const boot=bootRes.data||{};
  const seasonId=chooseSeasonId(boot,target);

  const teams=extractTeamsFromBootstrap(boot);
  const targetTeam=resolveTeam(teams,target.opponent);
  const brooksTeam=resolveTeam(teams,'Brooks Bandits');

  const teamStats=targetTeam?.id && seasonId
    ? await probeTeamStats(seasonId,targetTeam.id)
    : [];

  const gameProbes=[];
  for(const g of recent.slice(0,2)){
    if(!g.external_id)continue;
    gameProbes.push({
      game_id:String(g.external_id),
      opponent:g.opponent_name,
      date:g.game_date,
      probes:await probeGame(String(g.external_id))
    });
  }

  return {
    ok:true,
    version:'E30.7.0',
    mode:'advanced intelligence probe',
    strategy:'read-only HockeyTech probing for team special teams + game detail endpoints; no D1 writes',
    target:{
      match_id:Number(target.id),
      opponent:target.opponent,
      game_date:target.game_date,
      season_type:target.season_type,
      home_away:target.home_away
    },
    resolved:{
      season_id:seasonId,
      opponent_team:targetTeam,
      brooks_team:brooksTeam
    },
    current_h2h_from_d1:h2hFromD1(recent,target.opponent),
    team_stat_probes:teamStats,
    game_detail_probes:gameProbes
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
    return json(await runProbe(c.env.DB,matchId));
  }catch(e){
    return json({
      ok:false,
      version:'E30.7.0',
      error:String(e)
    },500);
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
    return json(await runProbe(c.env.DB,matchId));
  }catch(e){
    return json({
      ok:false,
      version:'E30.7.0',
      error:String(e)
    },500);
  }
}
