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
  "Brooks Bandits":"BRK"
};

function cleanSpace(s){
  return String(s||'').replace(/\s+/g,' ').trim();
}

function safeUrl(base,params){
  const u=new URL(base);
  for(const [k,v] of Object.entries(params||{})){
    if(v===undefined||v===null||v==='')continue;
    u.searchParams.set(k,String(v));
  }
  return u.toString();
}

async function fetchText(url,timeout=12000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeout);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.5.8.1',
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
  let text=String(raw||'').trim();
  if(!text)return {ok:false,error:'empty body',data:null};

  // 1. Normal JSON.
  try{
    return {ok:true,format:'json',data:JSON.parse(text)};
  }catch{}

  // 2. HockeyTech sometimes returns parenthesized JSON:
  //    ({...}) or ([...])
  if(text.startsWith('(') && text.endsWith(')')){
    const inner=text.slice(1,-1).trim();
    try{
      return {
        ok:true,
        format:'parenthesized-json',
        data:JSON.parse(inner)
      };
    }catch{}
  }

  // 3. Traditional JSONP: callback({...})
  const first=text.indexOf('(');
  const last=text.lastIndexOf(')');

  if(first>0 && last>first){
    const inner=text.slice(first+1,last).trim();
    try{
      return {
        ok:true,
        format:'jsonp',
        data:JSON.parse(inner)
      };
    }catch{}
  }

  return {
    ok:false,
    format:'text',
    error:'not JSON/parenthesized-JSON/JSONP',
    data:null,
    preview:cleanSpace(text).slice(0,700)
  };
}

function firstValue(obj,names){
  if(!obj||typeof obj!=='object')return null;

  for(const name of names){
    if(obj[name]!==undefined&&obj[name]!==null&&obj[name]!==''){
      return obj[name];
    }
  }

  if(Array.isArray(obj)){
    for(const v of obj){
      const hit=firstValue(v,names);
      if(hit!==null)return hit;
    }
    return null;
  }

  for(const v of Object.values(obj)){
    if(v&&typeof v==='object'){
      const hit=firstValue(v,names);
      if(hit!==null)return hit;
    }
  }

  return null;
}

function summarizeObject(v){
  if(v===null||v===undefined)return v;
  if(typeof v!=='object')return v;
  if(Array.isArray(v))return {array_length:v.length};

  const out={};

  for(const [k,val] of Object.entries(v).slice(0,35)){
    if(val===null||['string','number','boolean'].includes(typeof val)){
      out[k]=typeof val==='string' ? val.slice(0,220) : val;
    }else if(Array.isArray(val)){
      out[k]={array_length:val.length};
    }else{
      out[k]={object:true};
    }
  }

  return out;
}

function arrayCandidates(obj,path='$',out=[]){
  if(out.length>=40)return out;

  if(Array.isArray(obj)){
    out.push({
      path,
      length:obj.length,
      first:obj.length ? summarizeObject(obj[0]) : null
    });

    for(let i=0;i<Math.min(obj.length,3);i++){
      if(obj[i]&&typeof obj[i]==='object'){
        arrayCandidates(obj[i],`${path}[${i}]`,out);
      }
    }

    return out;
  }

  if(obj&&typeof obj==='object'){
    for(const [k,v] of Object.entries(obj)){
      if(v&&typeof v==='object'){
        arrayCandidates(v,`${path}.${k}`,out);
      }
    }
  }

  return out;
}

function keysLower(o){
  return Object.keys(o||{}).map(k=>k.toLowerCase());
}

function looksLikeGame(x){
  if(!x||typeof x!=='object'||Array.isArray(x))return false;

  const k=keysLower(x);

  // HockeyTech daily schedule object
  if(('id' in x) && x.homeTeam && x.visitingTeam)return true;

  // Schedule table row variants
  const gameId=k.some(v=>v==='game_id'||v==='gameid'||v==='id');
  const home=k.some(v=>/home.*team|home_team/.test(v));
  const away=k.some(v=>/visiting.*team|away.*team|visitor.*team/.test(v));
  const date=k.some(v=>v==='date'||v.includes('game_date')||v.includes('game_date_time'));

  return gameId && (home||away||date);
}

