// E30.5.7 force deploy 2
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

const TEAM_CODES={
  "Spruce Grove Saints":"SGS",
  "Okotoks Oilers":"OKO",
  "Blackfalds Bulldogs":"BFB",
  "Sherwood Park Crusaders":"SPC",
  "Alberni Valley Bulldogs":"AV",
  "Cowichan Valley Capitals":"CV",
  "Brooks Bandits":"BRK"
};

const HT_FILES=[
  'https://lscluster.hockeytech.com/statview-1.4.1/js/client/bchl/base.r2.js',
  'https://lscluster.hockeytech.com/statview-1.4.1/js/ht-services.r2.js',
  'https://lscluster.hockeytech.com/statview-1.4.1/js/ht-routes.r2.js',
  'https://lscluster.hockeytech.com/statview-1.4.1/js/ht-controller.r2.js',
  'https://lscluster.hockeytech.com/statview-1.4.1/js/ht-libraries.r2.js'
];

function cleanSpace(s){
  return String(s||'').replace(/\s+/g,' ').trim();
}

async function fetchText(url,timeout=10000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeout);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.5.7',
        'accept':'application/javascript,text/javascript,*/*'
      },
      signal:ctl.signal
    });

    const body=r.ok ? await r.text() : '';

    return {
      ok:r.ok,
      status:r.status,
      body,
      content_type:r.headers.get('content-type')||''
    };
  }catch(err){
    return {
      ok:false,
      status:0,
      body:'',
      content_type:'',
      error:String(err)
    };
  }finally{
    clearTimeout(timer);
  }
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

function unique(arr){
  return [...new Set(arr.filter(Boolean))];
}

function snippet(text,index,radius=300){
  const s=String(text||'');
  if(index<0)return '';
  return cleanSpace(
    s.slice(Math.max(0,index-radius),Math.min(s.length,index+radius))
  ).slice(0,800);
}

