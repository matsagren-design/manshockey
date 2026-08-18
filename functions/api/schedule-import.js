function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function getCookie(request,name){
  const c=request.headers.get('Cookie')||'';
  for(const p of c.split(';').map(x=>x.trim())){
    const[k,...v]=p.split('=');
    if(k===name)return decodeURIComponent(v.join('='));
  }
  return null;
}

async function requireAdmin(context){
  const sid=getCookie(context.request,'mh_session');
  if(!sid||!context.env.DB)return null;
  const u=await context.env.DB.prepare(
    'SELECT users.id,users.email,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime("now") LIMIT 1'
  ).bind(sid).first();
  return u?.role==='admin'?u:null;
}

async function schedule(request){
  const url=new URL('/data/brooks_schedule_2026_27.json',request.url);
  const r=await fetch(url.toString(),{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error(`Kunde inte läsa schedule JSON (${r.status})`);
  return await r.json();
}

/*
  Permanent dedupe strategy:
  1) Exact external_id match wins.
  2) Otherwise match a legacy/manual row on:
     - same opponent
     - same home/away
     - kickoff within 10 minutes after timezone normalization
  3) Adopt that legacy row by setting external_id on it.

  Import-controlled fields are updated.
  Manual/content fields such as tv_link, reports, result, AI text etc are NOT overwritten.
*/
async function findExisting(db,g){
  const byExternal=await db.prepare(
    'SELECT id,external_id,tv_link FROM matches WHERE external_id=? LIMIT 1'
  ).bind(g.external_id).first();
  if(byExternal)return byExternal;

  const byCanonical=await db.prepare(`
    SELECT id,external_id,tv_link
    FROM matches
    WHERE lower(trim(opponent))=lower(trim(?))
      AND lower(trim(home_away))=lower(trim(?))
      AND ABS(
        CAST(strftime('%s',game_date) AS INTEGER) -
        CAST(strftime('%s',?) AS INTEGER)
      ) <= 600
    ORDER BY
      CASE WHEN external_id IS NULL OR external_id='' THEN 0 ELSE 1 END,
      id
    LIMIT 1
  `).bind(g.opponent,g.home_away,g.game_date).first();

  return byCanonical||null;
}

export async function onRequestGet(context){
  try{
    const data=await schedule(context.request);
    return json({ok:true,...data,importer_version:'30.1.1'});
  }catch(err){
    return json({ok:false,error:String(err)},500);
  }
}

export async function onRequestPost(context){
  const admin=await requireAdmin(context);
  if(!admin)return json({ok:false,error:'Unauthorized'},401);

  try{
    const data=await schedule(context.request);

    let created=0;
    let updated=0;
    let adoptedLegacy=0;
    let failed=0;
    const errors=[];

    for(const g of data.games){
      try{
        const existing=await findExisting(context.env.DB,g);

        if(existing){
          const wasLegacy=!existing.external_id;

          await context.env.DB.prepare(`
            UPDATE matches SET
              external_id=?,
              opponent=?,
              game_date=?,
              home_away=?,
              arena=?,
              city=?,
              game_status=?,
              season_type=?,
              source=?,
              source_url=?,
              scout_priority=?,
              note=?,
              updated_at=CURRENT_TIMESTAMP
            WHERE id=?
          `).bind(
            g.external_id,
            g.opponent,
            g.game_date,
            g.home_away,
            g.arena,
            g.city,
            g.game_status,
            g.season_type,
            g.source,
            g.source_url,
            g.scout_priority,
            g.note,
            existing.id
          ).run();

          updated++;
          if(wasLegacy)adoptedLegacy++;
        }else{
          await context.env.DB.prepare(`
            INSERT INTO matches (
              external_id,opponent,game_date,home_away,arena,city,
              game_status,season_type,source,source_url,scout_priority,note
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
          `).bind(
            g.external_id,
            g.opponent,
            g.game_date,
            g.home_away,
            g.arena,
            g.city,
            g.game_status,
            g.season_type,
            g.source,
            g.source_url,
            g.scout_priority,
            g.note
          ).run();
          created++;
        }
      }catch(e){
        failed++;
        if(errors.length<8){
          errors.push({
            opponent:g.opponent,
            game_date:g.game_date,
            external_id:g.external_id,
            error:String(e)
          });
        }
      }
    }

    return json({
      ok:failed===0,
      importer_version:'30.1.1',
      created,
      updated,
      adopted_legacy:adoptedLegacy,
      failed,
      total:data.games.length,
      regular:data.regular_games_currently_known,
      preseason:data.preseason_games,
      errors
    },failed===0?200:207);

  }catch(err){
    return json({ok:false,error:String(err),importer_version:'30.1.1'},500);
  }
}
