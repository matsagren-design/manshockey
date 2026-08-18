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
const months=["01","02","03","04","05","06","07","08","09","10","11","12"];
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
async function fcScrape(env,url){
 if(!env.FIRECRAWL_API_KEY)return '';
 const r=await fetch('https://api.firecrawl.dev/v1/scrape',{method:'POST',headers:{Authorization:`Bearer ${env.FIRECRAWL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true})});
 if(!r.ok)return '';
 const d=await r.json().catch(()=>null); return d?.data?.markdown||d?.markdown||'';
}
function parseDaily(md,date,target){
 const code=TEAM_CODES[target], games=[];
 if(!code)return games;
 const lines=String(md||'').split('\n').map(clean).filter(Boolean);
 // BCHL daily pages expose compact rows such as "BRK 5", "OKO 1", followed by Final.
 for(let i=0;i<lines.length;i++){
   const a=lines[i].match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
   if(!a)continue;
   for(let j=i+1;j<Math.min(i+8,lines.length);j++){
     const b=lines[j].match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
     if(!b||b[1]===a[1])continue;
     const window=lines.slice(i,Math.min(j+8,lines.length)).join(' ');
     if(!/\bFINAL\b|\bFinal\b/.test(window))continue;
     if(a[1]!==code&&b[1]!==code)break;
     const targetFirst=a[1]===code, other=targetFirst?b[1]:a[1];
     if(!CODE_TEAM[other])break;
     games.push({game_date:date,opponent_name:CODE_TEAM[other],goals_for:Number(targetFirst?a[2]:b[2]),goals_against:Number(targetFirst?b[2]:a[2]),home_away:targetFirst?'Away':'Home'});
     break;
   }
 }
 return games;
}
async function save(db,team,games,url){
 let n=0;
 for(const g of games){
  const outcome=g.goals_for>g.goals_against?'W':g.goals_for<g.goals_against?'L':'T';
  await db.prepare(`INSERT INTO opponent_games(opponent,game_date,home_away,opponent_name,goals_for,goals_against,result,outcome,game_status,source,source_url,verified,updated_at)
 VALUES(?,?,?,?,?,?,?,?,'Final','BCHL daily schedule',?,1,CURRENT_TIMESTAMP)
 ON CONFLICT(opponent,game_date,opponent_name) DO UPDATE SET home_away=excluded.home_away,goals_for=excluded.goals_for,goals_against=excluded.goals_against,result=excluded.result,outcome=excluded.outcome,source_url=excluded.source_url,verified=1,updated_at=CURRENT_TIMESTAMP`)
 .bind(team,g.game_date,g.home_away,g.opponent_name,g.goals_for,g.goals_against,`${g.goals_for}-${g.goals_against}`,outcome,url).run(); n++;
 }
 return n;
}
async function targets(db){
 const r=(await db.prepare(`SELECT id,opponent,game_date FROM matches WHERE game_date>=datetime('now') AND opponent IS NOT NULL AND trim(opponent)<>'' ORDER BY game_date LIMIT 12`).all()).results||[];
 const seen=new Set(),out=[]; for(const x of r){if(seen.has(x.opponent))continue;seen.add(x.opponent);out.push({match_id:Number(x.id),opponent:x.opponent,game_date:x.game_date});if(out.length>=6)break} return out;
}
function isoDate(d){return d.toISOString().slice(0,10)}
async function syncOne(env,db,target){
 const team=target.opponent, upcoming=new Date(target.game_date), found=[], checked=[];
 // Search backwards over recent completed-season dates. One daily page can contain all league games.
 for(let back=1;back<=75 && found.length<5;back++){
   const d=new Date(upcoming); d.setUTCDate(d.getUTCDate()-back);
   const ds=isoDate(d);
   // BCHL route uses non-zero-padded month/day.
   const url=`https://bchl.ca/stats/daily-schedule/${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
   // Keep Firecrawl as transport/fallback, but parse the official BCHL daily schedule structure.
   const md=await fcScrape(env,url); checked.push(ds);
   if(!md)continue;
   for(const g of parseDaily(md,ds,team)){
     if(!found.some(x=>x.game_date===g.game_date&&x.opponent_name===g.opponent_name))found.push(g);
     if(found.length>=5)break;
   }
 }
 const source='https://bchl.ca/stats/daily-schedule';
 const saved=await save(db,team,found.slice(0,5),source);
 return {ok:true,version:'E30.5.2',opponent:team,team_code:TEAM_CODES[team]||null,saved,games:found.slice(0,5),days_checked:checked.length};
}
export async function onRequestGet(c){
 if(!auth(c.request,c.env))return json({ok:false,error:'Unauthorized'},401);
 if(!c.env.DB)return json({ok:false,error:'D1 saknas'},500);
 return json({ok:true,version:'E30.5.2',mode:'BCHL daily schedule parser',targets:await targets(c.env.DB)});
}
export async function onRequestPost(c){
 if(!auth(c.request,c.env))return json({ok:false,error:'Unauthorized'},401);
 const b=await c.request.json().catch(()=>({})); const id=Number(b.match_id||0);
 if(!id)return json({ok:false,error:'match_id krävs'},400);
 const t=await c.env.DB.prepare('SELECT id,opponent,game_date FROM matches WHERE id=?').bind(id).first();
 if(!t)return json({ok:false,error:'Match hittades inte'},404);
 try{return json(await syncOne(c.env,c.env.DB,t))}catch(e){return json({ok:false,error:String(e),opponent:t.opponent},500)}
}