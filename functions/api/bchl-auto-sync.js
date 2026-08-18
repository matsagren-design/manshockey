const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v2/search';
const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const SEASON_START = '2026-09-01T00:00:00Z';
const SEASON_END   = '2027-04-20T23:59:59Z';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8'}
  });
}

function cleanTeam(value=''){
  return String(value).replace(/\s+/g,' ').replace(/\bBandits\b/i,'').trim();
}

function canonTeam(value=''){
  return cleanTeam(value).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ').trim();
}

function isBrooks(value=''){
  return String(value).toLowerCase().includes('brooks');
}

function parseScore(v){
  if(v===null || v===undefined || v==='') return null;
  const n=Number(String(v).trim());
  return Number.isFinite(n) && n>=0 && n<30 ? n : null;
}

function statusSv(value=''){
  const s=String(value||'').toLowerCase();
  if(/final|completed|complete|ended/.test(s)) return 'Slut';
  if(/postpon/.test(s)) return 'Uppskjuten';
  if(/cancel/.test(s)) return 'Inställd';
  if(/intermission/.test(s)) return 'Paus';
  if(/live|1st|2nd|3rd|overtime|\bot\b|shootout|\bso\b/.test(s)) return 'Live';
  return 'Kommande';
}

function gameDate(value){
  if(!value) return null;
  const d=new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function albertaDateKey(value){
  const d=gameDate(value);
  if(!d)return null;
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Edmonton',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function humanDate(value){
  const d=gameDate(value);
  if(!d)return '';
  return new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Edmonton',
    month:'long',day:'numeric',year:'numeric'
  }).format(d);
}

function normalizeExtractedDate(value){
  if(!value)return null;
  const m=String(value).match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  const d=new Date(value);
  return Number.isFinite(d.getTime()) ? albertaDateKey(d) : null;
}

function safeUrl(value=''){
  try{
    const u=new URL(value);
    if(u.protocol!=='https:' && u.protocol!=='http:')return '';
    return u.toString();
  }catch{return ''}
}

function validFloEventUrl(value=''){
  try{
    const u=new URL(value);
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(host!=='flohockey.tv') return '';
    if(!/^\/events\/[^/]+/i.test(u.pathname)) return '';
    return u.toString();
  }catch{return ''}
}

function validBchlGameCenterUrl(value=''){
  try{
    const u=new URL(value);
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(host!=='bchl.ca') return '';
    if(!/^\/stats\/game-center\/\d+/i.test(u.pathname)) return '';
    return `${u.protocol}//${u.host}${u.pathname}`;
  }catch{return ''}
}

function hasSpecificFlo(value=''){ return Boolean(validFloEventUrl(value)); }
function hasGameCenter(value=''){ return Boolean(validBchlGameCenterUrl(value)); }

function matchTiming(m){
  const t=new Date(m.game_date).getTime();
  const now=Date.now();
  if(!Number.isFinite(t))return {valid:false};
  const hours=(t-now)/36e5;
  return {
    valid:true,
    hours,
    farFuture:hours>72,
    nearGame:hours<=72 && hours>=-48,
    recent:hours<0 && hours>=-240,
    old:hours<-240
  };
}

