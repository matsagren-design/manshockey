const QUERIES = [
  '"Måns Ågren"',
  '"Mans Agren"',
  '"Måns Agren"',
  '"Brooks Bandits" "Måns"',
  '"BCHL" "Måns Ågren"'
];

function textBetween(xml, tag){
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim() : '';
}
function decode(s){
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function parseItems(xml){
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m=>{
    const item=m[0];
    const title=decode(textBetween(item,'title'));
    const link=decode(textBetween(item,'link'));
    const published=decode(textBetween(item,'pubDate'));
    const source=decode(textBetween(item,'source')) || 'Google News';
    return {title, link, published, source};
  });
}

export async function onRequest(context) {
  const all=[];
  for (const q of QUERIES) {
    const url='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=sv&gl=SE&ceid=SE:sv';
    const res=await fetch(url, {headers:{'User-Agent':'MansHockeyMediaWatch/1.0'}});
    if(res.ok) all.push(...parseItems(await res.text()));
  }
  const seen=new Set();
  const items=all.filter(i=>{
    const key=i.link || i.title;
    if(!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0,25);
  return Response.json({checked_at:new Date().toISOString(), queries:QUERIES, items}, {headers:{'Cache-Control':'no-store'}});
}
