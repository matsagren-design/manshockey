
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, BarChart3, Bell, Bot, CalendarDays, CheckCircle2, ChevronRight,
  CloudSun, Database, ExternalLink, FileText, Gauge, Home, KeyRound, Lock,
  LogOut, MapPin, Newspaper, Plane, Radio, Save, ShieldCheck, Star, Target,
  Trophy, UploadCloud, Users, Video, Clock, ClipboardList, Search, Folder,
  Image, BookOpen, WalletCards, Route, Zap
} from 'lucide-react'
import './styles.css'

const views = [
  ['dashboard','Dashboard',Home],
  ['matcharchive','Matcharkiv',BookOpen],
  ['player','Måns',Star],
  ['scout','Scout',Target],
  ['media','Media',Newspaper],
  ['travel','Resor',Plane],
  ['documents','Dokument',Folder],
  ['admin','Admin',UploadCloud]
]

const seedMatches = [
  {id:1, opponent:'Spruce Grove Saints', game_date:'2026-09-09T03:00:00+02:00', home_away:'Hemma', arena:'Centennial Regional Arena', city:'Brooks', tv_link:'https://www.flohockey.tv/', report_before:'Fokus på enkel puckhantering, första pass och defensiv trygghet.'},
  {id:2, opponent:'Okotoks Oilers', game_date:'2026-09-12T03:05:00+02:00', home_away:'Borta', arena:'Viking Rentals Centre', city:'Okotoks', tv_link:'https://www.flohockey.tv/', report_before:'Tidigt bortatest. Håll koll på special teams och sargspel.'}
]
const seedScout = [
  {category:'Defensivt spel', score:92, note:'Stark framför mål och låg risk.'},
  {category:'Förstapass', score:88, note:'Snabb första puck ur zon.'},
  {category:'Boxplay', score:94, note:'Tydlig special teams-profil.'},
  {category:'Fysik', score:90, note:'Vinner närkamper längs sarg.'},
  {category:'Pucktransport', score:78, note:'Utvecklingsområde mot hög press.'}
]

