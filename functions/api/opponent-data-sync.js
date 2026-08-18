function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}});
}
function auth(request,env){
  const h=request.headers.get('authorization')||'';
  return !!env.SYNC_TOKEN && h===`Bearer ${env.SYNC_TOKEN}`;
}
function norm(s){return String(s||'').trim()}
function dateOnly(s){return String(s||'').slice(0,10)}
async function firecrawlSearch(env,q){
  if(!env.FIRECRAWL_API_KEY)return [];
  const r=await fetch('https://api.firecrawl.dev/v1/search',{
    method:'POST',
    headers:{'Authorization':`Bearer ${env.FIRECRAWL_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({query:q,limit:5})
  });
  if(!r.ok) return [];
  const d=await r.json().catch(()=>null);
  return d?.data||[];
}
async function firecrawlScrape(env,url){
  if(!env.FIRECRAWL_API_KEY||!url)return '';
  const r=await fetch('https://api.firecrawl.dev/v1/scrape',{
    method:'POST',
    headers:{'Authorization':`Bearer ${env.FIRECRAWL_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true})
  });
  if(!r.ok)return '';
  const d=await r.json().catch(()=>null);
  return d?.data?.markdown||d?.markdown||'';
}
function parseGames(markdown,team){
  const out=[], lines=String(markdown||'').split(/\n+/);
  const score=/(\d{1,2})\s*[-–:]\s*(\d{1,2})/;
  const date=/\b(20\d{2}[-\/]\d{1,2}[-\/]\d{1,2})\b/;
  for(const line of lines){
    if(!line.toLowerCase().includes(team.toLowerCase()))continue;
    const sm=line.match(score), dm=line.match(date);
    if(!sm||!dm)continue;
    const parts=line.split(/\s{2,}|\s+[|·]\s+/).map(norm).filter(Boolean);
    let other=parts.find(x=>x!==team && !x.match(score) && !x.match(date) && x.length>2)||'Unknown';
    out.push({game_date:dm[1].replaceAll('/','-'),opponent_name:other,goals_for:Number(sm[1]),goals_against:Number(sm[2])});
  }
  return out.slice(0,5);
}
async function saveGames(db,team,games,sourceUrl){
  let saved=0;
  for(const g of games){
    const outcome=g.goals_for>g.goals_against?'W':g.goals_for<g.goals_against?'L':'T';
    await db.prepare(`INSERT INTO opponent_games
      (opponent,game_date,opponent_name,goals_for,goals_against,result,outcome,game_status,source,source_url,verified,updated_at)
      VALUES(?,?,?,?,?,?,?,'Final','BCHL',?,1,CURRENT_TIMESTAMP)
      ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET
      goals_for=excluded.goals_for,goals_against=excluded.goals_against,result=excluded.result,outcome=excluded.outcome,
      source_url=excluded.source_url,verified=1,updated_at=CURRENT_TIMESTAMP`)
      .bind(team,g.game_date,g.opponent_name,g.goals_for,g.goals_against,`${g.goals_for}-${g.goals_against}`,outcome,sourceUrl).run();
    saved++;
  }
  return saved;
}
async function listTargets(db){
  const rows=(await db.prepare(`SELECT id,opponent,game_date FROM matches
    WHERE game_date>=datetime('now') AND opponent IS NOT NULL AND trim(opponent)<>''
    ORDER BY game_date ASC LIMIT 12`).all()).results||[];
  const seen=new Set(), targets=[];
  for(const r of rows){
    const k=norm(r.opponent).toLowerCase();
    if(seen.has(k))continue; seen.add(k);
    targets.push({match_id:Number(r.id),opponent:norm(r.opponent),game_date:r.game_date});
    if(targets.length>=6)break;
  }
  return targets;
}
async function syncOne(env,db,target){
  const team=norm(target.opponent);
  const queries=[`site:bchl.ca "${team}" 2026 results`,`site:bchl.ca/stats "${team}" schedule results`];
  let searches=0;
  for(const q of queries){
    const results=await firecrawlSearch(env,q); searches++;
    for(const hit of results.slice(0,2)){
      const url=hit?.url||hit?.link;
      if(!url||!String(url).includes('bchl.ca'))continue;
      const md=await firecrawlScrape(env,url);
      const games=parseGames(md,team);
      if(games.length){
        const saved=await saveGames(db,team,games,url);
        return {ok:true,opponent:team,saved,searches,source_url:url};
      }
    }
  }
  return {ok:true,opponent:team,saved:0,searches,note:'Ingen verifierbar resultatserie hittades.'};
}
export async function onRequestGet(context){
  if(!auth(context.request,context.env))return json({ok:false,error:'Unauthorized'},401);
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);
  const targets=await listTargets(context.env.DB);
  return json({ok:true,version:'E30.5.1',mode:'batched',targets});
}
export async function onRequestPost(context){
  if(!auth(context.request,context.env))return json({ok:false,error:'Unauthorized'},401);
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);
  const body=await context.request.json().catch(()=>({}));
  const matchId=Number(body.match_id||0);
  let target=null;
  if(matchId) target=await context.env.DB.prepare('SELECT id,opponent,game_date FROM matches WHERE id=? LIMIT 1').bind(matchId).first();
  if(!target&&body.opponent) target={id:0,opponent:norm(body.opponent),game_date:null};
  if(!target)return json({ok:false,error:'match_id eller opponent krävs'},400);
  try{return json(await syncOne(context.env,context.env.DB,target))}
  catch(e){return json({ok:false,error:String(e),opponent:target.opponent},500)}
}