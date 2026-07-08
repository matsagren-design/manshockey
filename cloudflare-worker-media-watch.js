// Valfri extra: Cloudflare Worker med daglig cron-bevakning.
// Skapa KV namespace MANS_MEDIA_KV och bind det till variabeln MANS_MEDIA_KV.
// Lägg till Cron Trigger, t.ex. 0 7 * * * för kontroll varje morgon.

const QUERIES = ['"Måns Ågren"','"Mans Agren"','"Måns Agren"','"Brooks Bandits" "Måns"','"BCHL" "Måns Ågren"'];

function textBetween(xml, tag){ const m=xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i')); return m?m[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():''; }
function decode(s){ return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
function parseItems(xml){ return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m=>({title:decode(textBetween(m[0],'title')),link:decode(textBetween(m[0],'link')),published:decode(textBetween(m[0],'pubDate')),source:decode(textBetween(m[0],'source'))||'Google News'})); }
async function check(){ const all=[]; for(const q of QUERIES){ const url='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=sv&gl=SE&ceid=SE:sv'; const r=await fetch(url); if(r.ok) all.push(...parseItems(await r.text())); } const seen=new Set(); return {checked_at:new Date().toISOString(), queries:QUERIES, items:all.filter(i=>{const k=i.link||i.title; if(!k||seen.has(k))return false; seen.add(k); return true;}).slice(0,50)}; }
export default {
  async scheduled(event, env, ctx){ ctx.waitUntil(check().then(data=>env.MANS_MEDIA_KV.put('latest', JSON.stringify(data)))); },
  async fetch(request, env){ const stored=await env.MANS_MEDIA_KV.get('latest'); return Response.json(stored?JSON.parse(stored):await check(), {headers:{'Cache-Control':'no-store'}}); }
};
