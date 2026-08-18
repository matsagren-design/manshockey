const SOURCE_URL = 'https://bchl.ca/stats/schedule/81/72/all-months?league=1';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function normalize(s=''){
  return String(s)
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function parseScore(v){
  const n=Number(String(v||'').replace(/[^\d]/g,''));
  return Number.isFinite(n) ? n : null;
}

function statusFromText(text){
  const t=String(text||'').toLowerCase();
  if(t.includes('final')) return 'Slut';
  if(t.includes('postpon')) return 'Uppskjuten';
  if(t.includes('cancel')) return 'Inställd';
  if(t.includes('intermission')) return 'Paus';
  if(/\b(1st|2nd|3rd|ot|so)\b/.test(t)) return 'Live';
  return 'Kommande';
}

/*
  BCHL/HockeyTech pages render schedule rows server-side.
  This parser is intentionally conservative:
  - extracts TR rows
  - strips HTML
  - only accepts rows containing Brooks
  - needs at least a date + two team names
  If the page structure changes and confidence is low, sync aborts without DB changes.
*/
function parseRows(html){
  const rows = [];
  const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for(const tr of trs){
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(normalize);
    if(cells.length < 5) continue;

    const joined = cells.join(' | ');
    if(!/\bBrooks\b/i.test(joined)) continue;

    // Try to identify date in the first few cells.
    const dateCell = cells.find(c =>
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}/i.test(c) ||
      /\d{4}-\d{2}-\d{2}/.test(c)
    ) || '';

    // Team cells: rows generally contain away team, score, home team, score.
    const teamCandidates = cells.filter(c =>
      /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(c) &&
      !/Final|Scheduled|Arena|Centre|Place|Rink|Attendance|Brooks Bandits/i.test(c)
    );

    // More tolerant direct detection around Brooks.
    let away='', home='', awayScore=null, homeScore=null;
    const brooksIndex = cells.findIndex(c => /^Brooks(?: Bandits)?$/i.test(c));

    if(brooksIndex >= 0){
      // Common schedule layouts:
      // date | away | away score | home | home score | arena | status ...
      if(brooksIndex === 1 || brooksIndex === 2){
        away = cells[brooksIndex];
        const possibleScore = cells[brooksIndex+1];
        const possibleHome = cells[brooksIndex+2];
        if(possibleHome && /^[A-Za-z]/.test(possibleHome)){
          awayScore = parseScore(possibleScore);
          home = possibleHome;
          homeScore = parseScore(cells[brooksIndex+3]);
        }
      }
      if(!away && brooksIndex >= 3){
        home = cells[brooksIndex];
        homeScore = parseScore(cells[brooksIndex+1]);
        const possibleAway = cells[brooksIndex-2];
        const possibleScore = cells[brooksIndex-1];
        if(possibleAway && /^[A-Za-z]/.test(possibleAway)){
          away = possibleAway;
          awayScore = parseScore(possibleScore);
        }
      }
    }

    if(!away || !home){
      // Fallback: find Brooks and nearest plausible team text.
      const cleanTeams = cells.filter(c =>
        /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(c) &&
        !/Final|Scheduled|Regular Season|Arena|Centre|Place|Rink/i.test(c)
      );
      const bi = cleanTeams.findIndex(c => /^Brooks(?: Bandits)?$/i.test(c));
      if(bi >= 0){
        if(bi > 0){ away = cleanTeams[bi-1]; home = cleanTeams[bi]; }
        else if(cleanTeams[bi+1]){ away = cleanTeams[bi]; home = cleanTeams[bi+1]; }
      }
    }

    if(!away || !home) continue;

    const opponent = /^Brooks(?: Bandits)?$/i.test(away) ? home : away;
    if(!opponent || /^Brooks(?: Bandits)?$/i.test(opponent)) continue;

    const statusText = cells.find(c => /Final|Scheduled|Postpon|Cancel|1st|2nd|3rd|OT|SO/i.test(c)) || '';
    const status = statusFromText(statusText);

    rows.push({
      date_label: dateCell,
      away: away.replace(/ Bandits$/i,''),
      home: home.replace(/ Bandits$/i,''),
      opponent,
      brooks_home: /^Brooks(?: Bandits)?$/i.test(home),
      away_score: awayScore,
      home_score: homeScore,
      status,
      raw_status: statusText,
      raw: cells
    });
  }
  return rows;
}

async function logStart(db){
  const r = await db.prepare(
    `INSERT INTO sync_runs(source,status,message) VALUES ('BCHL','running','Startar officiell BCHL-synk')`
  ).run();
  return r.meta?.last_row_id || null;
}

async function logFinish(db,id,fields){
  if(!id) return;
  await db.prepare(`
    UPDATE sync_runs SET finished_at=CURRENT_TIMESTAMP,status=?,
      games_found=?,games_matched=?,games_updated=?,message=?
    WHERE id=?
  `).bind(
    fields.status,fields.games_found||0,fields.games_matched||0,
    fields.games_updated||0,fields.message||'',id
  ).run();
}

