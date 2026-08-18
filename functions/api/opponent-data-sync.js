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
  "Brooks Bandits":"BRK"
};

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

function normalizeText(raw){
  return cleanHtml(raw)
    .replace(/[ \t]+/g,' ')
    .replace(/\n+/g,'\n')
    .trim();
}

function flatText(raw){
  return normalizeText(raw)
    .replace(/\n/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function titleFromHtml(raw){
  const m=String(raw||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() : '';
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
        'user-agent':'Mozilla/5.0 MansHockey/30.5.5',
        'accept':'text/html,application/xhtml+xml'
      },
      signal:ctl.signal
    });

    const html=r.ok ? await r.text() : '';

    return {
      ok:r.ok,
      status:r.status,
      html,
      content_type:r.headers.get('content-type')||'',
      server:r.headers.get('server')||'',
      cf_cache_status:r.headers.get('cf-cache-status')||''
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

function snippetAround(text,needle,radius=260){
  const lower=text.toLowerCase();
  const i=lower.indexOf(String(needle).toLowerCase());
  if(i<0)return null;

  const start=Math.max(0,i-radius);
  const end=Math.min(text.length,i+String(needle).length+radius);

  return text.slice(start,end).replace(/\s+/g,' ').trim();
}

function detectMarkers(raw){
  const flat=flatText(raw);

  const needles=[
    'FINAL',
    'Final',
    'Brooks',
    'BRK',
    'Spruce Grove',
    'SGS',
    'Okotoks',
    'OKO',
    'Blackfalds',
    'BFB',
    'game-center',
    'daily-schedule',
    'score',
    'schedule',
    'stats',
    '__NEXT_DATA__',
    'application/ld+json',
    'window.',
    'data-game'
  ];

  const hits={};

  for(const n of needles){
    const s=snippetAround(flat,n);
    if(s)hits[n]=s;
  }

  return hits;
}

function rawMarkers(raw){
  const samples={};
  const needles=[
    '__NEXT_DATA__',
    'application/ld+json',
    'game-center',
    'daily-schedule',
    'FINAL',
    'BRK',
    'SGS'
  ];

  for(const n of needles){
    const i=String(raw||'').toLowerCase().indexOf(n.toLowerCase());
    if(i>=0){
      const start=Math.max(0,i-220);
      const end=Math.min(String(raw).length,i+n.length+420);
      samples[n]=String(raw).slice(start,end).replace(/\s+/g,' ').trim();
    }
  }

  return samples;
}

async function runProbe(env,db){
  const ts=await targets(db);

  if(!ts.length){
    return {
      ok:true,
      version:'E30.5.5',
      mode:'parser probe',
      targets:0,
      probes:[]
    };
  }

  const dates=candidateDates(ts[0].game_date);

  // Probe only a handful of pages. We want visibility, not another full sync.
  const probeDates=[
    dates[0],
    dates[Math.floor(dates.length/4)],
    dates[Math.floor(dates.length/2)],
    dates[Math.floor(dates.length*3/4)],
    dates[dates.length-1]
  ].filter(Boolean);

  const pages=await mapLimit(probeDates,3,async d=>{
    const ds=isoDate(d);
    const url=`https://bchl.ca/stats/daily-schedule/${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
    const response=await fetchOfficial(url);

    return {
      date:ds,
      url,
      ...response
    };
  });

  const probes=pages.map(p=>{
    const flat=flatText(p.html);

    return {
      date:p.date,
      url:p.url,
      status:p.status,
      content_type:p.content_type,
      server:p.server||'',
      cf_cache_status:p.cf_cache_status||'',
      html_chars:p.html.length,
      text_chars:flat.length,
      title:titleFromHtml(p.html),
      contains_final:/\bFINAL\b/i.test(flat),
      contains_known_team:Array.from(Object.values(TEAM_CODES))
        .some(code=>new RegExp(`\\b${code}\\b`,'i').test(flat)),
      text_hits:detectMarkers(p.html),
      raw_hits:rawMarkers(p.html),
      first_text:flat.slice(0,900)
    };
  });

  return {
    ok:true,
    version:'E30.5.5',
    mode:'parser probe',
    strategy:'read-only BCHL response inspection; no D1 writes',
    targets:ts.length,
    probe_pages:probes.length,
    probes
  };
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
    version:'E30.5.5',
    mode:'parser probe',
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
    return json(await runProbe(c.env,c.env.DB));
  }catch(e){
    return json({
      ok:false,
      version:'E30.5.5',
      error:String(e)
    },500);
  }
}
