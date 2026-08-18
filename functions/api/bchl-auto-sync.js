const SOURCE_URL = 'https://bchl.ca/schedule';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function cleanTeam(value=''){
  return String(value)
    .replace(/\s+/g,' ')
    .replace(/\bBandits\b/i,'')
    .trim();
}

function canonTeam(value=''){
  return cleanTeam(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function isBrooks(value=''){
  const s=String(value).toLowerCase();
  return s.includes('brooks');
}

function statusSv(value=''){
  const s=String(value).toLowerCase();
  if(/final|completed|complete|ended/.test(s)) return 'Slut';
  if(/postpon/.test(s)) return 'Uppskjuten';
  if(/cancel/.test(s)) return 'Inställd';
  if(/intermission/.test(s)) return 'Paus';
  if(/live|1st|2nd|3rd|overtime|\bot\b|shootout|\bso\b/.test(s)) return 'Live';
  return 'Kommande';
}

function parseScore(v){
  if(v===null || v===undefined || v==='') return null;
  const n=Number(String(v).trim());
  return Number.isFinite(n) && n>=0 && n<30 ? n : null;
}

function gameDate(value){
  if(!value) return null;
  const d=new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function albertaDateKey(value){
  const d=gameDate(value);
  if(!d) return null;
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Edmonton',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function normalizeExtractedDate(value){
  if(!value) return null;
  // Firecrawl prompt asks for YYYY-MM-DD. Accept ISO timestamps too.
  const m=String(value).match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d=new Date(value);
  if(!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Edmonton',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).format(d);
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

function bearerOK(request,env){
  const auth=request.headers.get('Authorization')||'';
  return Boolean(env.SYNC_TOKEN && auth===`Bearer ${env.SYNC_TOKEN}`);
}

async function logStart(db){
  const r=await db.prepare(
    `INSERT INTO sync_runs(source,status,message)
     VALUES ('BCHL','running','E30.2.1 Firecrawl sync start')`
  ).run();
  return r.meta?.last_row_id || null;
}

async function logFinish(db,id,status,found,matched,updated,message){
  if(!id)return;
  await db.prepare(`
    UPDATE sync_runs
       SET finished_at=CURRENT_TIMESTAMP,
           status=?,
           games_found=?,
           games_matched=?,
           games_updated=?,
           message=?
     WHERE id=?
  `).bind(status,found||0,matched||0,updated||0,message||'',id).run();
}

async function fetchBchlGames(env){
  if(!env.FIRECRAWL_API_KEY){
    throw new Error('FIRECRAWL_API_KEY saknas i Cloudflare runtime');
  }

  const schema={
    type:'object',
    properties:{
      games:{
        type:'array',
        items:{
          type:'object',
          properties:{
            date:{
              type:'string',
              description:'Game date in YYYY-MM-DD, using the date shown by BCHL.'
            },
            away_team:{type:'string'},
            home_team:{type:'string'},
            away_score:{
              anyOf:[{type:'integer'},{type:'null'}]
            },
            home_score:{
              anyOf:[{type:'integer'},{type:'null'}]
            },
            status:{type:'string'},
            game_center_url:{type:'string'},
            watch_url:{type:'string'}
          },
          required:['date','away_team','home_team','status']
        }
      }
    },
    required:['games']
  };

  const prompt = `
Extract the BCHL schedule/scoreboard games involving Brooks Bandits only.
Use only information visibly present on the official BCHL page.
For every Brooks game return:
- date as YYYY-MM-DD
- away_team
- home_team
- away_score and home_score only when a score is actually shown; otherwise null
- status exactly as shown or a short equivalent such as Scheduled, Live, Final, Postponed or Cancelled
- game_center_url if present, otherwise empty string
- watch_url if present, otherwise empty string.
Do not invent games, dates, scores, statuses or links.
Return all Brooks games visible in the currently selected 2026-27 season.
`;

  const response=await fetch(FIRECRAWL_URL,{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.FIRECRAWL_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      url:SOURCE_URL,
      formats:[{
        type:'json',
        prompt,
        schema
      }],
      onlyMainContent:false,
      onlyCleanContent:false,
      waitFor:5000,
      timeout:120000,
      proxy:'auto',
      maxAge:300000,
      storeInCache:true,
      location:{
        country:'CA',
        languages:['en-CA']
      }
    })
  });

  const payload=await response.json().catch(()=>null);

  if(!response.ok){
    throw new Error(`Firecrawl HTTP ${response.status}: ${payload?.error||'okänt fel'}`);
  }
  if(!payload?.success){
    throw new Error(`Firecrawl misslyckades: ${payload?.error||'okänt fel'}`);
  }

  // v2 scrape response: structured extraction is normally under data.json.
  const extracted=payload?.data?.json || payload?.json || null;
  const games=Array.isArray(extracted?.games) ? extracted.games : [];

  return {
    games,
    metadata:payload?.data?.metadata||{},
    scrape_id:payload?.data?.scrapeId||payload?.id||null
  };
}

async function runSync(context){
  const db=context.env.DB;
  const runId=await logStart(db);

  try{
    const fc=await fetchBchlGames(context.env);
    const extracted=fc.games;

    // Fail closed. We already know Brooks has a full season in D1.
    // A rendered season page returning fewer than 20 Brooks games is not trusted.
    if(extracted.length<20){
      const msg=`Firecrawl hittade bara ${extracted.length} Brooks-matcher. Inga D1-ändringar gjordes.`;
      await logFinish(db,runId,'parser_guard',extracted.length,0,0,msg);
      return json({
        ok:false,
        safe_abort:true,
        version:'E30.2.1',
        source:'BCHL + Firecrawl',
        source_url:SOURCE_URL,
        games_found:extracted.length,
        error:msg,
        sample:extracted.slice(0,3)
      },422);
    }

    const existing=(await db.prepare(`
      SELECT id,opponent,game_date,home_away,result,
             brooks_goals,opponent_goals,game_status,tv_link,
             report_before,report_after
        FROM matches
       ORDER BY game_date
    `).all()).results||[];

    let matched=0;
    let updated=0;
    const updates=[];
    const rejected=[];

    for(const g of extracted){
      if(!g || (!isBrooks(g.away_team) && !isBrooks(g.home_team))) continue;

      const brooksHome=isBrooks(g.home_team);
      const opponent=brooksHome ? g.away_team : g.home_team;
      const opponentCanon=canonTeam(opponent);
      const dateKey=normalizeExtractedDate(g.date);

      if(!opponentCanon || !dateKey){
        rejected.push({reason:'missing-opponent-or-date',game:g});
        continue;
      }

      // Strong matching: exact opponent + exact Alberta calendar date + home/away.
      const candidates=existing.filter(m=>
        canonTeam(m.opponent)===opponentCanon &&
        albertaDateKey(m.game_date)===dateKey &&
        String(m.home_away||'').toLowerCase()===(brooksHome?'hemma':'borta')
      );

      if(candidates.length!==1){
        rejected.push({
          reason:candidates.length===0?'no-d1-match':'ambiguous-d1-match',
          date:dateKey,
          opponent,
          candidates:candidates.map(x=>x.id)
        });
        continue;
      }

      const target=candidates[0];
      matched++;

      const status=statusSv(g.status);
      const awayScore=parseScore(g.away_score);
      const homeScore=parseScore(g.home_score);

      // Upcoming games: status may safely move to postponed/cancelled,
      // but we do not overwrite scheduled "Kommande" just for cosmetic reasons.
      if(status==='Uppskjuten' || status==='Inställd'){
        await db.prepare(`
          UPDATE matches
             SET game_status=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?
        `).bind(status,target.id).run();
        updated++;
        updates.push({id:target.id,opponent:target.opponent,status});
        continue;
      }

      // Live/final updates require a real visible score.
      if((status==='Live' || status==='Slut') &&
         awayScore!==null && homeScore!==null){

        const brooksGoals=brooksHome?homeScore:awayScore;
        const opponentGoals=brooksHome?awayScore:homeScore;
        const result=`${brooksGoals}-${opponentGoals}`;

        await db.prepare(`
          UPDATE matches
             SET brooks_goals=?,
                 opponent_goals=?,
                 result=?,
                 game_status=?,
                 updated_at=CURRENT_TIMESTAMP
           WHERE id=?
        `).bind(
          brooksGoals,opponentGoals,result,status,target.id
        ).run();

        updated++;
        updates.push({
          id:target.id,
          opponent:target.opponent,
          date:dateKey,
          status,
          result
        });
      }
    }

    // Safety check: if extraction found a full season but almost none can be tied
    // to the imported D1 schedule, assume extraction/date interpretation is bad.
    // No rollback is needed because score/status writes above only happen for
    // exact high-confidence matches; nevertheless surface a warning.
    const matchRatio=matched/extracted.length;
    const status=matchRatio<0.5?'warning':'success';
    const msg=`E30.2.1: ${extracted.length} Brooks-matcher extraherade, ${matched} säkert matchade mot D1, ${updated} resultat/status uppdaterade.`;

    await logFinish(db,runId,status,extracted.length,matched,updated,msg);

    return json({
      ok:true,
      version:'E30.2.1',
      source:'Official BCHL via Firecrawl',
      source_url:SOURCE_URL,
      games_found:extracted.length,
      games_matched:matched,
      games_updated:updated,
      match_ratio:Number(matchRatio.toFixed(3)),
      updates,
      rejected:rejected.slice(0,12)
    });

  }catch(err){
    const msg=String(err);
    await logFinish(db,runId,'error',0,0,0,msg);
    return json({ok:false,version:'E30.2.1',error:msg},500);
  }
}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);
  const latest=(await context.env.DB.prepare(
    `SELECT * FROM sync_runs WHERE source='BCHL' ORDER BY id DESC LIMIT 10`
  ).all()).results||[];

  return json({
    ok:true,
    version:'E30.2.1',
    source:'Official BCHL via Firecrawl',
    source_url:SOURCE_URL,
    firecrawl_configured:Boolean(context.env.FIRECRAWL_API_KEY),
    runs:latest
  });
}

export async function onRequestPost(context){
  const authorized=bearerOK(context.request,context.env) ||
                   await adminSessionOK(context.request,context.env);

  if(!authorized)return json({ok:false,error:'Unauthorized'},401);
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);

  return runSync(context);
}
