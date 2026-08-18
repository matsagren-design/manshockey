const SEARCH_URL='https://api.firecrawl.dev/v2/search';
const SCRAPE_URL='https://api.firecrawl.dev/v2/scrape';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function bearerOK(request,env){
  const auth=request.headers.get('Authorization')||'';
  return Boolean(env.SYNC_TOKEN && auth===`Bearer ${env.SYNC_TOKEN}`);
}

function safeUrl(v=''){
  try{
    const u=new URL(v);
    return ['http:','https:'].includes(u.protocol)?u.toString():'';
  }catch{return ''}
}

function canon(v=''){
  return String(v).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function dateKey(v){
  if(!v)return null;
  const m=String(v).match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  const d=new Date(v);
  if(!Number.isFinite(d.getTime()))return null;
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Edmonton',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).format(d);
}

function numberOrNull(v){
  if(v===null||v===undefined||v==='')return null;
  const n=Number(v);
  return Number.isFinite(n)&&n>=0&&n<30?n:null;
}

async function search(env,opponent){
  const q=`"${opponent}" BCHL recent games results`;
  const r=await fetch(SEARCH_URL,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${env.FIRECRAWL_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      query:q,
      limit:6,
      includeDomains:['bchl.ca'],
      country:'CA',
      location:'Alberta,Canada',
      safe:true,
      timeout:30000,
      ignoreInvalidURLs:true
    })
  });

  const d=await r.json().catch(()=>null);
  if(r.status===429)return {rate_limited:true,results:[]};
  if(!r.ok||!d?.success)throw new Error(`Firecrawl search ${r.status}: ${d?.error||'okänt fel'}`);

  return {
    rate_limited:false,
    results:(d?.data?.web||[])
      .map(x=>({url:safeUrl(x.url),title:x.title||'',description:x.description||''}))
      .filter(x=>x.url)
  };
}

async function scrape(env,url,opponent){
  const schema={
    type:'object',
    properties:{
      team:{type:'string'},
      games:{
        type:'array',
        items:{
          type:'object',
          properties:{
            date:{type:'string'},
            home_team:{type:'string'},
            away_team:{type:'string'},
            home_score:{anyOf:[{type:'integer'},{type:'null'}]},
            away_score:{anyOf:[{type:'integer'},{type:'null'}]},
            status:{type:'string'},
            game_center_url:{type:'string'}
          },
          required:['date','home_team','away_team','status']
        }
      }
    },
    required:['team','games']
  };

  const prompt=`Extract ONLY completed BCHL games involving ${opponent}.
Return at most the 8 most recent completed games visible on this page.
Do not invent games or scores.
For each game return:
- date YYYY-MM-DD
- home_team
- away_team
- home_score
- away_score
- status
- official BCHL game_center_url if visible.
Only completed/final games count.`;

  const r=await fetch(SCRAPE_URL,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${env.FIRECRAWL_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      url,
      formats:[{type:'json',prompt,schema}],
      onlyMainContent:false,
      waitFor:2500,
      timeout:60000,
      maxAge:300000,
      location:{country:'CA',languages:['en-CA']}
    })
  });

  const d=await r.json().catch(()=>null);
  if(r.status===429)return {rate_limited:true,games:[]};
  if(!r.ok||!d?.success)return {rate_limited:false,games:[]};

  return {
    rate_limited:false,
    games:Array.isArray(d?.data?.json?.games)?d.data.json.games:[]
  };
}

function normalizeGame(opponent,g,sourceUrl){
  const home=String(g.home_team||'').trim();
  const away=String(g.away_team||'').trim();
  const teamCanon=canon(opponent);
  const homeIs=canon(home)===teamCanon || canon(home).includes(teamCanon) || teamCanon.includes(canon(home));
  const awayIs=canon(away)===teamCanon || canon(away).includes(teamCanon) || teamCanon.includes(canon(away));

  if(!homeIs&&!awayIs)return null;

  const hs=numberOrNull(g.home_score);
  const as=numberOrNull(g.away_score);
  if(hs===null||as===null)return null;

  const gf=homeIs?hs:as;
  const ga=homeIs?as:hs;
  const oppName=homeIs?away:home;
  const outcome=gf>ga?'W':gf<ga?'L':'T';
  const gameDate=dateKey(g.date);

  if(!gameDate)return null;

  return {
    opponent,
    game_date:gameDate,
    home_away:homeIs?'Home':'Away',
    opponent_name:oppName,
    goals_for:gf,
    goals_against:ga,
    result:`${gf}-${ga}`,
    outcome,
    game_status:'Final',
    source:'BCHL',
    source_url:safeUrl(g.game_center_url)||sourceUrl,
    verified:1
  };
}

