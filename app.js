let schedule = [];
let deferredPrompt;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const seDate = m => new Date(`${m.date_se}T${m.time_se}:00+02:00`);
const fmt = d => new Intl.DateTimeFormat('sv-SE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
async function init(){
  schedule = await fetch('/data/schedule.json').then(r=>r.json());
  renderStats(); renderNext(); renderUpcoming(); renderSchedule(); renderTravel(); renderScout(); initReports(); loadPlayer(); loadNotes(); loadMedia(); tickTime(); setInterval(tickTime,1000); setInterval(renderNext,60000); bind();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
}
function bind(){
  $$('.tab,[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $('#search').addEventListener('input',renderSchedule); $('#filter').addEventListener('change',renderSchedule);
  $('#statsForm').addEventListener('submit',e=>{e.preventDefault(); const data=Object.fromEntries(new FormData(e.target)); localStorage.setItem('mansStats',JSON.stringify(data)); loadPlayer();});
  $('#saveNotes').addEventListener('click',()=>{localStorage.setItem('familyNotes',$('#familyNotes').value); alert('Sparat på den här enheten.');});
  $('#refreshMedia')?.addEventListener('click',()=>loadMedia(true));
  $('#loadReport')?.addEventListener('click',()=>loadReportIntoForm());
  $('#newReportFromNext')?.addEventListener('click',()=>selectNextReport());
  $('#reportForm')?.addEventListener('submit',saveReport);
  $('#copyReport')?.addEventListener('click',copyReportText);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
  $('#installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt(); deferredPrompt=null;}});
}
function showTab(id){$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id)); window.scrollTo({top:0,behavior:'smooth'});}
function renderStats(){ $('#statGames').textContent=schedule.length; $('#statHome').textContent=schedule.filter(m=>m.homeaway==='Hemma').length; $('#statAway').textContent=schedule.filter(m=>m.homeaway==='Borta').length;}
function nextMatch(){const now=new Date(); return schedule.find(m=>seDate(m)>now) || schedule[0];}
function renderNext(){ const m=nextMatch(); if(!m)return; const d=seDate(m); $('#nextTitle').textContent=m.summary; $('#nextMeta').textContent=`${fmt(d)} svensk tid • ${m.arena} • ${m.homeaway}`; const diff=Math.max(0,d-new Date()); const days=Math.floor(diff/86400000), hrs=Math.floor(diff%86400000/3600000), mins=Math.floor(diff%3600000/60000), sec=Math.floor(diff%60000/1000); $('#countdown').innerHTML=[['Dagar',days],['Tim',hrs],['Min',mins],['Sek',sec]].map(x=>`<div><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');}
function renderUpcoming(){ const now=new Date(); const list=schedule.filter(m=>seDate(m)>now).slice(0,6); $('#upcoming').innerHTML=list.map(card).join('');}
function card(m){return `<article class="card"><span class="pill">${m.homeaway}</span><span class="pill">Scout: ${m.scout}</span><h3>${m.summary}</h3><p>${fmt(seDate(m))} svensk tid</p><p>${m.arena}${m.note?` • ${m.note}`:''}</p></article>`}
function renderSchedule(){ const q=$('#search').value?.toLowerCase()||''; const f=$('#filter').value; const rows=schedule.filter(m=>{const text=`${m.summary} ${m.arena} ${m.opponent}`.toLowerCase(); return (!q||text.includes(q)) && (f==='all'||m.homeaway===f||m.scout===f);}); $('#scheduleRows').innerHTML=rows.map(m=>`<tr><td>${fmt(seDate(m))}</td><td><strong>${m.summary}</strong><br><small>Alberta: ${m.date_local} ${m.time_local}</small></td><td>${m.tag} ${m.homeaway}</td><td>${m.arena}</td><td>${m.scout}</td></tr>`).join('');}
function renderTravel(){ const away=schedule.filter(m=>m.homeaway==='Borta'); $('#travelCards').innerHTML=away.map(m=>`<article class="card"><span class="pill">Bortaresa</span><h3>${m.opponent}</h3><p>${fmt(seDate(m))}</p><p>${m.arena}</p><p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.arena+' '+m.opponent+' hockey')}" target="_blank">Öppna karta</a></p></article>`).join('');}
function renderScout(){ const high=schedule.filter(m=>m.scout==='Hög'||/Showcase|Okotoks|Spruce Grove|Penticton|Blackfalds/i.test(`${m.summary} ${m.note}`)); $('#scoutCards').innerHTML=high.map(m=>`<article class="card"><span class="pill">Scoutfokus</span><h3>${m.summary}</h3><p>${fmt(seDate(m))}</p><p>${m.homeaway} • ${m.arena}</p><p>Extra intressant match för NCAA-/scoutbevakning.</p></article>`).join('');}
function loadPlayer(){ const data=JSON.parse(localStorage.getItem('mansStats')||'{}'); Object.entries(data).forEach(([k,v])=>{const el=$(`#statsForm [name="${k}"]`); if(el)el.value=v;}); const pts=(+data.g||0)+(+data.a||0); $('#playerSummary').innerHTML=`<article class="card"><span class="pill">Måns Ågren</span><h3>${data.gp||0} matcher • ${pts} poäng</h3><p>Mål: ${data.g||0} • Assist: ${data.a||0} • +/-: ${data.pm||0} • PIM: ${data.pim||0}</p><p>${data.note||'Ingen anteckning ännu.'}</p></article>`;}
function loadNotes(){ $('#familyNotes').value=localStorage.getItem('familyNotes')||'';}
function tickTime(){ $('#brooksTime').textContent=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Edmonton',hour:'2-digit',minute:'2-digit'}).format(new Date());}
init();

async function loadMedia(force=false){
  const status=$('#mediaStatus'), box=$('#mediaCards');
  if(!box) return;
  const cached=JSON.parse(localStorage.getItem('mediaHits')||'null');
  if(cached && !force){ renderMedia(cached); return; }
  status.textContent='Söker efter nya omnämnanden...';
  try{
    const r=await fetch('/api/media?ts='+Date.now());
    if(!r.ok) throw new Error('API inte tillgängligt ännu');
    const data=await r.json();
    localStorage.setItem('mediaHits',JSON.stringify(data));
    renderMedia(data);
  }catch(e){
    status.textContent='Automatisk mediesökning aktiveras när appen är publicerad med Cloudflare Pages Functions. Använd snabbknapparna ovan tills dess.';
    box.innerHTML=`<article class="card"><span class="pill">Media</span><h3>Manuell bevakning</h3><p>Klicka på Google News eller Google för aktuell sökning.</p><p>Sökningen omfattar Måns Ågren, Mans Agren, Brooks Bandits Måns och BCHL Måns Ågren.</p></article>`;
  }
}
function renderMedia(data){
  const items=(data.items||[]).slice(0,12);
  $('#mediaStatus').textContent=`Senast kontrollerad: ${data.checked_at ? new Date(data.checked_at).toLocaleString('sv-SE') : 'okänt'} • ${items.length} träffar`;
  $('#mediaCards').innerHTML=items.length?items.map(i=>`<article class="card"><span class="pill">${i.source||'Media'}</span><h3>${i.title}</h3><p>${i.published||''}</p><p><a target="_blank" href="${i.link}">Öppna träff</a></p></article>`).join(''):`<article class="card"><h3>Inga nya träffar</h3><p>Bevakningen körs igen enligt Cloudflare-inställningen.</p></article>`;
}


function reportKey(matchNr,type){return `report_${matchNr}_${type}`;}
function initReports(){
  const sel=$('#reportMatchSelect'); if(!sel) return;
  sel.innerHTML=schedule.map(m=>`<option value="${m.nr}">${m.swedish_display} • ${m.summary}</option>`).join('');
  selectNextReport(false);
  renderSavedReports();
}
function selectNextReport(open=true){
  const m=nextMatch(); if(!m) return;
  const sel=$('#reportMatchSelect'); if(sel) sel.value=m.nr;
  const type=$('#reportType'); if(type) type.value='pre';
  if(open) loadReportIntoForm(); else renderReportPreview();
}
function currentReportMatch(){ const nr=+($('#reportMatchSelect')?.value||0); return schedule.find(m=>m.nr===nr)||schedule[0]; }
function defaultReport(m,type){
  const pre=type==='pre';
  return {
    title: pre ? `Inför match: ${m.summary}` : `Efter match: ${m.summary}`,
    result: pre ? `Nedsläpp ${m.swedish_display} svensk tid • Alberta ${m.date_local} ${m.time_local}` : 'Resultat: ',
    mans: pre ? 'Håll koll på Måns i defensiva zonen, boxplay, fysiskt spel och förstapass.' : 'Måns statistik: mål, assist, +/-, PIM, istid/roll.',
    focus: pre ? `1. Starten och första 10 minuterna\n2. Special teams: PP/PK\n3. Måns roll mot ${m.opponent}` : `1. Matchbild och avgörande sekvenser\n2. Måns prestation och roll\n3. Saker att följa upp inför nästa match`,
    summary: pre ? `${m.homeaway}-match mot ${m.opponent}. Scoutnivå: ${m.scout}. Arena: ${m.arena}.` : 'Kort sammanfattning av matchen fylls i efter slutsignal.',
    links: `BCHL/Brooks matchcenter: \nFloHockey: \nHighlights/rapport: `
  };
}
function getReport(){
  const m=currentReportMatch(); const type=$('#reportType')?.value||'pre';
  return JSON.parse(localStorage.getItem(reportKey(m.nr,type))||'null') || defaultReport(m,type);
}
function loadReportIntoForm(){
  const r=getReport(); const form=$('#reportForm'); if(!form) return;
  Object.entries(r).forEach(([k,v])=>{const el=form.elements[k]; if(el) el.value=v;});
  renderReportPreview();
}
function saveReport(e){
  e.preventDefault(); const m=currentReportMatch(); const type=$('#reportType')?.value||'pre';
  const data=Object.fromEntries(new FormData(e.target)); data.saved_at=new Date().toISOString(); data.match_nr=m.nr; data.type=type;
  localStorage.setItem(reportKey(m.nr,type), JSON.stringify(data));
  renderReportPreview(); renderSavedReports(); alert('Matchrapport sparad på den här enheten.');
}
function reportText(){
  const m=currentReportMatch(); const type=$('#reportType')?.value||'pre'; const r=getReport();
  const label=type==='pre'?'Inför match':'Efter match';
  return `${label}: ${m.summary}\n${m.swedish_display} svensk tid • ${m.homeaway} • ${m.arena}\n\n${r.title}\n${r.result}\n\nMåns:\n${r.mans}\n\nTre saker att hålla koll på / följa upp:\n${r.focus}\n\nSammanfattning:\n${r.summary}\n\nLänkar:\n${r.links}`;
}
async function copyReportText(){
  const text=reportText();
  try{await navigator.clipboard.writeText(text); alert('Rapporttext kopierad.');}
  catch(e){prompt('Kopiera rapporttext:', text);}
}
function renderReportPreview(){
  const box=$('#reportPreview'); if(!box) return; const m=currentReportMatch(); const type=$('#reportType')?.value||'pre'; const r=getReport();
  box.innerHTML=`<span class="pill">${type==='pre'?'Inför match':'Efter match'}</span><span class="pill">${m.homeaway}</span><span class="pill">Scout: ${m.scout}</span><h3>${r.title}</h3><p><strong>${m.swedish_display}</strong> svensk tid • Alberta ${m.date_local} ${m.time_local}</p><p>${m.summary} • ${m.arena}</p><p>${r.summary}</p>`;
}
function renderSavedReports(){
  const box=$('#savedReports'); if(!box) return; const items=[];
  for(const m of schedule){ for(const type of ['pre','post']){ const raw=localStorage.getItem(reportKey(m.nr,type)); if(raw){ const r=JSON.parse(raw); items.push({m,type,r}); } } }
  box.innerHTML=items.length?items.reverse().slice(0,12).map(({m,type,r})=>`<article class="card"><span class="pill">${type==='pre'?'Inför':'Efter'}</span><h3>${r.title}</h3><p>${m.swedish_display} • ${m.summary}</p><p>${r.result||''}</p></article>`).join(''):`<article class="card"><h3>Inga sparade rapporter ännu</h3><p>Välj en match och skapa en inför- eller efterrapport.</p></article>`;
}

// Flygresor ARN–YYC
function initFlights(){
  const form=$('#flightForm'); if(!form) return;
  const dep=form.elements['depart'];
  if(dep && !dep.value){ dep.value='2026-12-30'; }
  form.addEventListener('submit',e=>{e.preventDefault(); renderFlightSearchLinks();});
  $('#saveFlightWatch')?.addEventListener('click',saveFlightWatch);
  renderFlightSearchLinks(); renderFlightWatches();
}
function flightData(){
  const f=$('#flightForm'); if(!f) return null;
  const fd=new FormData(f);
  const airlines=[];
  if(fd.get('airCanada')) airlines.push('Air Canada');
  if(fd.get('klm')) airlines.push('KLM');
  if(fd.get('finnair')) airlines.push('Finnair');
  return {
    from:(fd.get('from')||'ARN').toString().toUpperCase(),
    to:(fd.get('to')||'YYC').toString().toUpperCase(),
    depart:fd.get('depart')||'',
    ret:fd.get('return')||'',
    maxPrice:fd.get('maxPrice')||'',
    notBefore:fd.get('notBefore')||'09:30',
    oneWay:!!fd.get('oneWay'), noUs:!!fd.get('noUs'), shortTravel:!!fd.get('shortTravel'), airlines
  };
}
function ymdCompact(v){ return (v||'').replaceAll('-',''); }
function renderFlightSearchLinks(){
  const d=flightData(); const box=$('#flightSearchLinks'); if(!d||!box) return;
  const route=`${d.from}-${d.to}`;
  const qBase=`${d.from} to ${d.to} ${d.depart} ${d.oneWay?'one way':'return'} ${d.airlines.join(' OR ')} ${d.noUs?'no US stopover':''}`;
  const google=`https://www.google.com/travel/flights?q=${encodeURIComponent(qBase)}`;
  const kayak=`https://www.kayak.se/flights/${d.from}-${d.to}/${d.depart}${d.oneWay?'':'/'+d.ret}?sort=bestflight_a`;
  const skyscanner=`https://www.skyscanner.se/transport/flights/${d.from.toLowerCase()}/${d.to.toLowerCase()}/${ymdCompact(d.depart)}/${d.oneWay?'':ymdCompact(d.ret)}`;
  const airCanada=`https://www.aircanada.com/ca/en/aco/home.html#/`;
  const klm=`https://www.klm.se/`; const finnair=`https://www.finnair.com/se-sv`;
  box.innerHTML=`
    <article class="card"><span class="pill">Flygsökning</span><h3>${route} ${d.depart||''}</h3><p>${d.oneWay?'Enkel resa':'Tur och retur'} • Flygbolag: ${d.airlines.join(', ')||'Alla'} • Max ${d.maxPrice||'–'} SEK</p><p>Regler: avgång efter ${d.notBefore}, ${d.noUs?'undvik USA, ':''}${d.shortTravel?'kort restid prioriteras':''}</p></article>
    <article class="card"><span class="pill">Sökmotorer</span><h3>Jämför aktuella priser</h3><p><a target="_blank" href="${google}">Google Flights</a> • <a target="_blank" href="${kayak}">Kayak</a> • <a target="_blank" href="${skyscanner}">Skyscanner</a></p></article>
    <article class="card"><span class="pill">Direkt hos flygbolag</span><h3>Air Canada, KLM och Finnair</h3><p><a target="_blank" href="${airCanada}">Air Canada</a> • <a target="_blank" href="${klm}">KLM</a> • <a target="_blank" href="${finnair}">Finnair</a></p></article>
    <article class="card"><span class="pill">Automatisk bevakning</span><h3>Nästa steg</h3><p>För faktiska prisnotiser kan vi koppla /api/flights till en flyg-API-leverantör. Appen är förberedd för kriterierna Air Canada/KLM/Finnair, ARN–YYC, maxpris, kort restid och inga USA-mellanlandningar.</p></article>`;
}
function saveFlightWatch(){
  const d=flightData(); if(!d) return;
  const watches=JSON.parse(localStorage.getItem('flightWatches')||'[]');
  watches.unshift({...d, saved_at:new Date().toISOString()});
  localStorage.setItem('flightWatches',JSON.stringify(watches.slice(0,12)));
  renderFlightWatches(); alert('Flygbevakning sparad på den här enheten.');
}
function renderFlightWatches(){
  const box=$('#flightWatchCards'); if(!box) return;
  const watches=JSON.parse(localStorage.getItem('flightWatches')||'[]');
  box.innerHTML=watches.length?watches.map(w=>`<article class="card"><span class="pill">Bevakning</span><h3>${w.from} → ${w.to} ${w.depart}</h3><p>${w.oneWay?'Enkel':'Tur/retur'} • ${w.airlines.join(', ')} • max ${w.maxPrice||'–'} SEK</p><p>Efter ${w.notBefore} • ${w.noUs?'Ej via USA • ':''}${w.shortTravel?'Kort restid':''}</p></article>`).join(''):`<article class="card"><h3>Ingen sparad flygbevakning ännu</h3><p>Skapa en sökning och tryck på “Spara bevakning”.</p></article>`;
}

// initFlights körs efter huvudinitiering när DOM finns.
setTimeout(initFlights, 0);