async function adminSessionOK(request,env){
  const cookie=request.headers.get('Cookie')||'';
  let sid=null;
  for(const p of cookie.split(';').map(x=>x.trim())){
    const[k,...v]=p.split('=');
    if(k==='mh_session')sid=decodeURIComponent(v.join('='));
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
     VALUES ('BCHL','running','E30.2.6 Ultra Lean Sync start')`
  ).run();
  return r.meta?.last_row_id||null;
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

async function selectTargets(db){
  const all=(await db.prepare(`
    SELECT id,external_id,opponent,game_date,home_away,arena,city,
           game_status,result,brooks_goals,opponent_goals,tv_link,
           game_center_url,season_type,source_url
      FROM matches
     WHERE game_date>=? AND game_date<=?
     ORDER BY game_date
  `).bind(SEASON_START,SEASON_END).all()).results||[];

  const scored = all.map(m=>{
    const timing=matchTiming(m);
    const flo=hasSpecificFlo(m.tv_link);
    const gc=hasGameCenter(m.game_center_url);
    const completeLinks=flo && gc;

    if(!timing.valid)return {...m,_skip:true,_reason:'invalid-date'};

    // Near/current/recent games are always worth checking for status/result.
    if(timing.nearGame)return {...m,_skip:false,_priority:0,_timing:timing,_hasFlo:flo,_hasGc:gc};
    if(timing.recent && String(m.game_status||'')!=='Slut')
      return {...m,_skip:false,_priority:1,_timing:timing,_hasFlo:flo,_hasGc:gc};

    // Far-future complete link set: skip until near match day.
    if(timing.farFuture && completeLinks)
      return {...m,_skip:true,_reason:'complete-far-future'};

    // Upcoming incomplete links: enrich.
    if(timing.hours>=0 && !completeLinks)
      return {...m,_skip:false,_priority:2,_timing:timing,_hasFlo:flo,_hasGc:gc};

    // Old finals: skip.
    if(timing.old && String(m.game_status||'')==='Slut')
      return {...m,_skip:true,_reason:'old-final'};

    return {...m,_skip:false,_priority:3,_timing:timing,_hasFlo:flo,_hasGc:gc};
  });

  return scored
    .filter(m=>!m._skip)
    .sort((a,b)=>a._priority-b._priority || new Date(a.game_date)-new Date(b.game_date))
    .slice(0,3); // Leaner: max 3 targets/run
}

class RateLimitError extends Error{
  constructor(message,retryAfter=''){
    super(message);
    this.name='RateLimitError';
    this.retryAfter=retryAfter;
  }
}

async function firecrawlSearch(env,query,domains){
  const r=await fetch(FIRECRAWL_SEARCH_URL,{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.FIRECRAWL_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      query,
      limit:6,
      includeDomains:domains,
      country:'CA',
      location:'Alberta,Canada',
      safe:true,
      timeout:30000,
      ignoreInvalidURLs:true,
      highlights:false
    })
  });

  const data=await r.json().catch(()=>null);
  if(r.status===429){
    throw new RateLimitError('Firecrawl rate limit 429',r.headers.get('retry-after')||'');
  }
  if(!r.ok || !data?.success){
    throw new Error(`Firecrawl search ${r.status}: ${data?.error||'okänt fel'}`);
  }

  return (data?.data?.web||[]).map(x=>({
    url:safeUrl(x.url),
    title:x.title||'',
    description:x.description||''
  })).filter(x=>x.url);
}

function candidateRank(x,target){
  const u=x.url.toLowerCase();
  const text=`${x.title} ${x.description}`.toLowerCase();
  const opp=String(target.opponent||'').toLowerCase();
  let score=0;
  if(u.includes('/stats/game-center/'))score+=150;
  if(u.includes('flohockey.tv/events/'))score+=140;
  if(text.includes('brooks'))score+=25;
  if(text.includes(opp))score+=25;
  return score;
}

function dedupeResults(items){
  const out=[],seen=new Set();
  for(const x of items){
    if(!x.url || seen.has(x.url))continue;
    seen.add(x.url); out.push(x);
  }
  return out;
}

/*
 Ultra-lean search:
 - one primary query for exactly what is missing
 - optional one fallback query ONLY when primary yielded no candidates
 - if both links missing, one BCHL primary + one Flo primary
 - near game with complete links: BCHL status query only
*/
async function ultraLeanSearch(env,target){
  const longDate=humanDate(target.game_date);
  const isoDate=albertaDateKey(target.game_date);
  const opp=target.opponent;
  const needGc=!hasGameCenter(target.game_center_url);
  const needFlo=!hasSpecificFlo(target.tv_link);
  const needStatus=target._timing?.nearGame || target._timing?.recent;

  const plans=[];

  if(needGc || needStatus){
    plans.push({
      kind:'bchl',
      domains:['bchl.ca'],
      primary:`"Brooks Bandits" "${opp}" "${longDate}"`,
      fallback:`"Brooks Bandits" "${opp}" "${isoDate}"`
    });
  }

  if(needFlo){
    plans.push({
      kind:'flo',
      domains:['flohockey.tv'],
      primary:`"Brooks Bandits" "${opp}" "${longDate}"`,
      fallback:`"Brooks Bandits" "${opp}" "${isoDate}"`
    });
  }

  const all=[];
  let searches=0;
  let rateLimited=false;
  const trace=[];

  for(const plan of plans){
    try{
      let r=await firecrawlSearch(env,plan.primary,plan.domains);
      searches++;
      trace.push({kind:plan.kind,phase:'primary',count:r.length});

      if(r.length===0){
        r=await firecrawlSearch(env,plan.fallback,plan.domains);
        searches++;
        trace.push({kind:plan.kind,phase:'fallback',count:r.length});
      }

      all.push(...r);
    }catch(err){
      if(err instanceof RateLimitError){
        rateLimited=true;
        trace.push({kind:plan.kind,phase:'rate-limit'});
        break;
      }
      throw err;
    }
  }

  return {
    results:dedupeResults(all)
      .sort((a,b)=>candidateRank(b,target)-candidateRank(a,target))
      .slice(0,6),
    searches,
    rateLimited,
    trace
  };
}

async function scrapeCandidate(env,url,target){
  const schema={
    type:'object',
    properties:{
      is_target_game:{type:'boolean'},
      date:{type:'string'},
      away_team:{type:'string'},
      home_team:{type:'string'},
      away_score:{anyOf:[{type:'integer'},{type:'null'}]},
      home_score:{anyOf:[{type:'integer'},{type:'null'}]},
      status:{type:'string'},
      game_center_url:{type:'string'},
      watch_url:{type:'string'}
    },
    required:['is_target_game','date','away_team','home_team','status']
  };

  const dateKey=albertaDateKey(target.game_date);
  const prompt=`
Target hockey game:
- Brooks Bandits
- opponent: ${target.opponent}
- Alberta date: ${dateKey}
- Brooks is ${String(target.home_away).toLowerCase()==='hemma'?'HOME':'AWAY'}

Set is_target_game=true ONLY if this page clearly describes this exact game.
Return date YYYY-MM-DD, away_team, home_team, score if visible, status,
official BCHL Game Center URL if visible,
and DIRECT FloHockey event URL if visible.
Never invent or infer a different date/match.
`;

  const r=await fetch(FIRECRAWL_SCRAPE_URL,{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.FIRECRAWL_API_KEY}`,
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

  const data=await r.json().catch(()=>null);
  if(r.status===429) throw new RateLimitError('Firecrawl scrape rate limit 429',r.headers.get('retry-after')||'');
  if(!r.ok || !data?.success)return null;

  const j=data?.data?.json||data?.json||null;
  return j && typeof j==='object' ? j : null;
}

function verifyExtract(target,j){
  if(!j?.is_target_game)return {ok:false,reason:'extract-says-not-target'};
  const targetDate=albertaDateKey(target.game_date);
  const extractedDate=normalizeExtractedDate(j.date);
  if(!targetDate || extractedDate!==targetDate)return {ok:false,reason:'date-mismatch'};

  const brooksHome=String(target.home_away||'').toLowerCase()==='hemma';
  const away=canonTeam(j.away_team);
  const home=canonTeam(j.home_team);
  const opp=canonTeam(target.opponent);

  if(brooksHome){
    if(!isBrooks(j.home_team) || away!==opp)return {ok:false,reason:'teams-mismatch'};
  }else{
    if(!isBrooks(j.away_team) || home!==opp)return {ok:false,reason:'teams-mismatch'};
  }
  return {ok:true,brooksHome};
}

async function enrichTarget(db,target,j,brooksHome,candidateUrl){
  const changed=[],rejectedLinks=[];

  const gc=
    validBchlGameCenterUrl(j.game_center_url) ||
    validBchlGameCenterUrl(candidateUrl);

  if(gc && gc!==String(target.game_center_url||'')){
    await db.prepare(
      'UPDATE matches SET game_center_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(gc,target.id).run();
    changed.push('game_center_url');
  }

  const rawWatch=safeUrl(j.watch_url) || safeUrl(candidateUrl);
  const flo=validFloEventUrl(rawWatch);

  if(rawWatch && !flo && /flohockey\.tv/i.test(rawWatch)){
    rejectedLinks.push({field:'tv_link',value:rawWatch,reason:'not-specific-flohockey-event'});
  }

  if(flo && flo!==String(target.tv_link||'')){
    await db.prepare(
      'UPDATE matches SET tv_link=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(flo,target.id).run();
    changed.push('tv_link');
  }

  const status=statusSv(j.status);
  const awayScore=parseScore(j.away_score);
  const homeScore=parseScore(j.home_score);

  if((status==='Uppskjuten' || status==='Inställd') &&
     status!==String(target.game_status||'')){
    await db.prepare(
      'UPDATE matches SET game_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(status,target.id).run();
    changed.push('game_status');
  }

  if((status==='Live'||status==='Slut') &&
     awayScore!==null && homeScore!==null){
    const brooksGoals=brooksHome?homeScore:awayScore;
    const opponentGoals=brooksHome?awayScore:homeScore;
    const result=`${brooksGoals}-${opponentGoals}`;

    const scoreChanged=
      Number(target.brooks_goals)!==brooksGoals ||
      Number(target.opponent_goals)!==opponentGoals ||
      String(target.result||'')!==result ||
      String(target.game_status||'')!==status;

    if(scoreChanged){
      await db.prepare(`
        UPDATE matches
           SET brooks_goals=?,
               opponent_goals=?,
               result=?,
               game_status=?,
               updated_at=CURRENT_TIMESTAMP
         WHERE id=?
      `).bind(brooksGoals,opponentGoals,result,status,target.id).run();
      changed.push('score','game_status');
    }
  }

  return {
    changed:[...new Set(changed)],
    rejectedLinks,
    validated:{
      game_center_url:gc||'',
      tv_link:flo||''
    }
  };
}

async function runSync(context){
  const db=context.env.DB;
  const runId=await logStart(db);

  try{
    const targets=await selectTargets(db);

    if(targets.length===0){
      const msg='E30.2.6: inga matcher behöver kontroll just nu.';
      await logFinish(db,runId,'success',0,0,0,msg);
      return json({
        ok:true,version:'E30.2.6',targets:0,
        searches:0,games_matched:0,games_updated:0,
        rate_limited:false,message:msg
      });
    }

    let searches=0,matched=0,updated=0;
    let rateLimited=false;
    const details=[];

    for(const target of targets){
      const item={
        id:target.id,
        opponent:target.opponent,
        date:albertaDateKey(target.game_date),
        matched:false,
        changed:[],
        rejected_links:[],
        notes:[]
      };

      try{
        const lean=await ultraLeanSearch(context.env,target);
        searches+=lean.searches;
        item.searches_used=lean.searches;
        item.search_trace=lean.trace;
        item.search_results=lean.results.length;

        if(lean.rateLimited){
          rateLimited=true;
          item.notes.push('Firecrawl 429: mjukt stopp för denna match.');
        }

        let found=null;
        for(const candidate of lean.results.slice(0,3)){
          try{
            const extracted=await scrapeCandidate(context.env,candidate.url,target);
            if(!extracted)continue;

            const verified=verifyExtract(target,extracted);
            if(verified.ok){
              found={candidate,extracted,verified};
              break;
            }

            item.notes.push(`${candidate.url}: ${verified.reason}`);
          }catch(err){
            if(err instanceof RateLimitError){
              rateLimited=true;
              item.notes.push('Firecrawl 429 under scrape: mjukt stopp.');
              break;
            }
            throw err;
          }
        }

        if(!found){
          if(!lean.rateLimited)item.notes.push('Ingen högsäker träff.');
          details.push(item);
          continue;
        }

        matched++;
        item.matched=true;

        const enrichment=await enrichTarget(
          db,target,found.extracted,found.verified.brooksHome,found.candidate.url
        );

        item.changed=enrichment.changed;
        item.rejected_links=enrichment.rejectedLinks;
        item.game_center_url=enrichment.validated.game_center_url;
        item.tv_link=enrichment.validated.tv_link;

        if(enrichment.changed.length>0)updated++;
      }catch(err){
        if(err instanceof RateLimitError){
          rateLimited=true;
          item.notes.push('Firecrawl 429: mjukt stopp.');
        }else{
          item.notes.push(String(err));
        }
      }

      details.push(item);
    }

    const status=rateLimited?'success_rate_limited':'success';
    const msg=`E30.2.6: ${targets.length} matcher kontrollerade, ${matched} säkert matchade, ${updated} förbättrade, ${searches} sökningar${rateLimited?', rate-limit hanterad':''}.`;

    await logFinish(db,runId,status,targets.length,matched,updated,msg);

    return json({
      ok:true,
      version:'E30.2.6',
      strategy:'ultra lean smart sync',
      targets:targets.length,
      searches,
      games_matched:matched,
      games_updated:updated,
      rate_limited:rateLimited,
      message:msg,
      details
    });

  }catch(err){
    const msg=String(err);
    await logFinish(db,runId,'error',0,0,0,msg);
    return json({ok:false,version:'E30.2.6',error:msg},500);
  }
}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,error:'D1 saknas'},500);

  const latest=(await context.env.DB.prepare(
    `SELECT * FROM sync_runs WHERE source='BCHL' ORDER BY id DESC LIMIT 10`
  ).all()).results||[];

  const targets=await selectTargets(context.env.DB);

  return json({
    ok:true,
    version:'E30.2.6',
    strategy:'ultra lean smart sync',
    current_targets:targets.map(m=>({
      id:m.id,
      opponent:m.opponent,
      game_date:m.game_date,
      home_away:m.home_away,
      game_status:m.game_status,
      has_flohockey_event:hasSpecificFlo(m.tv_link),
      has_game_center:hasGameCenter(m.game_center_url),
      timing:m._timing
    })),
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
