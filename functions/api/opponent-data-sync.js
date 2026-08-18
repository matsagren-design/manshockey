function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}})}
function auth(req,env){return !!env.SYNC_TOKEN&&(req.headers.get('authorization')||'')===`Bearer ${env.SYNC_TOKEN}`}
const TEAM_CODES={
"Spruce Grove Saints":"SGS","Okotoks Oilers":"OKO","Blackfalds Bulldogs":"BFB","Sherwood Park Crusaders":"SPC",
"Alberni Valley Bulldogs":"AV","Cowichan Valley Capitals":"CV","Brooks Bandits":"BRK","Cranbrook Bucks":"CRA",
"West Kelowna Warriors":"WK","Salmon Arm Silverbacks":"SA","Vernon Vipers":"VER","Trail Smoke Eaters":"TRA",
"Surrey Eagles":"SUR","Coquitlam Express":"COQ","Chilliwack Chiefs":"CHW","Langley Rivermen":"LAN",
"Nanaimo Clippers":"NAN","Victoria Grizzlies":"VIC","Prince George Spruce Kings":"PG","Powell River Kings":"PR"
};
const CODE_TEAM=Object.fromEntries(Object.entries(TEAM_CODES).map(([k,v])=>[v,k]));
function clean(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'-').replace(/\r/g,'')}
function isoDate(d){return d.toISOString().slice(0,10)}
async function fetchOfficial(url){
 const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),7000);
 try{
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 MansHockey/30.5.3','accept':'text/html,application/xhtml+xml'},signal:ctl.signal});
  if(!r.ok)return '';
  return await r.text();
 }catch{return ''}finally{clearTimeout(timer)}
}
function parseDaily(raw,date,wantedCodes){
 const text=clean(raw), lines=text.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean), games=[];
 // Server-rendered BCHL daily pages contain compact score rows: CODE score ... CODE score ... FINAL.
 for(let i=0;i<lines.length;i++){
  const a=lines[i].match(/^([A-Z]{2,3})\s+(\d{1,2})$/); if(!a||!CODE_TEAM[a[1]])continue;
  for(let j=i+1;j<Math.min(i+14,lines.length);j++){
   const b=lines[j].match(/^([A-Z]{2,3})\s+(\d{1,2})$/); if(!b||!CODE_TEAM[b[1]]||b[1]===a[1])continue;
   const win=lines.slice(i,Math.min(j+12,lines.length)).join(' ');
   if(!/\bFINAL\b/i.test(win))continue;
   if(!wantedCodes.has(a[1])&&!wantedCodes.has(b[1]))break;
   games.push({date,away_code:a[1],home_code:b[1],away_goals:Number(a[2]),home_goals:Number(b[2])});
   break;
  }
 }
 return games;
}
async function saveGame(db,team,g){
 const code=TEAM_CODES[team]; if(!code)return 0;
 const isAway=g.away_code===code, other=isAway?g.home_code:g.away_code;
 if(!isAway&&g.home_code!==code)return 0;
 const gf=isAway?g.away_goals:g.home_goals, ga=isAway?g.home_goals:g.away_goals;
 const outcome=gf>ga?'W':gf<ga?'L':'T';
 await db.prepare(`INSERT INTO opponent_games(opponent,game_date,home_away,opponent_name,goals_for,goals_against,result,outcome,game_status,source,source_url,verified,updated_at)
 VALUES(?,?,?,?,?,?,?,?,'Final','BCHL league schedule cache',?,1,CURRENT_TIMESTAMP)
 ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET home_away=excluded.home_away,goals_for=excluded.goals_for,goals_against=excluded.goals_against,result=excluded.result,outcome=excluded.outcome,source=excluded.source,source_url=excluded.source_url,verified=1,updated_at=CURRENT_TIMESTAMP`)
 .bind(team,g.date,isAway?'Away':'Home',CODE_TEAM[other],gf,ga,`${gf}-${ga}`,outcome,`https://bchl.ca/stats/daily-schedule/${Number(g.date.slice(0,4))}-${Number(g.date.slice(5,7))}-${Number(g.date.slice(8,10))}`).run();
 return 1;
}
async function targets(db){
 const r=(await db.prepare(`SELECT id,opponent,game_date FROM matches WHERE game_date>=datetime('now') AND opponent IS NOT NULL AND trim(opponent)<>'' ORDER BY game_date LIMIT 14`).all()).results||[];
 const seen=new Set(),out=[]; for(const x of r){if(seen.has(x.opponent)||!TEAM_CODES[x.opponent])continue;seen.add(x.opponent);out.push({match_id:Number(x.id),opponent:x.opponent,game_date:x.game_date});if(out.length>=6)break} return out;
}
function candidateDates(ts){
 const upcoming=new Date(ts); const end=new Date(upcoming); end.setUTCDate(end.getUTCDate()-90);
 const start=new Date(end); start.setUTCDate(start.getUTCDate()-84);
 const dates=[];
 for(let d=new Date(end);d>=start;d.setUTCDate(d.getUTCDate()-1)){
  // BCHL games overwhelmingly fall Wed/Fri/Sat/Sun; this keeps the whole cache refresh under the Worker subrequest budget.
  if([0,3,5,6].includes(d.getUTCDay()))dates.push(new Date(d));
 }
 return dates;
}
async function mapLimit(items,limit,fn){
 const out=new Array(items.length); let next=0;
 async function worker(){while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return out;
}
async function syncLeague(env,db){
 const ts=await targets(db); if(!ts.length)return {ok:true,version:'E30.5.3',targets:0,pages_fetched:0,games_found:0,saved:0,details:[]};
 const wanted=new Set(ts.map(t=>TEAM_CODES[t.opponent]).filter(Boolean));
 // One shared historical window, fetched once, then reused for every opponent.
 const dates=candidateDates(ts[0].game_date);
 const pages=await mapLimit(dates,6,async d=>{
  const ds=isoDate(d),url=`https://bchl.ca/stats/daily-schedule/${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
  const html=await fetchOfficial(url); return {ds,url,html};
 });
 const pool=[];
 for(const p of pages){if(!p?.html)continue; for(const g of parseDaily(p.html,p.ds,wanted))pool.push(g)}
 const details=[]; let saved=0;
 for(const t of ts){
  const code=TEAM_CODES[t.opponent];
  const games=pool.filter(g=>g.away_code===code||g.home_code===code).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  let n=0; for(const g of games)n+=await saveGame(db,t.opponent,g); saved+=n;
  details.push({match_id:t.match_id,opponent:t.opponent,team_code:code,found:games.length,saved:n,games});
 }
 return {ok:true,version:'E30.5.3',mode:'league schedule cache',strategy:'single shared BCHL window; direct official fetch; local opponent matching',targets:ts.length,pages_planned:dates.length,pages_fetched:pages.filter(p=>p?.html).length,games_found:pool.length,saved,details};
}
export async function onRequestGet(c){
 if(!auth(c.request,c.env))return json({ok:false,error:'Unauthorized'},401);
 if(!c.env.DB)return json({ok:false,error:'D1 saknas'},500);
 return json({ok:true,version:'E30.5.3',mode:'league schedule cache',targets:await targets(c.env.DB)});
}
export async function onRequestPost(c){
 if(!auth(c.request,c.env))return json({ok:false,error:'Unauthorized'},401);
 if(!c.env.DB)return json({ok:false,error:'D1 saknas'},500);
 try{return json(await syncLeague(c.env,c.env.DB))}catch(e){return json({ok:false,version:'E30.5.3',error:String(e)},500)}
}
