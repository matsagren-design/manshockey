function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}})}
function getCookie(request,name){const c=request.headers.get('Cookie')||'';for(const p of c.split(';').map(x=>x.trim())){const[k,...v]=p.split('=');if(k===name)return decodeURIComponent(v.join('='))}return null}
async function requireAdmin(context){const sid=getCookie(context.request,'mh_session');if(!sid||!context.env.DB)return null;const u=await context.env.DB.prepare('SELECT users.id,users.email,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime("now") LIMIT 1').bind(sid).first();return u?.role==='admin'?u:null}
async function schedule(request){
  const url=new URL('/data/brooks_schedule_2026_27.json',request.url);
  const r=await fetch(url.toString(),{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error('Kunde inte läsa schedule JSON');
  return await r.json();
}
export async function onRequestGet(context){
  try{const data=await schedule(context.request);return json({ok:true,...data})}
  catch(err){return json({ok:false,error:String(err)},500)}
}
export async function onRequestPost(context){
  const admin=await requireAdmin(context);
  if(!admin)return json({ok:false,error:'Unauthorized'},401);
  try{
    const data=await schedule(context.request);
    let created=0,updated=0,failed=0;
    for(const g of data.games){
      try{
        const existing=await context.env.DB.prepare('SELECT id FROM matches WHERE external_id=? LIMIT 1').bind(g.external_id).first();
        if(existing){
          await context.env.DB.prepare(`UPDATE matches SET opponent=?,game_date=?,home_away=?,arena=?,city=?,game_status=?,season_type=?,source=?,source_url=?,scout_priority=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
            .bind(g.opponent,g.game_date,g.home_away,g.arena,g.city,g.game_status,g.season_type,g.source,g.source_url,g.scout_priority,g.note,existing.id).run();
          updated++;
        }else{
          await context.env.DB.prepare(`INSERT INTO matches (external_id,opponent,game_date,home_away,arena,city,game_status,season_type,source,source_url,scout_priority,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
            .bind(g.external_id,g.opponent,g.game_date,g.home_away,g.arena,g.city,g.game_status,g.season_type,g.source,g.source_url,g.scout_priority,g.note).run();
          created++;
        }
      }catch(e){failed++}
    }
    return json({ok:true,created,updated,failed,total:data.games.length,regular:data.regular_games_currently_known,preseason:data.preseason_games});
  }catch(err){return json({ok:false,error:String(err)},500)}
}