function gameLikeRows(obj,out=[],path='$'){
  if(out.length>=30)return out;

  if(Array.isArray(obj)){
    for(let i=0;i<obj.length;i++){
      const x=obj[i];

      if(looksLikeGame(x)){
        out.push({
          path:`${path}[${i}]`,
          row:summarizeObject(x)
        });

        if(out.length>=30)return out;
      }

      if(x&&typeof x==='object'){
        gameLikeRows(x,out,`${path}[${i}]`);
        if(out.length>=30)return out;
      }
    }

    return out;
  }

  if(obj&&typeof obj==='object'){
    if(looksLikeGame(obj)){
      out.push({
        path,
        row:summarizeObject(obj)
      });
    }

    for(const [k,v] of Object.entries(obj)){
      if(v&&typeof v==='object'){
        gameLikeRows(v,out,`${path}.${k}`);
        if(out.length>=30)return out;
      }
    }
  }

  return out;
}

function normalizeDailyGame(g){
  if(!g||typeof g!=='object')return null;

  const home=g.homeTeam?.info||{};
  const away=g.visitingTeam?.info||g.awayTeam?.info||{};

  if(!g.id || !home.name || !away.name)return null;

  return {
    game_id:String(g.id),
    season_id:String(
      g.homeTeam?.seasonStats?.seasonId ||
      g.visitingTeam?.seasonStats?.seasonId ||
      ''
    ),
    home_team:{
      id:home.id??null,
      name:home.name||'',
      city:home.city||'',
      abbreviation:home.abbreviation||''
    },
    away_team:{
      id:away.id??null,
      name:away.name||'',
      city:away.city||'',
      abbreviation:away.abbreviation||''
    },
    home_goals:
      g.homeTeam?.stats?.goalCount ??
      g.homeTeam?.stats?.goals ??
      null,
    away_goals:
      g.visitingTeam?.stats?.goalCount ??
      g.visitingTeam?.stats?.goals ??
      null,
    raw_status:
      g.gameStatus ||
      g.status ||
      g.game_status ||
      null
  };
}

function collectDailyGames(data){
  const out=[];

  function walk(v){
    if(Array.isArray(v)){
      for(const x of v)walk(x);
      return;
    }

    if(!v||typeof v!=='object')return;

    const n=normalizeDailyGame(v);
    if(n && !out.some(x=>x.game_id===n.game_id)){
      out.push(n);
    }

    for(const x of Object.values(v)){
      if(x&&typeof x==='object')walk(x);
    }
  }

  walk(data);
  return out.slice(0,50);
}

async function targets(db){
  const r=(await db.prepare(`
    SELECT id,opponent,game_date
      FROM matches
     WHERE game_date>=datetime('now')
       AND opponent IS NOT NULL
       AND trim(opponent)<>''
     ORDER BY game_date
     LIMIT 14
  `).all()).results||[];

  const seen=new Set();
  const out=[];

  for(const x of r){
    if(seen.has(x.opponent)||!TEAM_CODES[x.opponent])continue;
    seen.add(x.opponent);

    out.push({
      match_id:Number(x.id),
      opponent:x.opponent,
      game_date:x.game_date
    });

    if(out.length>=6)break;
  }

  return out;
}

async function probeUrl(name,url){
  const r=await fetchText(url);
  const parsed=parsePayload(r.body);

  return {
    name,
    url,
    status:r.status,
    content_type:r.content_type,
    body_chars:r.body.length,
    parse_ok:parsed.ok,
    format:parsed.format||null,
    error:parsed.error||null,
    preview:parsed.ok ? null : parsed.preview,
    data:parsed.ok ? parsed.data : null,
    top_level:parsed.ok ? summarizeObject(parsed.data) : null,
    arrays:parsed.ok ? arrayCandidates(parsed.data).slice(0,16) : [],
    game_like_rows:parsed.ok ? gameLikeRows(parsed.data).slice(0,20) : [],
    daily_games:parsed.ok ? collectDailyGames(parsed.data) : []
  };
}

