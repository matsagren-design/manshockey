const schedule = [
  {date:'2026-09-18', time:'19:00', opp:'Blackfalds Bulldogs', venue:'Eagle Builders Centre', away:true, scout:true},
  {date:'2026-09-19', time:'19:00', opp:'Okotoks Oilers', venue:'CRA', home:true, scout:true},
  {date:'2026-09-25', time:'19:00', opp:'Spruce Grove Saints', venue:'CRA', home:true, scout:true},
  {date:'2026-09-26', time:'19:00', opp:'Sherwood Park Crusaders', venue:'CRA', home:true},
  {date:'2026-10-09', time:'19:00', opp:'Alberni Valley Bulldogs', venue:'CRA', home:true},
  {date:'2026-10-10', time:'19:05', opp:'Okotoks Oilers', venue:'Viking Rentals Centre', away:true, scout:true},
  {date:'2026-10-17', time:'19:00', opp:'Cowichan Valley Capitals', venue:'CRA', home:true},
  {date:'2026-10-23', time:'19:00', opp:'Vernon Vipers', venue:'CRA', home:true},
  {date:'2026-10-24', time:'19:00', opp:'Sherwood Park Crusaders', venue:'Sherwood Park Arena', away:true},
  {date:'2026-10-30', time:'19:00', opp:'Powell River Kings', venue:'Hap Parker Arena', away:true},
  {date:'2026-10-31', time:'18:00', opp:'Victoria Grizzlies', venue:'The Q Centre', away:true},
  {date:'2026-11-04', time:'18:30', opp:'Trail Smoke Eaters', venue:'CRA', home:true},
  {date:'2026-11-07', time:'19:00', opp:'Sherwood Park Crusaders', venue:'CRA', home:true},
  {date:'2026-11-08', time:'16:00', opp:'Blackfalds Bulldogs', venue:'CRA', home:true},
  {date:'2026-11-13', time:'19:00', opp:'Trail Smoke Eaters', venue:'Cominco Arena', away:true},
  {date:'2026-11-14', time:'18:00', opp:'Cranbrook Bucks', venue:'Western Financial Place', away:true},
  {date:'2026-11-20', time:'19:00', opp:'Cranbrook Bucks', venue:'CRA', home:true},
  {date:'2026-11-21', time:'19:05', opp:'Okotoks Oilers', venue:'Viking Rentals Centre', away:true, scout:true},
  {date:'2026-11-27', time:'19:00', opp:'Okotoks Oilers', venue:'CRA', home:true, scout:true},
  {date:'2026-12-02', time:'19:00', opp:'Cranbrook Bucks', venue:'Western Financial Place', away:true},
  {date:'2026-12-04', time:'19:00', opp:'West Kelowna Warriors', venue:'Royal LePage Place', away:true},
  {date:'2026-12-05', time:'18:00', opp:'Vernon Vipers', venue:'Kal Tire Place', away:true},
  {date:'2026-12-11', time:'19:00', opp:'Vernon Vipers', venue:'Kal Tire Place', away:true},
  {date:'2026-12-12', time:'18:00', opp:'Salmon Arm Silverbacks', venue:'Rogers Rink', away:true},
  {date:'2026-12-16', time:'18:30', opp:'Spruce Grove Saints', venue:'CRA', home:true, scout:true},
  {date:'2026-12-19', time:'19:00', opp:'Blackfalds Bulldogs', venue:'CRA', home:true},
  {date:'2027-01-01', time:'16:00', opp:'Blackfalds Bulldogs', venue:'CRA', home:true},
  {date:'2027-01-02', time:'19:00', opp:'Okotoks Oilers', venue:'CRA', home:true, scout:true},
  {date:'2027-01-08', time:'19:00', opp:'Cranbrook Bucks', venue:'CRA', home:true},
  {date:'2027-01-09', time:'19:00', opp:'Salmon Arm Silverbacks', venue:'CRA', home:true},
  {date:'2027-01-16', time:'18:00', opp:'Spruce Grove Saints', venue:'Heavy Metal Place', away:true, scout:true},
  {date:'2027-01-17', time:'16:00', opp:'Blackfalds Bulldogs', venue:'Eagle Builders Centre', away:true},
  {date:'2027-01-29', time:'19:00', opp:'West Kelowna Warriors', venue:'CRA', home:true},
  {date:'2027-01-30', time:'19:00', opp:'Spruce Grove Saints', venue:'CRA', home:true, scout:true},
  {date:'2027-02-03', time:'11:30', opp:'Okotoks Oilers', venue:'Viking Rentals Centre', away:true, scout:true},
  {date:'2027-02-05', time:'19:00', opp:'Okotoks Oilers', venue:'CRA', home:true, scout:true},
  {date:'2027-02-06', time:'19:00', opp:'Sherwood Park Crusaders', venue:'Sherwood Park Arena', away:true},
  {date:'2027-02-12', time:'19:00', opp:'Vernon Vipers', venue:'CRA', home:true},
  {date:'2027-02-13', time:'18:00', opp:'Spruce Grove Saints', venue:'Heavy Metal Place', away:true, scout:true},
  {date:'2027-02-15', time:'16:00', opp:'Blackfalds Bulldogs', venue:'CRA', home:true},
  {date:'2027-02-19', time:'19:00', opp:'Spruce Grove Saints', venue:'Heavy Metal Place', away:true, scout:true},
  {date:'2027-02-20', time:'19:00', opp:'Sherwood Park Crusaders', venue:'CRA', home:true},
  {date:'2027-02-26', time:'19:00', opp:'Sherwood Park Crusaders', venue:'Sherwood Park Arena', away:true},
  {date:'2027-02-27', time:'19:00', opp:'Spruce Grove Saints', venue:'Heavy Metal Place', away:true, scout:true},
  {date:'2027-03-03', time:'19:00', opp:'Trail Smoke Eaters', venue:'Cominco Arena', away:true},
  {date:'2027-03-05', time:'19:00', opp:'Salmon Arm Silverbacks', venue:'Rogers Rink', away:true},
  {date:'2027-03-06', time:'19:00', opp:'West Kelowna Warriors', venue:'Royal LePage Place', away:true},
  {date:'2027-03-10', time:'18:30', opp:'Salmon Arm Silverbacks', venue:'CRA', home:true},
  {date:'2027-03-13', time:'19:00', opp:'West Kelowna Warriors', venue:'CRA', home:true},
  {date:'2027-03-19', time:'19:00', opp:'Blackfalds Bulldogs', venue:'Eagle Builders Centre', away:true},
  {date:'2027-03-20', time:'19:00', opp:'Trail Smoke Eaters', venue:'CRA', home:true}
];