function urlCandidates(text){
  const out=[];

  const abs=/https?:\/\/[^\s"'`<>\\)]+/gi;
  for(const m of String(text||'').matchAll(abs)){
    out.push(m[0].replace(/[;,]+$/,''));
  }

  const quoted=/(["'`])((?:\/|\.\/|\.\.\/)[^"'`\s<>]{2,260})\1/g;
  for(const m of String(text||'').matchAll(quoted)){
    out.push(m[2]);
  }

  return unique(out);
}

function relevantUrl(u){
  const s=String(u||'').toLowerCase();

  return [
    'feed','api','schedule','score','game','stats',
    'standings','roster','player','season','team',
    'league','modulekit','gamecenter','game-center',
    'lscluster','hockeytech','index.php'
  ].some(k=>s.includes(k));
}

function extractObjectAssignments(text){
  const hits=[];
  const re=/([A-Za-z_$][\w$.\[\]'"]{0,120})\s*[:=]\s*(["'`])([^"'`\n]{1,260})\2/g;
  let m;

  while((m=re.exec(String(text||'')))!==null){
    const value=m[3];
    if(!relevantUrl(value) &&
       !/(schedule|game|score|season|team|league|feed|api|stats)/i.test(m[1])){
      continue;
    }

    hits.push({
      lhs:cleanSpace(m[1]),
      value:cleanSpace(value),
      sample:snippet(text,m.index,220)
    });

    if(hits.length>=80)break;
  }

  return hits;
}

function extractHttpCalls(text){
  const hits=[];
  const patterns=[
    {kind:'http.get',re:/\$http\.get\s*\(([\s\S]{0,500}?)\)/gi},
    {kind:'http.jsonp',re:/\$http\.jsonp\s*\(([\s\S]{0,500}?)\)/gi},
    {kind:'http.post',re:/\$http\.post\s*\(([\s\S]{0,500}?)\)/gi},
    {kind:'ajax',re:/\$\.ajax\s*\(\s*\{([\s\S]{0,700}?)\}\s*\)/gi},
    {kind:'fetch',re:/fetch\s*\(([\s\S]{0,500}?)\)/gi}
  ];

  for(const p of patterns){
    let m;
    while((m=p.re.exec(String(text||'')))!==null){
      const body=cleanSpace(m[1]);

      if(!/(schedule|game|score|season|team|league|feed|api|stats|hockeytech|lscluster)/i.test(body)){
        continue;
      }

      hits.push({
        kind:p.kind,
        body:body.slice(0,700),
        sample:snippet(text,m.index,250)
      });

      if(hits.length>=80)break;
    }
  }

  return hits;
}

function extractRouteLike(text){
  const hits=[];
  const re=/[{"'`](\/?[A-Za-z0-9_.?=&%\-\/]{3,240}(?:schedule|game|score|standings|stats|roster|player|season|team)[A-Za-z0-9_.?=&%\-\/]*)[}"'`]/gi;
  let m;

  while((m=re.exec(String(text||'')))!==null){
    hits.push(m[1]);
    if(hits.length>=100)break;
  }

  return unique(hits);
}

function markerHits(text){
  const markers=[
    'modulekit',
    'feed/index.php',
    'client_code',
    'league_id',
    'season_id',
    'team_id',
    'game_id',
    'schedule',
    'daily-schedule',
    'game-center',
    'scoreboard',
    'standings',
    'roster',
    'player-stats',
    'goalie-stats',
    'JSON_CALLBACK'
  ];

  const out=[];

  for(const marker of markers){
    const lower=String(text||'').toLowerCase();
    let start=0;
    let count=0;

    while(count<4){
      const i=lower.indexOf(marker.toLowerCase(),start);
      if(i<0)break;

      out.push({
        marker,
        sample:snippet(text,i,320)
      });

      start=i+marker.length;
      count++;
    }
  }

  return out;
}

function analyzeFile(url,body,status,contentType){
  const urls=urlCandidates(body).filter(relevantUrl);

  return {
    url,
    status,
    content_type:contentType,
    chars:body.length,
    candidate_urls:urls.slice(0,80),
    route_like:extractRouteLike(body).slice(0,80),
    http_calls:extractHttpCalls(body).slice(0,60),
    assignments:extractObjectAssignments(body).slice(0,60),
    markers:markerHits(body).slice(0,60)
  };
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);
  let next=0;

  async function worker(){
    while(true){
      const i=next++;
      if(i>=items.length)return;
      out[i]=await fn(items[i],i);
    }
  }

  await Promise.all(
    Array.from({length:Math.min(limit,items.length)},worker)
  );

  return out;
}

async function runProbe(env,db){
  const ts=await targets(db);

  const files=await mapLimit(HT_FILES,3,async url=>{
    const r=await fetchText(url);
    return analyzeFile(
      url,
      r.body||'',
      r.status,
      r.content_type
    );
  });

  const allUrls=unique(
    files.flatMap(f=>f.candidate_urls||[])
  );

  const allRoutes=unique(
    files.flatMap(f=>f.route_like||[])
  );

  const allCalls=files.flatMap(f=>f.http_calls||[]);

  const allAssignments=files.flatMap(f=>f.assignments||[]);

  const likelyScheduleEvidence=[
    ...allUrls.filter(x=>/(schedule|game|score|feed|modulekit)/i.test(x)),
    ...allRoutes.filter(x=>/(schedule|game|score)/i.test(x)),
    ...allAssignments
      .filter(x=>/(schedule|game|score|feed|modulekit|league|season)/i.test(`${x.lhs} ${x.value}`))
      .map(x=>`${x.lhs} = ${x.value}`)
  ];

  return {
    ok:true,
    version:'E30.5.7',
    mode:'HockeyTech endpoint probe',
    strategy:'read HockeyTech Statview JS bundles; extract service URLs, HTTP calls and parameters; no D1 writes',
    targets:ts,
    files,
    summary:{
      files_checked:files.length,
      files_ok:files.filter(f=>f.status===200).length,
      candidate_urls:allUrls.length,
      route_like:allRoutes.length,
      http_calls:allCalls.length,
      assignments:allAssignments.length
    },
    likely_schedule_evidence:unique(likelyScheduleEvidence).slice(0,120)
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
    version:'E30.5.7',
    mode:'HockeyTech endpoint probe',
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
    return json(await runProbe(c.env,c.env.DB));
  }catch(e){
    return json({
      ok:false,
      version:'E30.5.7',
      error:String(e)
    },500);
  }
}