async function runProbe(db){
  const ts=await targets(db);

  const common={
    feed:'statviewfeed',
    key:APP_KEY,
    client_code:CLIENT_CODE,
    site_id:SITE_ID,
    lang:'en'
  };

  const bootstrapUrl=safeUrl(`${PROD_URL}/feed/index.php`,{
    ...common,
    view:'bootstrap',
    season:'latest',
    page:'schedule',
    page_name:'schedule',
    division:-1,
    conference:-1,
    fmt:'json'
  });

  const bootstrap=await probeUrl('bootstrap',bootstrapUrl);

  const b=bootstrap.data||{};

  const seasonId=firstValue(b,[
    'current_season_id','season_id','seasonId','currentSeasonId'
  ]);

  const leagueId=firstValue(b,[
    'current_league_id','league_id','leagueId','currentLeagueId'
  ]);

  const probeDate=ts[0]?.game_date
    ? String(ts[0].game_date).slice(0,10)
    : '2026-09-09';

  const variants=[
    {
      name:'schedule-standard',
      url:safeUrl(`${PROD_URL}/feed/index.php`,{
        ...common,
        view:'schedule',
        season:seasonId||'latest',
        league:leagueId||undefined,
        team:'all',
        month:'all',
        location:'all',
        fmt:'json'
      })
    },
    {
      name:'schedule-id-params',
      url:safeUrl(`${PROD_URL}/feed/index.php`,{
        ...common,
        view:'schedule',
        season_id:seasonId||'latest',
        league_id:leagueId||undefined,
        team_id:-1,
        month:-1,
        location:'all',
        fmt:'json'
      })
    },
    {
      name:'schedule-all-teams',
      url:safeUrl(`${PROD_URL}/feed/index.php`,{
        ...common,
        view:'schedule',
        season:seasonId||'latest',
        league:leagueId||undefined,
        team_id:'all',
        month:'all',
        location:'all',
        fmt:'json'
      })
    },
    {
      name:'schedule-day',
      url:safeUrl(`${PROD_URL}/feed/index.php`,{
        ...common,
        view:'schedule_day',
        date:probeDate,
        getDate:probeDate,
        season:seasonId||'latest',
        league:leagueId||undefined,
        fmt:'json'
      })
    }
  ];

  const results=[];
  for(const v of variants){
    results.push(await probeUrl(v.name,v.url));
  }

  return {
    ok:true,
    version:'E30.5.8.1',
    mode:'HockeyTech parenthesized JSON fix',
    strategy:'parse HockeyTech (...) payloads; resolve BCHL IDs and expose game rows; no D1 writes',
    config:{
      prod_url:PROD_URL,
      client_code:CLIENT_CODE,
      app_key:APP_KEY,
      site_id:SITE_ID
    },
    targets:ts,
    resolved:{
      season_id:seasonId,
      league_id:leagueId,
      probe_date:probeDate
    },
    bootstrap:{
      status:bootstrap.status,
      parse_ok:bootstrap.parse_ok,
      format:bootstrap.format,
      body_chars:bootstrap.body_chars,
      top_level:bootstrap.top_level,
      arrays:bootstrap.arrays
    },
    schedule_results:results.map(x=>({
      name:x.name,
      url:x.url,
      status:x.status,
      body_chars:x.body_chars,
      parse_ok:x.parse_ok,
      format:x.format,
      error:x.error,
      top_level:x.top_level,
      arrays:x.arrays,
      game_like_rows:x.game_like_rows,
      daily_games:x.daily_games
    }))
  };
}

export async function onRequestGet(c){
  if(!auth(c.request,c.env)){
    return json({ok:false,error:'Unauthorized'},401);
  }

  if(!c.env.DB){
    return json({ok:false,error:'D1 saknas'},500);
  }

  return json({
    ok:true,
    version:'E30.5.8.1',
    mode:'HockeyTech parenthesized JSON fix',
    targets:await targets(c.env.DB)
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
    return json(await runProbe(c.env.DB));
  }catch(e){
    return json({
      ok:false,
      version:'E30.5.8.1',
      error:String(e)
    },500);
  }
}
