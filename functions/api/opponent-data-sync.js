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

const CODE_TEAM=Object.fromEntries(
  Object.entries(TEAM_CODES).map(([team,code])=>[code,team])
);

function cleanHtml(s){
  return String(s||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<[^>]+>/g,'\n')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi,'-')
    .replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"')
    .replace(/\r/g,'');
}

function normalizedText(raw){
  return cleanHtml(raw)
    .replace(/[ \t]+/g,' ')
    .replace(/\n+/g,'\n')
    .trim();
}

function flatText(raw){
  return normalizedText(raw)
    .replace(/\n/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function isoDate(d){
  return d.toISOString().slice(0,10);
}

async function fetchOfficial(url){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),7000);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.5.4',
        'accept':'text/html,application/xhtml+xml'
      },
      signal:ctl.signal
    });

    if(!r.ok)return {
      ok:false,
      status:r.status,
      html:'',
      content_type:r.headers.get('content-type')||''
    };

    return {
      ok:true,
      status:r.status,
      html:await r.text(),
      content_type:r.headers.get('content-type')||''
    };
  }catch(err){
    return {
      ok:false,
      status:0,
      html:'',
      content_type:'',
      error:String(err)
    };
  }finally{
    clearTimeout(timer);
  }
}

function validCode(code){
  return Boolean(CODE_TEAM[String(code||'').toUpperCase()]);
}

function addGame(out,seen,date,awayCode,homeCode,awayGoals,homeGoals,parser){
  awayCode=String(awayCode||'').toUpperCase();
  homeCode=String(homeCode||'').toUpperCase();

  if(!validCode(awayCode)||!validCode(homeCode)||awayCode===homeCode)return;
  if(!Number.isFinite(Number(awayGoals))||!Number.isFinite(Number(homeGoals)))return;

  const ag=Number(awayGoals);
  const hg=Number(homeGoals);

  if(ag<0||ag>20||hg<0||hg>20)return;

  const key=`${date}|${awayCode}|${homeCode}|${ag}|${hg}`;
  if(seen.has(key))return;

  seen.add(key);
  out.push({
    date,
    away_code:awayCode,
    home_code:homeCode,
    away_goals:ag,
    home_goals:hg,
    parser
  });
}

/*
 BCHL currently exposes more than one representation.

 Examples seen on official pages/search indexing include:
   NAN 1
   BRK 2
   Final 2nd OT

 and:
   SGS (29-22-2-1)
   4 - 2
   FINAL
   Tap to see Game Summary.
   BRK (37-11-6-0)

 and compact text:
   TRA (0-4-0-0). 1 - 2. FINAL OT. ... SA (7-4-0-0)
*/
function parseDaily(raw,date,wantedCodes){
  const text=normalizedText(raw);
  const flat=flatText(raw);
  const lines=text.split('\n')
    .map(x=>x.replace(/\s+/g,' ').trim())
    .filter(Boolean);

  const games=[];
  const seen=new Set();
  const parserHits={
    line_pairs:0,
    inline_simple:0,
    record_blocks:0
  };

  // Parser A: traditional line pairs:
  // CODE 3 ... CODE 1 ... Final
  for(let i=0;i<lines.length;i++){
    const a=lines[i].match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
    if(!a||!validCode(a[1]))continue;

    for(let j=i+1;j<Math.min(i+16,lines.length);j++){
      const b=lines[j].match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
      if(!b||!validCode(b[1])||b[1]===a[1])continue;

      const win=lines.slice(i,Math.min(j+14,lines.length)).join(' ');
      if(!/\bFINAL(?:\s+(?:OT|OT2|2ND OT|3RD OT))?\b/i.test(win))continue;
      if(!wantedCodes.has(a[1])&&!wantedCodes.has(b[1]))break;

      // BCHL list representation is away first, home second.
      const before=games.length;
      addGame(games,seen,date,a[1],b[1],Number(a[2]),Number(b[2]),'line_pairs');
      if(games.length>before)parserHits.line_pairs++;
      break;
    }
  }

  // Parser B: compact/simple indexed representation:
  // NAN 3 BRK 1 Final
  const simple=/\b([A-Z]{2,3})\s+(\d{1,2})\s+([A-Z]{2,3})\s+(\d{1,2})\s+FINAL(?:\s+(?:OT|OT2|2ND OT|3RD OT))?\b/gi;
  let m;
  while((m=simple.exec(flat))!==null){
    const a=m[1].toUpperCase(), b=m[3].toUpperCase();
    if(!validCode(a)||!validCode(b))continue;
    if(!wantedCodes.has(a)&&!wantedCodes.has(b))continue;

    const before=games.length;
    addGame(games,seen,date,a,b,Number(m[2]),Number(m[4]),'inline_simple');
    if(games.length>before)parserHits.inline_simple++;
  }

  // Parser C: record-card representation:
  // SGS (29-22-2-1) 4 - 2 FINAL ... BRK (37-11-6-0)
  // The first team owns the first score; the second team owns the second.
  // BCHL renders first/second team in away/home order in the daily game card.
  const recordBlock=/\b([A-Z]{2,3})\s*\(\s*\d+\s*-\s*\d+\s*-\s*\d+\s*-\s*\d+\s*\)\s*[.:]?\s*(\d{1,2})\s*-\s*(\d{1,2})\s*[.:]?\s*FINAL(?:\s+(?:OT|OT2|2ND OT|3RD OT))?[\s\S]{0,500}?\b([A-Z]{2,3})\s*\(\s*\d+\s*-\s*\d+\s*-\s*\d+\s*-\s*\d+\s*\)/gi;

  while((m=recordBlock.exec(flat))!==null){
    const a=m[1].toUpperCase(), b=m[4].toUpperCase();
    if(!validCode(a)||!validCode(b)||a===b)continue;
    if(!wantedCodes.has(a)&&!wantedCodes.has(b))continue;

    const before=games.length;
    addGame(games,seen,date,a,b,Number(m[2]),Number(m[3]),'record_blocks');
    if(games.length>before)parserHits.record_blocks++;
  }

  return {games,parserHits,text,flat};
}

