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

const TEAM_CODES={
  "Spruce Grove Saints":"SGS",
  "Okotoks Oilers":"OKO",
  "Blackfalds Bulldogs":"BFB",
  "Sherwood Park Crusaders":"SPC",
  "Alberni Valley Bulldogs":"AV",
  "Cowichan Valley Capitals":"CV",
  "Brooks Bandits":"BRK",
  "Cranbrook Bucks":"CRA",
  "West Kelowna Warriors":"WK",
  "Salmon Arm Silverbacks":"SA",
  "Vernon Vipers":"VER",
  "Trail Smoke Eaters":"TRA",
  "Surrey Eagles":"SUR",
  "Coquitlam Express":"COQ",
  "Chilliwack Chiefs":"CHW",
  "Langley Rivermen":"LAN",
  "Nanaimo Clippers":"NAN",
  "Victoria Grizzlies":"VIC",
  "Prince George Spruce Kings":"PG",
  "Powell River Kings":"PR"
};

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

async function fetchText(url,timeout=15000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeout);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.5.9',
        'accept':'application/json,text/javascript,*/*;q=0.8',
        'referer':'https://bchl.ca/'
      },
      signal:ctl.signal
    });

    const body=await r.text();

    return {
      ok:r.ok,
      status:r.status,
      content_type:r.headers.get('content-type')||'',
      body
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

  if(text.startsWith('(') && text.endsWith(')')){
    const inner=text.slice(1,-1).trim();
    try{
      return {ok:true,format:'parenthesized-json',data:JSON.parse(inner)};
    }catch{}
  }

  const first=text.indexOf('(');
  const last=text.lastIndexOf(')');
  if(first>0 && last>first){
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
    throw new Error(`HockeyTech HTTP ${r.status} for ${url}`);
  }

  const p=parsePayload(r.body);
  if(!p.ok){
    throw new Error(`HockeyTech parse error for ${url}: ${p.error}; ${p.preview||''}`);
  }

  return p.data;
}