const $ = (id)=>document.getElementById(id);
const fmtDate = (d)=>new Intl.DateTimeFormat('sv-SE',{weekday:'short',day:'numeric',month:'short'}).format(new Date(d+'T12:00:00'));
const svTime = (m)=>{ const dt = new Date(`${m.date}T${m.time}:00-07:00`); return new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'}).format(dt); };
const localDateSv = (m)=>{ const dt = new Date(`${m.date}T${m.time}:00-07:00`); return new Intl.DateTimeFormat('sv-SE',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Stockholm'}).format(dt); };
const nextMatch = ()=> schedule.find(m=> new Date(`${m.date}T${m.time}:00-07:00`) > new Date()) || schedule[0];
const countdown = (m)=>{ const diff = new Date(`${m.date}T${m.time}:00-07:00`) - new Date(); if(diff<0)return 'Säsongen igång'; const d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000); return `${d} dagar ${h} tim`; };
function setClocks(){
 $('seClock').textContent = new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'}).format(new Date());
 $('brooksClock').textContent = new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Edmonton'}).format(new Date());
}
setInterval(setClocks,30000); setClocks();

document.querySelectorAll('.nav').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav,.view').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(btn.dataset.view).classList.add('active');$('pageTitle').textContent = btn.textContent;});

function matchCard(m){return `<div class="match"><div><div class="date">${localDateSv(m)}</div><small>${svTime(m)} svensk tid</small></div><div><div class="teams">Brooks ${m.home?'vs':'@'} ${m.opp}</div><small>${m.venue} · ${m.home?'Hemma':'Borta'} · ${m.time} Alberta</small></div><div>${m.scout?'<span class="pill red">Scout</span>':''} <span class="pill">${m.home?'H':'B'}</span></div></div>`}
function renderDashboard(){ const n=nextMatch(); $('dashboard').innerHTML = `<div class="grid cols-3"><div class="card hero" style="grid-column:span 2"><p class="eyebrow">Nästa match</p><h2>Brooks ${n.home?'vs':'@'} ${n.opp}</h2><p class="muted">${localDateSv(n)} · ${svTime(n)} svensk tid · ${n.venue}</p><div class="big">${countdown(n)}</div><div class="filters"><span class="pill ${n.home?'ok':'red'}">${n.home?'Hemmamatch':'Bortamatch'}</span>${n.scout?'<span class="pill red">Scoutläge</span>':''}<a class="btn secondary" href="/mans_bchl_2026_27_calendar.ics">Kalenderfil</a></div></div><div class="card"><p class="eyebrow">Måns statistik</p><div class="statline" style="grid-template-columns:1fr 1fr"><div class="stat"><strong id="gp">0</strong><span>Matcher</span></div><div class="stat"><strong>0</strong><span>Poäng</span></div><div class="stat"><strong>0</strong><span>+/-</span></div><div class="stat"><strong>0</strong><span>PIM</span></div></div><p class="muted">Fylls på manuellt efter matcher i version 5.1.</p></div></div><div class="grid cols-3" style="margin-top:18px"><div class="card"><p class="eyebrow">Kommande matcher</p><div class="match-list">${schedule.slice(0,4).map(matchCard).join('')}</div></div><div class="card"><p class="eyebrow">Reseöversikt</p><h3>ARN → YYC</h3><p class="muted">Air Canada, KLM och Finnair. Filter: ingen USA-transit, avgång efter 09:30, kort restid.</p><button class="btn" onclick="go('flights')">Öppna flygportal</button></div><div class="card"><p class="eyebrow">Media</p><h3>Bevakning</h3><p class="muted">Måns Ågren, Mans Agren, Brooks Bandits, BCHL och EliteProspects.</p><button class="btn secondary" onclick="go('media')">Öppna media</button></div></div>`}
function go(view){document.querySelector(`[data-view="${view}"]`).click()}
function renderMatches(filter='all'){ const items=schedule.filter(m=>filter==='home'?m.home:filter==='away'?m.away:filter==='scout'?m.scout:true); $('matches').innerHTML=`<div class="card"><p class="eyebrow">Spelschema</p><div class="filters"><button class="btn secondary" onclick="renderMatches('all')">Alla</button><button class="btn secondary" onclick="renderMatches('home')">Hemma</button><button class="btn secondary" onclick="renderMatches('away')">Borta</button><button class="btn secondary" onclick="renderMatches('scout')">Scout</button></div><div class="match-list">${items.map(matchCard).join('')}</div></div>`}
function renderReports(){ const n=nextMatch(); $('reports').innerHTML=`<div class="grid cols-2"><div class="card"><p class="eyebrow">Inför match</p><h2>Brooks ${n.home?'vs':'@'} ${n.opp}</h2><div class="report-box">Motståndare: ${n.opp}\nTid: ${localDateSv(n)} ${svTime(n)} svensk tid\nPlats: ${n.venue}\nFokus för Måns:\n• Första pass ur egen zon\n• Boxplay och spelet framför mål\n• Fysisk närvaro längs sarg\n• Enkla beslut under forecheck\n\nScoutnotering: ${n.scout?'Högre intressematch – spara clips och matchanteckningar.':'Normal grundseriematch.'}</div><textarea rows="5" placeholder="Egna inför-anteckningar..."></textarea></div><div class="card"><p class="eyebrow">Efter match</p><h2>Matchrapportmall</h2><div class="form-grid"><label>Resultat<input placeholder="t.ex. 4–2"></label><label>Måns poäng<input placeholder="0+1"></label><label>+/-<input placeholder="+1"></label></div><div class="report-box" style="margin-top:12px">Sammanfattning:\nBrooks spelade ...\n\nMåns insats:\nStabil defensivt, bra förstapass och tydlig närvaro i boxplay.\n\nClips att spara:\n1. Bra uppspel\n2. Boxplay-sekvens\n3. Fysisk duell</div></div></div>`}
function renderStats(){ $('stats').innerHTML=`<div class="card"><p class="eyebrow">Måns statistik</p><div class="statline"><div class="stat"><strong>0</strong><span>GP</span></div><div class="stat"><strong>0</strong><span>G</span></div><div class="stat"><strong>0</strong><span>A</span></div><div class="stat"><strong>0</strong><span>PTS</span></div><div class="stat"><strong>0</strong><span>+/-</span></div><div class="stat"><strong>0</strong><span>PIM</span></div></div><table class="table" style="margin-top:18px"><thead><tr><th>Datum</th><th>Motstånd</th><th>Resultat</th><th>G</th><th>A</th><th>+/-</th><th>Notering</th></tr></thead><tbody><tr><td colspan="7" class="muted">Fylls på efter säsongsstart.</td></tr></tbody></table></div>`}
function renderFlights(){ $('flights').innerHTML=`<div class="grid cols-2"><div class="card"><p class="eyebrow">Flygresor</p><h2>Arlanda → Calgary</h2><div class="form-grid"><label>Från<input value="ARN"></label><label>Till<input value="YYC"></label><label>Datum<input type="date"></label><label>Flygbolag<select><option>Air Canada, KLM, Finnair</option><option>Air Canada</option><option>KLM</option><option>Finnair</option></select></label><label>Maxpris SEK<input value="10000"></label><label>Avgång tidigast<input value="09:30"></label></div><div class="filters" style="margin-top:14px"><span class="pill ok">Ingen USA-transit</span><span class="pill">Kort restid</span><span class="pill">1 byte helst</span></div><button class="btn" onclick="searchFlights()">Sök / bevaka</button><div id="flightResults" style="margin-top:16px"></div></div><div class="card"><p class="eyebrow">Bevakningar</p><div class="notice">För livepriser krävs senare API, t.ex. Amadeus/Skyscanner/Kiwi. Just nu sparar appen kriterier och länkar vidare till bolagens sökningar.</div><table class="table"><tr><th>Resa</th><th>Status</th></tr><tr><td>Måns till Brooks</td><td>Bokad</td></tr><tr><td>Julresa</td><td>Bevakas</td></tr><tr><td>Slutspel</td><td>Planeras</td></tr></table></div></div>`}
async function searchFlights(){ $('flightResults').innerHTML=`<div class="match-list"><div class="match"><div><div class="date">Air Canada</div><small>ARN–YYC</small></div><div><div class="teams">Sök hos Air Canada</div><small>Undvik USA-transit manuellt i filtren.</small></div><a class="btn secondary" target="_blank" href="https://www.aircanada.com/">Öppna</a></div><div class="match"><div><div class="date">KLM</div><small>ARN–YYC</small></div><div><div class="teams">Sök hos KLM</div><small>Vanligtvis via Amsterdam.</small></div><a class="btn secondary" target="_blank" href="https://www.klm.se/">Öppna</a></div><div class="match"><div><div class="date">Finnair</div><small>ARN–YYC</small></div><div><div class="teams">Sök hos Finnair</div><small>Kontrollera partners och transitland.</small></div><a class="btn secondary" target="_blank" href="https://www.finnair.com/se-sv">Öppna</a></div></div>`}
function renderMedia(){ const q=encodeURIComponent('"Måns Ågren" OR "Mans Agren" Brooks Bandits BCHL'); $('media').innerHTML=`<div class="grid cols-2"><div class="card"><p class="eyebrow">Mediabevakning</p><h2>Sökningar</h2><div class="match-list"><a class="match" target="_blank" href="https://www.google.com/search?q=${q}"><div class="date">Google</div><div class="teams">Måns Ågren / Mans Agren</div><span class="pill">Öppna</span></a><a class="match" target="_blank" href="https://news.google.com/search?q=${q}"><div class="date">Google News</div><div class="teams">Nyhetsbevakning</div><span class="pill">Öppna</span></a><a class="match" target="_blank" href="https://www.youtube.com/results?search_query=M%C3%A5ns+%C3%85gren+Brooks+Bandits"><div class="date">YouTube</div><div class="teams">Highlights / intervjuer</div><span class="pill">Öppna</span></a></div></div><div class="card"><p class="eyebrow">Daglig kontroll</p><div class="notice">Cloudflare Function finns som grund. Nästa steg är att koppla RSS/API och skicka notis när ny träff hittas.</div><textarea rows="8" placeholder="Mediaanteckningar..."></textarea></div></div>`}
function renderFamily(){ $('family').innerHTML=`<div class="grid cols-3"><div class="card"><p class="eyebrow">Familjekalender</p><h2>Viktiga datum</h2><ul><li>Säsongsstart: september 2026</li><li>Julperiod: december</li><li>Slutspel: mars 2027</li></ul><a class="btn secondary" href="/mans_bchl_2026_27_calendar.ics">Ladda kalender</a></div><div class="card"><p class="eyebrow">Packlista</p><textarea rows="10">Pass\nETA/visumunderlag\nFörsäkring\nHockeyutrustning\nKlubbkontakt\nBiljetter\nHotell</textarea></div><div class="card"><p class="eyebrow">Dokument</p><p class="muted">Plats för länkar till försäkring, klubbinfo, resebokningar och viktiga PDF:er.</p><textarea rows="8" placeholder="Klistra in länkar..."></textarea></div></div>`}
renderDashboard();renderMatches();renderReports();renderStats();renderFlights();renderMedia();renderFamily();