async function upcomingOpponents(db){
  const now=new Date().toISOString();
  const rows=(await db.prepare(`
    SELECT opponent, MIN(game_date) next_game
      FROM matches
     WHERE game_date>=?
     GROUP BY opponent
     ORDER BY next_game
     LIMIT 6
  `).bind(now).all()).results||[];

  return rows.map(r=>r.opponent).filter(Boolean);
}

async function saveGame(db,g){
  await db.prepare(`
    INSERT INTO opponent_games(
      opponent,game_date,home_away,opponent_name,
      goals_for,goals_against,result,outcome,
      game_status,source,source_url,verified,updated_at
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET
      home_away=excluded.home_away,
      goals_for=excluded.goals_for,
      goals_against=excluded.goals_against,
      result=excluded.result,
      outcome=excluded.outcome,
      game_status=excluded.game_status,
      source=excluded.source,
      source_url=excluded.source_url,
      verified=excluded.verified,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    g.opponent,g.game_date,g.home_away,g.opponent_name,
    g.goals_for,g.goals_against,g.result,g.outcome,
    g.game_status,g.source,g.source_url,g.verified
  ).run();
}

async function run(context){
  const db=context.env.DB;
  const opponents=await upcomingOpponents(db);

  let searched=0,scraped=0,written=0,rateLimited=false;
  const details=[];

  for(const opponent of opponents){
    const item={opponent,search_results:0,pages_scraped:0,games_found:0,games_written:0,notes:[]};

    const s=await search(context.env,opponent);
    searched++;
    item.search_results=s.results.length;

    if(s.rate_limited){
      rateLimited=true;
      item.notes.push('Firecrawl 429 under search.');
      details.push(item);
      break;
    }

    const candidates=s.results
      .sort((a,b)=>{
        const au=a.url.includes('/stats/')?1:0;
        const bu=b.url.includes('/stats/')?1:0;
        return bu-au;
      })
      .slice(0,2);

    const normalized=[];

    for(const c of candidates){
      const x=await scrape(context.env,c.url,opponent);
      scraped++;
      item.pages_scraped++;

      if(x.rate_limited){
        rateLimited=true;
        item.notes.push('Firecrawl 429 under scrape.');
        break;
      }

      for(const g of x.games){
        const n=normalizeGame(opponent,g,c.url);
        if(n)normalized.push(n);
      }

      if(normalized.length>=5)break;
    }

    const unique=[];
    const seen=new Set();
    for(const g of normalized){
      const k=`${g.game_date}|${canon(g.opponent_name)}`;
      if(seen.has(k))continue;
      seen.add(k);
      unique.push(g);
    }

    unique.sort((a,b)=>String(b.game_date).localeCompare(String(a.game_date)));
    const last5=unique.slice(0,5);

    item.games_found=last5.length;

    for(const g of last5){
      await saveGame(db,g);
      written++;
      item.games_written++;
    }

    details.push(item);

    if(rateLimited)break;
  }

  return json({
    ok:true,
    version:'E30.5',
    opponents:opponents.length,
    searches:searched,
    scrapes:scraped,
    games_written:written,
    rate_limited:rateLimited,
    details
  });
}

export async function onRequestPost(context){
  if(!bearerOK(context.request,context.env))return json({ok:false,error:'Unauthorized'},401);
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);
  if(!context.env.FIRECRAWL_API_KEY)return json({ok:false,error:'FIRECRAWL_API_KEY saknas'},500);

  try{return await run(context)}
  catch(err){return json({ok:false,error:String(err)},500)}
}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);

  const rows=(await context.env.DB.prepare(`
    SELECT opponent,COUNT(*) games,MAX(game_date) latest
      FROM opponent_games
     WHERE verified=1
     GROUP BY opponent
     ORDER BY opponent
  `).all()).results||[];

  return json({ok:true,version:'E30.5',teams:rows});
}