function formatDate(date) {
  return new Intl.DateTimeFormat('sv-SE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(date))
}
function useCountdown(dateString) {
  const [now,setNow]=useState(new Date())
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[])
  const diff=Math.max(0,new Date(dateString)-now)
  return {days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000%24),minutes:Math.floor(diff/60000%60),seconds:Math.floor(diff/1000%60)}
}
async function getJson(url, fallback) {
  try { const r = await fetch(url); const j = await r.json(); return j } catch { return fallback }
}
function Button({children,onClick,variant='primary',type='button'}) { return <button type={type} className={'btn '+variant} onClick={onClick}>{children}</button> }
function TopNav({active,setActive,isAdmin,setIsAdmin}) {
  return <header className="topnav">
    <div className="brand" onClick={()=>setActive('dashboard')}><div className="brand-mark">MÅ</div><div><strong>Måns Hockey</strong><span>Version 7.0 · platform</span></div></div>
    <nav>{views.map(([id,label,Icon])=><button className={active===id?'active':''} key={id} onClick={()=>setActive(id)}><Icon size={16}/>{label}</button>)}</nav>
    <button className={isAdmin?'admin-pill on':'admin-pill'} onClick={()=>setIsAdmin(!isAdmin)}>{isAdmin?<LogOut size={14}/>:<KeyRound size={14}/>} {isAdmin?'Admin på':'Logga in'}</button>
  </header>
}
function Page({kicker,title,children,action}) { return <section className="page"><div className="page-head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section> }
function Metric({icon,label,value,sub,onClick}) { return <button className="metric" onClick={onClick}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div></button> }
function ExternalCard({title,url,desc,tag}) { return <a className="external-card" href={url} target="_blank" rel="noreferrer"><div><ExternalLink/><span>{tag||desc}</span></div><h3>{title}</h3><p>{desc}</p></a> }

function NextGame({matches,setActive}) {
  const game=matches?.[0] || seedMatches[0]
  const c=useCountdown(game.game_date)
  return <div className="hero-card">
    <div className="live-pill"><Radio size={14}/> Nästa match</div>
    <h2>Brooks Bandits {game.home_away==='Hemma'?'vs':'@'} {game.opponent}</h2>
    <p><CalendarDays size={16}/> {formatDate(game.game_date)} svensk tid · {game.arena}</p>
    <div className="countdown"><div><strong>{c.days}</strong><span>dagar</span></div><div><strong>{c.hours}</strong><span>tim</span></div><div><strong>{c.minutes}</strong><span>min</span></div><div><strong>{c.seconds}</strong><span>sek</span></div></div>
    <div className="hero-actions"><Button onClick={()=>setActive('matcharchive')}>Matcharkiv</Button><Button variant="light" onClick={()=>setActive('admin')}>Admin</Button></div>
  </div>
}
function Dashboard({matches,setActive,dbSource,weather,media,travel}) {
  const brooksTime=new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Edmonton'}).format(new Date())
  return <Page kicker="MansHockey 7.0" title="Digitalt hockeyarkiv">
    <div className="dashboard-grid"><div className="hero-copy"><p>Datadriven plattform med inloggningsgrund, D1-förberedelse, R2-filuppladdningsförberedelse, integrationslager, scoutmodul och matcharkiv.</p><div className="hero-links"><Button onClick={()=>setActive('matcharchive')}>Öppna matcharkiv</Button><Button variant="light" onClick={()=>setActive('admin')}>Adminpanel</Button></div></div><NextGame matches={matches} setActive={setActive}/></div>
    <div className="quick-grid">
      <Metric icon={<Database/>} label="Datakälla" value={dbSource} sub="fallback/D1"/>
      <Metric icon={<BookOpen/>} label="Matcharkiv" value={matches.length} sub="matcher"/>
      <Metric icon={<Clock/>} label="Brooks-tid" value={brooksTime} sub="America/Edmonton"/>
      <Metric icon={<CloudSun/>} label="Väder" value={weather?.summary || 'API redo'} sub="Brooks"/>
      <Metric icon={<Newspaper/>} label="Media" value={(media||[]).length} sub="träffar" onClick={()=>setActive('media')}/>
      <Metric icon={<Plane/>} label="Resor" value={(travel||[]).length} sub="bevakningar" onClick={()=>setActive('travel')}/>
    </div>
  </Page>
}
function MatchArchive({matches,setActive}) {
  return <Page kicker="Match Archive" title="Matcharkiv" action={<Button onClick={()=>setActive('admin')}>Lägg till match</Button>}>
    <div className="match-grid">{matches.map(game=><article className="match-tile" key={game.id||game.game_date}>
      <div className="tile-top"><span className={game.home_away==='Hemma'?'tag home':'tag away'}>{game.home_away}</span><span className="tag">{game.city || 'BCHL'}</span></div>
      <h3>Brooks {game.home_away==='Hemma'?'vs':'@'} {game.opponent}</h3>
      <p>{formatDate(game.game_date)}</p><p>{game.arena}</p>
      {game.result && <strong>Resultat: {game.result}</strong>}
      <div className="report-box"><h4>Inför</h4><p>{game.report_before || 'Rapportmall redo.'}</p><h4>Efter</h4><p>{game.report_after || 'Efterrapport fylls efter match.'}</p></div>
      <div className="tile-actions">{game.tv_link&&<a href={game.tv_link} target="_blank">TV</a>}<button onClick={()=>setActive('scout')}>Scout</button></div>
    </article>)}</div>
  </Page>
}
function Player() {
  return <Page kicker="Player Hub" title="Måns Ågren">
    <div className="player-layout">
      <div className="player-card"><div className="avatar">MÅ</div><div><span className="kicker">Spelarprofil</span><h2>Måns Ågren</h2><p>Back · Left · 2006 · Brooks Bandits</p><div className="chips"><span>185 cm</span><span>93 kg</span><span>Shutdown D</span><span>Boxplay</span><span>Förstapass</span></div></div></div>
      <div className="player-metrics"><Metric icon={<Activity/>} label="Matcher" value="0" sub="säsong startar"/><Metric icon={<Star/>} label="Poäng" value="0" sub="0+0"/><Metric icon={<Gauge/>} label="+/-" value="0" sub="efter match"/><Metric icon={<Video/>} label="Highlights" value="0" sub="R2-videoarkiv"/></div>
    </div>
  </Page>
}
function Scout({reports,setReports,isAdmin}) {
  const [form,setForm]=useState({category:'',score:80,note:''})
  async function save(e){e.preventDefault(); const item={...form,score:Number(form.score)}; setReports(prev=>[item,...prev]); try{await fetch('/api/save-scout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)})}catch{}}
  return <Page kicker="Scout Center" title="Scoutmodul" action={isAdmin?<Button onClick={()=>document.getElementById('scout-form')?.scrollIntoView()}>Ny rapport</Button>:null}>
    <div className="scout-panel">{reports.map((r,i)=><div className="scout-row" key={i}><div className="scout-label"><ShieldCheck size={18}/><div><strong>{r.category}</strong><small>{r.note}</small></div></div><div className="bar"><span style={{width:`${r.score}%`}}/></div><b>{r.score}</b></div>)}</div>
    {isAdmin&&<form id="scout-form" className="admin-form inline-form" onSubmit={save}><h2>Ny scoutobservation</h2><label>Kategori<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Förstapass"/></label><label>Betyg<input type="number" value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/></label><label>Notering<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label><Button type="submit"><Save size={16}/> Spara scout</Button></form>}
  </Page>
}
function Media({media}) {
  return <Page kicker="Media Hub" title="Media och nyhetsflöden" action={<Button onClick={()=>window.open('https://news.google.com/search?q=%22M%C3%A5ns%20%C3%85gren%22','_blank')}>Sök nu</Button>}>
    <div className="external-grid">{media.map((m,i)=><ExternalCard key={i} title={m.title} url={m.url} desc={m.source || 'Media'} tag={m.tag}/>)}</div>
  </Page>
}
function Travel({travel}) {
  const links=[['Air Canada','https://www.aircanada.com/'],['KLM','https://www.klm.se/'],['Finnair','https://www.finnair.com/se-sv'],['Google Flights','https://www.google.com/travel/flights']]
  return <Page kicker="Travel Center" title="Resor och flygbevakning" action={<Button onClick={()=>window.open('https://www.google.com/travel/flights','_blank')}>Jämför flyg</Button>}>
    <div className="external-grid">{links.map(([title,url])=><ExternalCard key={title} title={title} url={url} desc="ARN–YYC" tag="Flyg"/>)}</div>
    <div className="travel-rules"><h2>Aktiva bevakningar</h2>{travel.map((t,i)=><p key={i}><b>{t.airline}</b>: {t.origin} → {t.destination}, max {t.max_price_sek || '—'} kr, efter {t.depart_after}, undvik USA: {t.avoid_usa ? 'ja':'nej'}.</p>)}</div>
  </Page>
}
function Documents({isAdmin}) {
  const docs=[['Pass','Giltighet och kopia'],['Visum/eTA','Inresa Kanada'],['Försäkring','BCHL + svensk'],['Flygbiljetter','Kommande resor'],['Boende','Billet/familjebesök'],['Kvitton','Resor och utrustning']]
  return <Page kicker="Family Files" title="Dokument och filer" action={isAdmin?<Button onClick={()=>alert('R2 är förberett. Koppla bucket för riktig uppladdning.')}>Ladda upp</Button>:null}>
    <div className="doc-grid">{docs.map(([name,desc])=><article className="doc-card" key={name}><FileText/><div><strong>{name}</strong><span>{desc}</span></div></article>)}</div>
    <div className="info-panel"><h2>R2-förberedelse</h2><p>API:t /api/upload-url är förberett för R2. När bucket är skapad kan dokument, bilder och videor sparas utanför GitHub.</p></div>
  </Page>
}
function Admin({isAdmin,setIsAdmin,onLocalImport}) {
  const [match,setMatch]=useState({opponent:'',game_date:'',home_away:'Hemma',arena:'',city:'',tv_link:'https://www.flohockey.tv/',report_before:'',report_after:''})
  const [message,setMessage]=useState('')
  async function saveMatch(e){e.preventDefault(); const item={id:Date.now(),...match}; onLocalImport([item]); try{const r=await fetch('/api/save-match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}); const j=await r.json(); setMessage(j.ok?'Match sparad i D1.':'Match sparad lokalt. D1 saknas ännu.')}catch{setMessage('Match sparad lokalt. API ej tillgängligt.')}}
  if(!isAdmin) return <Page kicker="Admin" title="Skyddad adminyta"><div className="login-card"><KeyRound/><h2>Inloggningsgrund</h2><p>Detta är adminlägets grund. Nästa steg är Cloudflare Access eller egen e-postinloggning.</p><Button onClick={()=>setIsAdmin(true)}>Aktivera adminläge</Button></div></Page>
  return <Page kicker="Control Center" title="Admin 7.0" action={<Button variant="light" onClick={()=>setIsAdmin(false)}><LogOut size={16}/> Logga ut</Button>}>
    <div className="admin-two">
      <form className="admin-form" onSubmit={saveMatch}><h2>Ny match / matchrapport</h2>
        {['opponent','game_date','arena','city','tv_link'].map(k=><label key={k}>{k}<input value={match[k]} onChange={e=>setMatch({...match,[k]:e.target.value})}/></label>)}
        <label>Hemma/borta<select value={match.home_away} onChange={e=>setMatch({...match,home_away:e.target.value})}><option>Hemma</option><option>Borta</option></select></label>
        <label>Inför-rapport<textarea value={match.report_before} onChange={e=>setMatch({...match,report_before:e.target.value})}/></label>
        <label>Efter-rapport<textarea value={match.report_after} onChange={e=>setMatch({...match,report_after:e.target.value})}/></label>
        <Button type="submit"><Save size={16}/> Spara</Button>
      </form>
      <div className="admin-form"><h2>Integrationsstatus</h2><p><CheckCircle2/> API-functions finns.</p><p><CheckCircle2/> D1-schema finns.</p><p><CheckCircle2/> R2-bindning är förberedd.</p><p><CheckCircle2/> PWA-manifest och service worker finns.</p><p><CheckCircle2/> Matcharkiv och scoutmodul finns.</p></div>
    </div>
    {message&&<div className="notice"><CheckCircle2/> {message}</div>}
  </Page>
}
function App() {
  const [active,setActive]=useState('dashboard')
  const [isAdmin,setIsAdmin]=useState(false)
  const [matches,setMatches]=useState(seedMatches)
  const [reports,setReports]=useState(seedScout)
  const [media,setMedia]=useState([])
  const [travel,setTravel]=useState([])
  const [weather,setWeather]=useState(null)
  const [dbSource,setDbSource]=useState('fallback')
  useEffect(()=>{getJson('/api/matches',{matches:seedMatches,source:'fallback'}).then(d=>{setMatches(d.matches||seedMatches);setDbSource(d.source||'api')}); getJson('/api/scout',{reports:seedScout}).then(d=>setReports(d.reports||seedScout)); getJson('/api/media',{media:[]}).then(d=>setMedia(d.media||[])); getJson('/api/travel',{travel:[]}).then(d=>setTravel(d.travel||[])); getJson('/api/weather',{}).then(setWeather); if('serviceWorker' in navigator){navigator.serviceWorker.register('/service-worker.js').catch(()=>{})}},[])
  function onLocalImport(items){setMatches(prev=>[...items,...prev].sort((a,b)=>new Date(a.game_date)-new Date(b.game_date)))}
  const page={dashboard:<Dashboard matches={matches} setActive={setActive} dbSource={dbSource} weather={weather} media={media} travel={travel}/>,matcharchive:<MatchArchive matches={matches} setActive={setActive}/>,player:<Player/>,scout:<Scout reports={reports} setReports={setReports} isAdmin={isAdmin}/>,media:<Media media={media}/>,travel:<Travel travel={travel}/>,documents:<Documents isAdmin={isAdmin}/>,admin:<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} onLocalImport={onLocalImport}/>}[active]
  return <main><TopNav active={active} setActive={setActive} isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>{page}<footer><span>Måns Hockey · manshockey.com</span><span>Version 7.0</span></footer></main>
}
createRoot(document.getElementById('root')).render(<App/>)