async function saveGame(db,team,g){
  const code=TEAM_CODES[team];
  if(!code)return 0;

  const isAway=g.away_code===code;
  const isHome=g.home_code===code;
  if(!isAway&&!isHome)return 0;

  const other=isAway?g.home_code:g.away_code;
  const gf=isAway?g.away_goals:g.home_goals;
  const ga=isAway?g.home_goals:g.away_goals;
  const outcome=gf>ga?'W':gf<ga?'L':'T';

  await db.prepare(`
    INSERT INTO opponent_games(
      opponent,game_date,home_away,opponent_name,
      goals_for,goals_against,result,outcome,
      game_status,source,source_url,verified,updated_at
    )
    VALUES(?,?,?,?,?,?,?,?,'Final','BCHL league schedule cache',?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET
      home_away=excluded.home_away,
      goals_for=excluded.goals_for,
      goals_against=excluded.goals_against,
      result=excluded.result,
      outcome=excluded.outcome,
      source=excluded.source,
      source_url=excluded.source_url,
      verified=1,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    team,
    g.date,
    isAway?'Away':'Home',
    CODE_TEAM[other],
    gf,
    ga,
    `${gf}-${ga}`,
    outcome,
    `https://bchl.ca/stats/daily-schedule/${Number(g.date.slice(0,4))}-${Number(g.date.slice(5,7))}-${Number(g.date.slice(8,10))}`
  ).run();

  return 1;
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

function candidateDates(ts){
  const upcoming=new Date(ts);

// E30.5.4 shared cache window; architecture unchanged.
  const end=new Date(upcoming);
  end.setUTCDate(end.getUTCDate()-90);

  const start=new Date(end);
  start.setUTCDate(start.getUTCDate()-84);

  const dates=[];

  for(let d=new Date(end);d>=start;d.setUTCDate(d.getUTCDate()-1)){
    if([0,3,5,6].includes(d.getUTCDay())){
      dates.push(new Date(d));
    }
  }

  return dates;
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

function diagnosticSample(parsed,wantedCodes){
  const samples=[];

  // Return short snippets around wanted team codes, never whole pages.
  for(const code of wantedCodes){
    const re=new RegExp(`.{0,140}\\b${code}\\b.{0,260}`,'i');
    const hit=parsed.flat.match(re);
    if(hit){
      samples.push({
        code,
        sample:hit[0].replace(/\s+/g,' ').slice(0,420)
      });
    }
  }

  return samples.slice(0,4);
}

async function syncLeague(env,db){
  const ts=await targets(db);

  if(!ts.length){
    return {
      ok:true,
      version:'E30.5.4',
      targets:0,
      pages_fetched:0,
      games_found:0,
      saved:0,
      details:[]
    };
  }

  const wanted=new Set(
    ts.map(t=>TEAM_CODES[t.opponent]).filter(Boolean)
  );

  const dates=candidateDates(ts[0].game_date);

  const pages=await mapLimit(dates,6,async d=>{
    const ds=isoDate(d);
    const url=`https://bchl.ca/stats/daily-schedule/${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
    const response=await fetchOfficial(url);

    return {
      ds,
      url,
      ...response
    };
  });

  const pool=[];
  const parserTotals={
    line_pairs:0,
    inline_simple:0,
    record_blocks:0
  };

  let pagesWithFinal=0;
  let pagesWithWantedCode=0;
  let htmlChars=0;
  const diagnostics=[];

  for(const p of pages){
    if(!p?.html)continue;

    htmlChars+=p.html.length;

    const parsed=parseDaily(p.html,p.ds,wanted);

    parserTotals.line_pairs+=parsed.parserHits.line_pairs;
    parserTotals.inline_simple+=parsed.parserHits.inline_simple;
    parserTotals.record_blocks+=parsed.parserHits.record_blocks;

    if(/\bFINAL\b/i.test(parsed.flat))pagesWithFinal++;

    let wantedHit=false;
    for(const code of wanted){
      if(new RegExp(`\\b${code}\\b`,'i').test(parsed.flat)){
        wantedHit=true;
        break;
      }
    }

    if(wantedHit)pagesWithWantedCode++;

    for(const g of parsed.games){
      pool.push(g);
    }

    if(diagnostics.length<3 && wantedHit){
      diagnostics.push({
        date:p.ds,
        status:p.status,
        content_type:p.content_type,
        html_chars:p.html.length,
        final_count:(parsed.flat.match(/\bFINAL\b/gi)||[]).length,
        samples:diagnosticSample(parsed,wanted)
      });
    }
  }

  // Deduplicate shared pool.
  const uniquePool=[];
  const poolSeen=new Set();

  for(const g of pool){
    const key=`${g.date}|${g.away_code}|${g.home_code}|${g.away_goals}|${g.home_goals}`;
    if(poolSeen.has(key))continue;
    poolSeen.add(key);
    uniquePool.push(g);
  }

  const details=[];
  let saved=0;

  for(const t of ts){
    const code=TEAM_CODES[t.opponent];

    const games=uniquePool
      .filter(g=>g.away_code===code||g.home_code===code)
      .sort((a,b)=>b.date.localeCompare(a.date))
      .slice(0,5);

    let n=0;

    for(const g of games){
      n+=await saveGame(db,t.opponent,g);
    }

    saved+=n;

    details.push({
      match_id:t.match_id,
      opponent:t.opponent,
      team_code:code,
      found:games.length,
      saved:n,
      games
    });
  }

  const result={
    ok:true,
    version:'E30.5.4',
    mode:'BCHL parser fix',
    strategy:'E30.5.3 shared cache + multi-format BCHL parser + diagnostics',
    targets:ts.length,
    pages_planned:dates.length,
    pages_fetched:pages.filter(p=>p?.html).length,
    pages_with_final:pagesWithFinal,
    pages_with_wanted_code:pagesWithWantedCode,
    html_chars:htmlChars,
    parser_hits:parserTotals,
    games_found:uniquePool.length,
    saved,
    details
  };

  // Important: don't let "48 pages fetched / 0 games" masquerade as success.
  if(result.pages_fetched>0 && result.games_found===0){
    return {
      ...result,
      ok:false,
      parser_error:true,
      error:'BCHL-sidor hämtades men parsern hittade 0 matcher.',
      diagnostics
    };
  }

  return result;
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
    version:'E30.5.4',
    mode:'BCHL parser fix',
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
    const result=await syncLeague(c.env,c.env.DB);

    // 422 is deliberate: parser/data failure, not server crash.
    return json(result,result.ok?200:422);
  }catch(e){
    return json({
      ok:false,
      version:'E30.5.4',
      error:String(e)
    },500);
  }
}