function authOK(request,env){
  // Manual admin calls can pass no token only if there is a valid admin session.
  // Automated calls must use Authorization: Bearer <SYNC_TOKEN>.
  const auth=request.headers.get('Authorization')||'';
  if(env.SYNC_TOKEN && auth===`Bearer ${env.SYNC_TOKEN}`) return true;
  return false;
}

async function adminSessionOK(request,env){
  const cookie=request.headers.get('Cookie')||'';
  let sid=null;
  for(const p of cookie.split(';').map(x=>x.trim())){
    const[k,...v]=p.split('=');
    if(k==='mh_session') sid=decodeURIComponent(v.join('='));
  }
  if(!sid||!env.DB)return false;
  const u=await env.DB.prepare(
    'SELECT users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime("now") LIMIT 1'
  ).bind(sid).first();
  return u?.role==='admin';
}

async function runSync(context){
  const db=context.env.DB;
  if(!db) return json({ok:false,error:'D1 saknas'},500);

  const runId=await logStart(db);

  try{
    const response=await fetch(SOURCE_URL,{
      headers:{
        'User-Agent':'MansHockey/30.2 (+manshockey.com)',
        'Accept':'text/html,application/xhtml+xml'
      },
      cf:{cacheTtl:300,cacheEverything:false}
    });

    if(!response.ok){
      const msg=`BCHL svarade HTTP ${response.status}`;
      await logFinish(db,runId,{status:'error',message:msg});
      return json({ok:false,error:msg},502);
    }

    const html=await response.text();
    const rows=parseRows(html);

    // Fail closed. A full Brooks schedule should be far larger than a handful of rows.
    if(rows.length < 20){
      const msg=`Parsern hittade bara ${rows.length} Brooks-rader. Inga D1-ändringar gjordes.`;
      await logFinish(db,runId,{status:'parser_guard',games_found:rows.length,message:msg});
      return json({ok:false,safe_abort:true,error:msg,source_url:SOURCE_URL},422);
    }

    const matches=(await db.prepare(`
      SELECT id,external_id,opponent,game_date,home_away,result,
             brooks_goals,opponent_goals,game_status,tv_link,
             report_before,report_after
      FROM matches
      ORDER BY game_date
    `).all()).results||[];

    let matched=0,updated=0;
    const updates=[];

    for(const row of rows){
      // Result updates are only safe when a final/live score is present.
      if(row.status==='Kommande') continue;

      const candidates=matches.filter(m =>
        String(m.opponent||'').trim().toLowerCase() === String(row.opponent||'').trim().toLowerCase() &&
        String(m.home_away||'').toLowerCase() === (row.brooks_home?'hemma':'borta')
      );

      // If several same-opponent games exist, choose one whose month/day label best fits.
      // Never update if ambiguous.
      let target=null;
      if(candidates.length===1){
        target=candidates[0];
      }else{
        const monthDay=(row.date_label||'').toLowerCase();
        const filtered=candidates.filter(m=>{
          try{
            const d=new Date(m.game_date);
            const label=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/Edmonton'}).format(d).toLowerCase();
            return monthDay.includes(label.replace(',','')) || label.includes(monthDay);
          }catch{return false}
        });
        if(filtered.length===1) target=filtered[0];
      }

      if(!target) continue;
      matched++;

      let brooksGoals=null,oppGoals=null;
      if(row.brooks_home){
        brooksGoals=row.home_score; oppGoals=row.away_score;
      }else{
        brooksGoals=row.away_score; oppGoals=row.home_score;
      }

      if(brooksGoals===null || oppGoals===null) continue;

      const result=`${brooksGoals}-${oppGoals}`;
      await db.prepare(`
        UPDATE matches SET
          brooks_goals=?,
          opponent_goals=?,
          result=?,
          game_status=?,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(brooksGoals,oppGoals,result,row.status,target.id).run();

      updated++;
      updates.push({
        id:target.id,
        opponent:target.opponent,
        result,
        status:row.status
      });
    }

    const msg=`BCHL sync: ${rows.length} rader, ${matched} matchade, ${updated} resultat/status uppdaterade.`;
    await logFinish(db,runId,{
      status:'success',games_found:rows.length,games_matched:matched,
      games_updated:updated,message:msg
    });

    return json({
      ok:true,
      version:'E30.2',
      source:'BCHL official',
      source_url:SOURCE_URL,
      games_found:rows.length,
      games_matched:matched,
      games_updated:updated,
      updates
    });

  }catch(err){
    await logFinish(db,runId,{status:'error',message:String(err)});
    return json({ok:false,error:String(err)},500);
  }
}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);
  const latest=(await context.env.DB.prepare(
    `SELECT * FROM sync_runs WHERE source='BCHL' ORDER BY id DESC LIMIT 10`
  ).all()).results||[];
  return json({ok:true,version:'E30.2',source_url:SOURCE_URL,runs:latest});
}

export async function onRequestPost(context){
  const authorized=authOK(context.request,context.env) || await adminSessionOK(context.request,context.env);
  if(!authorized)return json({ok:false,error:'Unauthorized'},401);
  return runSync(context);
}
