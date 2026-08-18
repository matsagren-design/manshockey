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

function cleanSpace(s){
  return String(s||'').replace(/\s+/g,' ').trim();
}

function titleFromHtml(raw){
  const m=String(raw||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? cleanSpace(m[1].replace(/<[^>]+>/g,' ')) : '';
}

function isoDate(d){
  return d.toISOString().slice(0,10);
}

async function fetchOfficial(url){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),8000);

  try{
    const r=await fetch(url,{
      headers:{
        'user-agent':'Mozilla/5.0 MansHockey/30.5.6',
        'accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
      },
      signal:ctl.signal
    });

    const body=r.ok ? await r.text() : '';

    return {
      ok:r.ok,
      status:r.status,
      body,
      content_type:r.headers.get('content-type')||'',
      server:r.headers.get('server')||'',
      cf_cache_status:r.headers.get('cf-cache-status')||''
    };
  }catch(err){
    return {
      ok:false,
      status:0,
      body:'',
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

function unique(arr){
  return [...new Set(arr.filter(Boolean))];
}

function absoluteUrl(v,base){
  try{
    return new URL(v,base).toString();
  }catch{
    return '';
  }
}

function extractScripts(html,base){
  const external=[];
  const inline=[];

  const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;

  while((m=re.exec(String(html||'')))!==null){
    const attrs=m[1]||'';
    const body=m[2]||'';

    const sm=attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);

    if(sm){
      external.push(absoluteUrl(sm[1],base));
    }else if(cleanSpace(body)){
      inline.push(body);
    }
  }

  return {
    external:unique(external),
    inline
  };
}

function extractIframes(html,base){
  const urls=[];
  const re=/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;

  while((m=re.exec(String(html||'')))!==null){
    urls.push(absoluteUrl(m[1],base));
  }

  return unique(urls);
}

function extractLinks(html,base){
  const urls=[];
  const re=/<(?:a|link)\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;

  while((m=re.exec(String(html||'')))!==null){
    urls.push(absoluteUrl(m[1],base));
  }

  return unique(urls);
}

function extractUrlLikeStrings(text,base){
  const out=[];

  const abs=/https?:\/\/[^\s"'<>\\)]+/gi;
  for(const m of String(text||'').matchAll(abs)){
    out.push(m[0].replace(/[;,]+$/,''));
  }

  const rel=/(?:["'`])((?:\/|\.\/|\.\.\/)[^"'`\s<>]{3,240})(?:["'`])/g;
  for(const m of String(text||'').matchAll(rel)){
    const u=absoluteUrl(m[1],base);
    if(u)out.push(u);
  }

  return unique(out);
}

function interestingUrl(u){
  const s=String(u||'').toLowerCase();

  return [
    'api','ajax','xhr','stats','schedule','score','game','league',
    'scoreboard','daily','json','feed','widget','iframe','endpoint',
    'game-center','gamecenter','leaguestat','statview','lscluster'
  ].some(x=>s.includes(x));
}

function snippet(text,index,radius=260){
  const s=String(text||'');
  if(index<0)return '';
  return cleanSpace(
    s.slice(Math.max(0,index-radius),Math.min(s.length,index+radius))
  ).slice(0,650);
}

function detectJsMarkers(text){
  const src=String(text||'');
  const lower=src.toLowerCase();

  const markers=[
    'fetch(',
    'xmlhttprequest',
    '$.ajax',
    '$.get(',
    '$.post(',
    'axios',
    'admin-ajax.php',
    'wp-json',
    '/api/',
    'daily-schedule',
    'league schedule',
    'scoreboard',
    'game-center',
    'gamecenter',
    'stats/',
    'leaguestat',
    'statview',
    'lscluster',
    'iframe',
    'src=',
    'endpoint',
    'schedule'
  ];

  const hits=[];

  for(const marker of markers){
    let from=0;
    let count=0;

    while(count<3){
      const i=lower.indexOf(marker.toLowerCase(),from);
      if(i<0)break;

      hits.push({
        marker,
        sample:snippet(src,i)
      });

      from=i+marker.length;
      count++;
    }
  }

  return hits;
}

function extractInlineCandidates(inlineScripts,base){
  const results=[];

  inlineScripts.forEach((script,index)=>{
    const hits=detectJsMarkers(script);
    const urls=extractUrlLikeStrings(script,base).filter(interestingUrl);

    if(hits.length||urls.length){
      results.push({
        index,
        chars:script.length,
        hits:hits.slice(0,12),
        urls:urls.slice(0,20)
      });
    }
  });

  return results.slice(0,12);
}

function classifyExternalScripts(urls){
  return urls.map(url=>{
    let host='';
    try{host=new URL(url).hostname}catch{}

    return {
      url,
      host,
      interesting:interestingUrl(url)
    };
  });
}

async function inspectScript(url){
  const response=await fetchOfficial(url);

  if(!response.ok){
    return {
      url,
      status:response.status,
      content_type:response.content_type,
      chars:0,
      hits:[],
      urls:[]
    };
  }

  const body=response.body||'';

  return {
    url,
    status:response.status,
    content_type:response.content_type,
    chars:body.length,
    hits:detectJsMarkers(body).slice(0,18),
    urls:extractUrlLikeStrings(body,url)
      .filter(interestingUrl)
      .slice(0,30)
  };
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

function likelyScript(url){
  const s=String(url||'').toLowerCase();

  return s.endsWith('.js') ||
    s.includes('.js?') ||
    s.includes('stats') ||
    s.includes('score') ||
    s.includes('league');
}

async function runProbe(env,db){
  const ts=await targets(db);

  if(!ts.length){
    return {
      ok:true,
      version:'E30.5.6',
      mode:'data source probe',
      targets:0
    };
  }

  const dates=candidateDates(ts[0].game_date);
  const d=dates[Math.floor(dates.length/2)]||dates[0];

  if(!d){
    return {
      ok:false,
      version:'E30.5.6',
      error:'Inget probe-datum kunde skapas.'
    };
  }

  const ds=isoDate(d);
  const pageUrl=`https://bchl.ca/stats/daily-schedule/${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
  const page=await fetchOfficial(pageUrl);

  if(!page.ok){
    return {
      ok:false,
      version:'E30.5.6',
      error:'Kunde inte hämta BCHL-sidan.',
      status:page.status,
      url:pageUrl
    };
  }

  const scripts=extractScripts(page.body,pageUrl);
  const iframes=extractIframes(page.body,pageUrl);
  const links=extractLinks(page.body,pageUrl);

  const pageUrls=extractUrlLikeStrings(page.body,pageUrl);
  const interestingPageUrls=unique([
    ...pageUrls.filter(interestingUrl),
    ...links.filter(interestingUrl),
    ...iframes.filter(interestingUrl),
    ...scripts.external.filter(interestingUrl)
  ]).slice(0,80);

  const externalMeta=classifyExternalScripts(scripts.external);

  // Inspect only a bounded set of likely JS files.
  const scriptCandidates=scripts.external
    .filter(likelyScript)
    .slice(0,10);

  const inspectedScripts=await mapLimit(
    scriptCandidates,
    3,
    async url=>inspectScript(url)
  );

  const scriptHosts=unique(
    scripts.external.map(u=>{
      try{return new URL(u).hostname}catch{return ''}
    })
  );

  const allDiscoveredUrls=unique([
    ...interestingPageUrls,
    ...inspectedScripts.flatMap(x=>x.urls||[])
  ]);

  const externalDataHosts=unique(
    allDiscoveredUrls.map(u=>{
      try{
        const host=new URL(u).hostname;
        return host && host!=='bchl.ca' && host!=='www.bchl.ca' ? host : '';
      }catch{
        return '';
      }
    })
  );

  return {
    ok:true,
    version:'E30.5.6',
    mode:'data source probe',
    strategy:'inspect page scripts, iframes, inline JS and JS bundles; no D1 writes',
    targets:ts.length,
    page:{
      date:ds,
      url:pageUrl,
      status:page.status,
      title:titleFromHtml(page.body),
      content_type:page.content_type,
      html_chars:page.body.length
    },
    counts:{
      external_scripts:scripts.external.length,
      inline_scripts:scripts.inline.length,
      iframes:iframes.length,
      links:links.length,
      interesting_page_urls:interestingPageUrls.length,
      inspected_scripts:inspectedScripts.length,
      discovered_candidate_urls:allDiscoveredUrls.length
    },
    script_hosts:scriptHosts,
    external_data_hosts:externalDataHosts,
    external_scripts:externalMeta.slice(0,50),
    iframes,
    interesting_page_urls:interestingPageUrls,
    inline_candidates:extractInlineCandidates(scripts.inline,pageUrl),
    inspected_scripts:inspectedScripts,
    discovered_candidate_urls:allDiscoveredUrls.slice(0,100)
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
    version:'E30.5.6',
    mode:'data source probe',
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
      version:'E30.5.6',
      error:String(e)
    },500);
  }
}