async function targets(db){
  const r=(await db.prepare(`
    SELECT id,opponent,game_date,season_type,home_away
      FROM matches
     WHERE game_date>=datetime('now')
       AND opponent IS NOT NULL
       AND trim(opponent)<>''
     ORDER BY game_date
     LIMIT 18
  `).all()).results||[];

  const seen=new Set();
  const out=[];

  for(const x of r){
    if(seen.has(x.opponent))continue;
    seen.add(x.opponent);

    out.push({
      match_id:Number(x.id),
      opponent:x.opponent,
      game_date:x.game_date,
      season_type:x.season_type||'',
      home_away:x.home_away||''
    });

    if(out.length>=6)break;
  }

  return out;
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

async function bootstrap(){
  const url=safeUrl(`${PROD_URL}/feed/index.php`,{
    ...commonParams(),
    view:'bootstrap',
    season:'latest',
    page:'schedule',
    page_name:'schedule',
    division:-1,
    conference:-1
  });

  return await fetchPayload(url);
}

function seasonKind(name){
  const n=String(name||'').toLowerCase();
  if(n.includes('exhibition'))return 'exhibition';
  if(n.includes('regular season'))return 'regular';
  if(n.includes('playoff'))return 'playoffs';
  return 'other';
}

function seasonYear(name,startDate){
  const m=String(name||'').match(/\b(20\d{2})\b/);
  if(m)return Number(m[1]);
  const d=String(startDate||'').slice(0,4);
  return /^\d{4}$/.test(d)?Number(d):0;
}

function chooseSeasonIds(boot,target){
  const seasons=Array.isArray(boot?.seasons)?boot.seasons:[];
  const targetDate=new Date(target.game_date);
  const targetYear=targetDate.getUTCFullYear();
  const wantedKind=String(target.season_type||'').toLowerCase().includes('exhibition')
    ? 'exhibition'
    : 'regular';

  const normalized=seasons.map(s=>({
    id:String(s.id),
    name:s.name||'',
    start_date:s.start_date||'',
    kind:seasonKind(s.name),
    year:seasonYear(s.name,s.start_date)
  }));

  const picked=[];

  // Target season first: exact year + type.
  for(const s of normalized){
    if(s.kind===wantedKind && s.year===targetYear){
      picked.push(s);
    }
  }

  // Same year's regular season is useful around exhibition/early season.
  for(const s of normalized){
    if(s.kind==='regular' && s.year===targetYear &&
       !picked.some(x=>x.id===s.id)){
      picked.push(s);
    }
  }

  // Previous regular season gives the most recent verified history
  // before a new season starts.
  const prevRegular=normalized
    .filter(s=>s.kind==='regular' && s.year<targetYear)
    .sort((a,b)=>b.year-a.year);

  for(const s of prevRegular.slice(0,2)){
    if(!picked.some(x=>x.id===s.id))picked.push(s);
  }

  // Previous exhibition can help for teams with little regular data.
  const prevExhibition=normalized
    .filter(s=>s.kind==='exhibition' && s.year<targetYear)
    .sort((a,b)=>b.year-a.year);

  for(const s of prevExhibition.slice(0,1)){
    if(!picked.some(x=>x.id===s.id))picked.push(s);
  }

  return picked.slice(0,4);
}

async function fetchSchedule(seasonId){
  const url=safeUrl(`${PROD_URL}/feed/index.php`,{
    ...commonParams(),
    view:'schedule',
    season:seasonId,
    team:'all',
    month:'all',
    location:'all'
  });

  return {
    url,
    data:await fetchPayload(url)
  };
}

function numberOrNull(v){
  if(v===null||v===undefined||v===''||v==='-')return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function findAllScheduleRows(data){
  const rows=[];

  function walk(v){
    if(Array.isArray(v)){
      for(const x of v)walk(x);
      return;
    }

    if(!v||typeof v!=='object')return;

    if(v.row && typeof v.row==='object' &&
       v.row.game_id &&
       ('home_team_city' in v.row || 'visiting_team_city' in v.row)){
      rows.push(v.row);
    }

    for(const x of Object.values(v)){
      if(x&&typeof x==='object')walk(x);
    }
  }

  walk(data);

  const seen=new Set();
  return rows.filter(r=>{
    const key=String(r.game_id);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function parseScheduleDate(label,season){
  const s=String(label||'').trim();

  // Some feed revisions may already return ISO.
  const iso=s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const m=s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})$/);
  if(!m)return null;

  const months={
    jan:1,january:1,feb:2,february:2,mar:3,march:3,
    apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,
    aug:8,august:8,sep:9,september:9,oct:10,october:10,
    nov:11,november:11,dec:12,december:12
  };

  const mon=months[m[1].toLowerCase()];
  if(!mon)return null;

  let year=season.year;
  const startMonth=Number(String(season.start_date||'').slice(5,7)||0);

  // Hockey season crossing New Year.
  if(startMonth>=7 && mon<=6){
    year=season.year+1;
  }

  return `${year}-${String(mon).padStart(2,'0')}-${String(Number(m[2])).padStart(2,'0')}`;
}

function completedRow(row){
  const hg=numberOrNull(row.home_goal_count);
  const ag=numberOrNull(row.visiting_goal_count);
  if(hg===null||ag===null)return false;

  const status=String(row.game_status||'').toLowerCase();
  if(status && /(am|pm)\b/.test(status) && !/final/.test(status))return false;

  return true;
}

function normalizeRow(row,season){
  const gameDate=parseScheduleDate(row.date,season);
  if(!gameDate)return null;

  const homeGoals=numberOrNull(row.home_goal_count);
  const awayGoals=numberOrNull(row.visiting_goal_count);
  if(homeGoals===null||awayGoals===null)return null;

  return {
    external_id:String(row.game_id),
    game_date:gameDate,
    home_team:cleanSpace(row.home_team_city),
    away_team:cleanSpace(row.visiting_team_city),
    home_goals:homeGoals,
    away_goals:awayGoals,
    status:row.game_status||'Final',
    venue:row.venue_name||'',
    season_id:String(season.id),
    season_name:season.name,
    source_url:`https://bchl.ca/stats/game-center/${row.game_id}`
  };
}

function matchesTargetTeam(game,targetName){
  const t=canonical(targetName);
  const home=canonical(game.home_team);
  const away=canonical(game.away_team);

  // Feed often uses city only ("Blackfalds"), while MansHockey uses full club name.
  return (
    home===t || away===t ||
    (home && t.includes(home)) ||
    (away && t.includes(away)) ||
    (t && home.includes(t)) ||
    (t && away.includes(t))
  );
}

function opponentFromGame(game,targetName){
  const t=canonical(targetName);
  const home=canonical(game.home_team);

  const targetHome=
    home===t ||
    (home && t.includes(home)) ||
    (t && home.includes(t));

  return {
    is_home:targetHome,
    opponent_name:targetHome?game.away_team:game.home_team,
    goals_for:targetHome?game.home_goals:game.away_goals,
    goals_against:targetHome?game.away_goals:game.home_goals
  };
}

async function saveOpponentGame(db,target,game){
  const p=opponentFromGame(game,target.opponent);
  const outcome=p.goals_for>p.goals_against?'W':
    p.goals_for<p.goals_against?'L':'T';

  await db.prepare(`
    INSERT INTO opponent_games(
      opponent,external_id,game_date,home_away,opponent_name,
      goals_for,goals_against,result,outcome,
      game_status,source,source_url,verified,updated_at
    )
    VALUES(?,?,?,?,?,?,?,?,?,'Final','HockeyTech statviewfeed',?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET
      external_id=excluded.external_id,
      home_away=excluded.home_away,
      goals_for=excluded.goals_for,
      goals_against=excluded.goals_against,
      result=excluded.result,
      outcome=excluded.outcome,
      game_status='Final',
      source='HockeyTech statviewfeed',
      source_url=excluded.source_url,
      verified=1,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    target.opponent,
    game.external_id,
    game.game_date,
    p.is_home?'Home':'Away',
    p.opponent_name,
    p.goals_for,
    p.goals_against,
    `${p.goals_for}-${p.goals_against}`,
    outcome,
    game.source_url
  ).run();

  return {
    game_id:game.external_id,
    date:game.game_date,
    venue:p.is_home?'Home':'Away',
    opponent:p.opponent_name,
    result:`${p.goals_for}-${p.goals_against}`,
    outcome,
    season_id:game.season_id,
    season_name:game.season_name
  };
}

async function syncTarget(db,boot,target,scheduleCache){
  const seasons=chooseSeasonIds(boot,target);
  const targetDate=String(target.game_date).slice(0,10);
  const pool=[];

  for(const season of seasons){
    let schedule=scheduleCache.get(season.id);

    if(!schedule){
      schedule=await fetchSchedule(season.id);
      scheduleCache.set(season.id,schedule);
    }

    const rows=findAllScheduleRows(schedule.data);

    for(const row of rows){
      if(!completedRow(row))continue;
      const game=normalizeRow(row,season);
      if(!game)continue;
      if(game.game_date>=targetDate)continue;
      if(!matchesTargetTeam(game,target.opponent))continue;
      pool.push(game);
    }
  }

  const seen=new Set();
  const games=pool
    .sort((a,b)=>b.game_date.localeCompare(a.game_date))
    .filter(g=>{
      if(seen.has(g.external_id))return false;
      seen.add(g.external_id);
      return true;
    })
    .slice(0,5);

  const saved=[];
  for(const game of games){
    saved.push(await saveOpponentGame(db,target,game));
  }

  return {
    match_id:target.match_id,
    opponent:target.opponent,
    target_date:targetDate,
    selected_seasons:seasons,
    found:games.length,
    saved:saved.length,
    games:saved
  };
}

async function clearIntelCacheForTargets(db,details){
  let cleared=0;

  for(const d of details){
    if(!d.saved)continue;

    const r=await db.prepare(`
      DELETE FROM opponent_intel
       WHERE match_id IN (
         SELECT id FROM matches WHERE opponent=?
       )
    `).bind(d.opponent).run();

    cleared+=Number(r?.meta?.changes||0);
  }

  return cleared;
}

async function runSync(db){
  const ts=await targets(db);
  if(!ts.length){
    return {
      ok:true,
      version:'E30.5.9',
      mode:'production opponent sync',
      targets:0,
      games_saved:0,
      details:[]
    };
  }

  const boot=await bootstrap();
  const scheduleCache=new Map();
  const details=[];

  for(const target of ts){
    details.push(await syncTarget(db,boot,target,scheduleCache));
  }

  const gamesSaved=details.reduce((n,x)=>n+x.saved,0);
  const intelCacheCleared=await clearIntelCacheForTargets(db,details);

  return {
    ok:true,
    version:'E30.5.9',
    mode:'production opponent sync',
    strategy:'HockeyTech statviewfeed -> dynamic season selection -> last 5 verified games -> D1 opponent_games',
    current:{
      league_id:boot?.current_league_id||null,
      season_id:boot?.current_season_id||null
    },
    targets:ts.length,
    unique_seasons_fetched:scheduleCache.size,
    games_saved:gamesSaved,
    intel_cache_cleared:intelCacheCleared,
    details
  };
}

export async function onRequestGet(c){
  if(!auth(c.request,c.env)){
    return json({ok:false,error:'Unauthorized'},401);
  }

  if(!c.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  const ts=await targets(c.env.DB);

  return json({
    ok:true,
    version:'E30.5.9',
    mode:'production opponent sync',
    targets:ts
  });
}

export async function onRequestPost(c){
  if(!auth(c.request,c.env)){
    return json({ok:false,error:'Unauthorized'},401);
  }

  if(!c.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  try{
    return json(await runSync(c.env.DB));
  }catch(e){
    return json({
      ok:false,
      version:'E30.5.9',
      error:String(e)
    },500);
  }
}
