
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, BarChart3, Bell, Bot, CalendarDays, CheckCircle2, ChevronRight,
  CloudSun, Database, ExternalLink, FileText, Gauge, Home, KeyRound, MapPin,
  Newspaper, Plane, Radio, Save, Search, ShieldCheck, Star, Target, Trophy,
  UploadCloud, Users, Video, Clock, ClipboardList, Lock, Plus, LogOut
} from 'lucide-react'
import './styles.css'

const views = [
  ['dashboard','Dashboard',Home],
  ['matchcenter','Matcher',Trophy],
  ['player','Måns',Star],
  ['media','Media',Newspaper],
  ['travel','Resor',Plane],
  ['scout','Scout',Target],
  ['family','Familj',Users],
  ['admin','Admin',UploadCloud]
]

const seedMatches = [
  {id:1, opponent:'Spruce Grove Saints', game_date:'2026-09-09T03:00:00+02:00', home_away:'Hemma', arena:'Centennial Regional Arena', scout_level:'Försäsong', tv_link:'https://www.flohockey.tv/'},
  {id:2, opponent:'Okotoks Oilers', game_date:'2026-09-12T03:05:00+02:00', home_away:'Borta', arena:'Viking Rentals Centre', scout_level:'Försäsong', tv_link:'https://www.flohockey.tv/'},
  {id:3, opponent:'Okotoks Oilers', game_date:'2026-09-13T03:00:00+02:00', home_away:'Hemma', arena:'Centennial Regional Arena', scout_level:'Försäsong', tv_link:'https://www.flohockey.tv/'}
]

const mediaLinks = [
  ['Google News – Måns Ågren','https://news.google.com/search?q=%22M%C3%A5ns%20%C3%85gren%22&hl=sv&gl=SE&ceid=SE%3Asv','Personlig sökning'],
  ['Google – Mans Agren hockey','https://www.google.com/search?q=%22Mans+Agren%22+hockey','Alternativ stavning'],
  ['Brooks Bandits','https://www.brooksbandits.ca/','Klubben'],
  ['BCHL','https://bchl.ca/','Liga'],
  ['EliteProspects – Måns','https://www.eliteprospects.com/player/801209/mans-agren','Statistik'],
  ['YouTube – Brooks Bandits Måns','https://www.youtube.com/results?search_query=Brooks+Bandits+M%C3%A5ns+%C3%85gren','Video']
]

const flightLinks = [
  ['Air Canada ARN–YYC','https://www.aircanada.com/','Sök Air Canada'],
  ['KLM ARN–YYC','https://www.klm.se/','Sök KLM'],
  ['Finnair ARN–YYC','https://www.finnair.com/se-sv','Sök Finnair'],
  ['Google Flights ARN–YYC','https://www.google.com/travel/flights','Jämför priser']
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
function Button({children,onClick,variant='primary',type='button'}) { return <button type={type} className={'btn '+variant} onClick={onClick}>{children}</button> }
function TopNav({active,setActive,isAdmin,setIsAdmin}) {
  return <header className="topnav">
    <div className="brand" onClick={()=>setActive('dashboard')}>
      <div className="brand-mark">MÅ</div><div><strong>Måns Hockey</strong><span>Version 6.0 · datadriven grund</span></div>
    </div>
    <nav>{views.map(([id,label,Icon])=><button className={active===id?'active':''} key={id} onClick={()=>setActive(id)}><Icon size={16}/>{label}</button>)}</nav>
    <button className={isAdmin?'admin-pill on':'admin-pill'} onClick={()=>setIsAdmin(!isAdmin)}>{isAdmin?<LogOut size={14}/>:<KeyRound size={14}/>} {isAdmin?'Admin på':'Logga in'}</button>
  </header>
}
function Page({kicker,title,children,action}) {
  return <section className="page"><div className="page-head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section>
}
function Metric({icon,label,value,sub,onClick}) {
  return <button className="metric" onClick={onClick}>
    <div className="metric-icon">{icon}</div>
    <div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>
  </button>
}
function ExternalCard({title,url,desc}) {
  return <a className="external-card" href={url} target="_blank" rel="noreferrer">
    <div><ExternalLink/><span>{desc}</span></div><h3>{title}</h3><p>Öppnas i ny flik</p>
  </a>
}
function NextGame({matches,setActive}) {
  const game=matches[0] || seedMatches[0]
  const c=useCountdown(game.game_date)
  return <div className="hero-card">
    <div className="live-pill"><Radio size={14}/> Nästa match</div>
    <h2>Brooks Bandits {game.home_away==='Hemma'?'vs':'@'} {game.opponent}</h2>
    <p><CalendarDays size={16}/> {formatDate(game.game_date)} svensk tid · {game.arena}</p>
    <div className="countdown"><div><strong>{c.days}</strong><span>dagar</span></div><div><strong>{c.hours}</strong><span>tim</span></div><div><strong>{c.minutes}</strong><span>min</span></div><div><strong>{c.seconds}</strong><span>sek</span></div></div>
    <div className="hero-actions"><Button onClick={()=>setActive('matchcenter')}>Öppna matchcenter</Button><Button variant="light" onClick={()=>setActive('admin')}>Importera</Button></div>
  </div>
}
function MatchTile({game,setActive}) {
  return <article className="match-tile">
    <div className="tile-top"><span className={game.home_away==='Hemma'?'tag home':'tag away'}>{game.home_away}</span><span className="tag">Scout: {game.scout_level || '—'}</span></div>
    <h3>Brooks Bandits {game.home_away==='Hemma'?'vs':'@'} {game.opponent}</h3>
    <p>{formatDate(game.game_date)}</p><p>{game.arena}</p>
    <div className="tile-actions"><button onClick={()=>setActive('matchcenter')}>Inför</button><button onClick={()=>setActive('scout')}>Scout</button>{game.tv_link&&<a href={game.tv_link} target="_blank" rel="noreferrer">TV</a>}</div>
  </article>
}
function Dashboard({matches,setActive,dbSource}) {
  const brooksTime=new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Edmonton'}).format(new Date())
  return <Page kicker="MansHockey 6.0" title="Datadriven hockeyapp">
    <div className="dashboard-grid">
      <div className="hero-copy">
        <p>Nu finns adminläge, API-functions, D1-schema och importflöde för matcher. Appen fungerar direkt med fallback-data och kan kopplas till riktig Cloudflare D1.</p>
        <div className="hero-links"><Button onClick={()=>setActive('admin')}>Öppna admin</Button><Button variant="light" onClick={()=>setActive('matchcenter')}>Matchcenter</Button></div>
      </div>
      <NextGame matches={matches} setActive={setActive}/>
    </div>
    <div className="quick-grid">
      <Metric icon={<Database/>} label="Datakälla" value={dbSource} sub="fallback eller D1"/>
      <Metric icon={<Trophy/>} label="Matcher" value={matches.length} sub="från API/import"/>
      <Metric icon={<Clock/>} label="Brooks-tid" value={brooksTime} sub="America/Edmonton"/>
      <Metric icon={<Newspaper/>} label="Media" value="6 länkar" sub="redo" onClick={()=>setActive('media')}/>
      <Metric icon={<Plane/>} label="Flyg" value="ARN→YYC" sub="bevakningsregler" onClick={()=>setActive('travel')}/>
      <Metric icon={<Lock/>} label="Admin" value="lokalt läge" sub="D1 nästa"/>
    </div>
  </Page>
}
function Matchcenter({matches,setActive,isAdmin}) {
  return <Page kicker="Game Center" title="Matchcenter" action={isAdmin?<Button onClick={()=>setActive('admin')}>Importera match</Button>:<Button variant="light" onClick={()=>setActive('admin')}>Adminläge</Button>}>
    <div className="match-grid">{matches.map(g=><MatchTile key={g.id || g.game_date} game={g} setActive={setActive}/>)}</div>
    <div className="info-panel"><h2>Riktigt matchcenter</h2><p>Matcher hämtas via /api/matches. Om D1 saknas visas fallback-data. När D1 är kopplat används databasen automatiskt.</p></div>
  </Page>
}
function Player() {
  return <Page kicker="Player Hub" title="Måns Ågren">
    <div className="player-layout">
      <div className="player-card glass"><div className="avatar">MÅ</div><div><span className="kicker">Spelarprofil</span><h2>Måns Ågren</h2><p>Back · Left · 2006 · Brooks Bandits</p><div className="chips"><span>185 cm</span><span>93 kg</span><span>Shutdown D</span><span>Boxplay</span><span>Förstapass</span></div></div></div>
      <div className="player-metrics"><Metric icon={<Activity/>} label="Matcher" value="0" sub="säsong startar"/><Metric icon={<Star/>} label="Poäng" value="0" sub="0+0"/><Metric icon={<Gauge/>} label="+/-" value="0" sub="efter match"/><Metric icon={<Video/>} label="Highlights" value="0" sub="videoarkiv"/></div>
    </div>
  </Page>
}
function Media() {
  return <Page kicker="Media Center" title="Nyheter och bevakning" action={<Button onClick={()=>window.open('https://news.google.com/search?q=%22M%C3%A5ns%20%C3%85gren%22','_blank')}>Sök nu</Button>}>
    <div className="external-grid">{mediaLinks.map(([title,url,desc])=><ExternalCard key={title} title={title} url={url} desc={desc}/>)}</div>
  </Page>
}
function Travel() {
  return <Page kicker="Travel Center" title="Flygresor ARN–Calgary" action={<Button onClick={()=>window.open('https://www.google.com/travel/flights','_blank')}>Google Flights</Button>}>
    <div className="external-grid">{flightLinks.map(([title,url,desc])=><ExternalCard key={title} title={title} url={url} desc={desc}/>)}</div>
    <div className="travel-rules"><h2>Bevakningsregler</h2><div className="chips"><span>Air Canada</span><span>KLM</span><span>Finnair</span><span>ingen USA-transit</span><span>avgång efter 09:30</span><span>kort restid</span></div></div>
  </Page>
}
function Scout() {
  const rows=[['Defensivt spel',92],['Förstapass',88],['Boxplay',94],['Fysik',90],['Pucktransport',78]]
  return <Page kicker="Scout Center" title="Scoutlogg och rapporter" action={<Button onClick={()=>alert('Rapportmall finns i admin/databas i nästa steg.')}>Ny rapport</Button>}>
    <div className="scout-panel">{rows.map(([label,val])=><div className="scout-row" key={label}><div className="scout-label"><ShieldCheck size={18}/><strong>{label}</strong></div><div className="bar"><span style={{width:`${val}%`}}/></div><b>{val}</b></div>)}</div>
  </Page>
}
function Family() {
  const docs=[['Pass','Giltighet och kopia'],['Visum/eTA','Inresa Kanada'],['Försäkring','BCHL + svensk'],['Flygbiljetter','Kommande resor'],['Boende','Billet/familjebesök'],['Packlista','Resor och match']]
  return <Page kicker="Family Portal" title="Familj, dokument och planering">
    <div className="doc-grid">{docs.map(([name,desc])=><article className="doc-card" key={name}><FileText/><div><strong>{name}</strong><span>{desc}</span></div></article>)}</div>
  </Page>
}
function Admin({isAdmin,setIsAdmin,onLocalImport}) {
  const [csv,setCsv]=useState('')
  const [form,setForm]=useState({opponent:'',game_date:'',home_away:'Hemma',arena:'',scout_level:'Normal',tv_link:'https://www.flohockey.tv/'})
  const [message,setMessage]=useState('')
  function parseCsv() {
    const lines=csv.trim().split(/\n+/).filter(Boolean)
    const imported=lines.map((line,i)=>{
      const [opponent,game_date,home_away,arena,scout_level]=line.split(',').map(x=>x?.trim())
      return {id:Date.now()+i,opponent,game_date,home_away:home_away||'Hemma',arena:arena||'',scout_level:scout_level||'Normal',tv_link:'https://www.flohockey.tv/'}
    }).filter(x=>x.opponent&&x.game_date)
    onLocalImport(imported)
    setMessage(`${imported.length} matcher importerade lokalt.`)
  }
  async function saveMatch(e) {
    e.preventDefault()
    onLocalImport([{id:Date.now(),...form}])
    try {
      const res=await fetch('/api/admin-save-match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data=await res.json()
      setMessage(data.ok?'Match sparad i D1.':'Match sparad lokalt. D1 är inte kopplad ännu.')
    } catch {
      setMessage('Match sparad lokalt. API/D1 inte tillgängligt.')
    }
  }
  if(!isAdmin) return <Page kicker="Admin" title="Logga in">
    <div className="login-card"><KeyRound/><h2>Adminläge</h2><p>Detta är ett lokalt adminläge för familjeappen. Klicka nedan för att aktivera redigering i webbläsaren.</p><Button onClick={()=>setIsAdmin(true)}>Aktivera admin</Button></div>
  </Page>
  return <Page kicker="Control Center" title="Admin och import" action={<Button variant="light" onClick={()=>setIsAdmin(false)}>Logga ut</Button>}>
    <div className="admin-two">
      <form className="admin-form" onSubmit={saveMatch}>
        <h2>Lägg till match</h2>
        <label>Motståndare<input value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})} placeholder="Okotoks Oilers"/></label>
        <label>Datum/tid<input value={form.game_date} onChange={e=>setForm({...form,game_date:e.target.value})} placeholder="2026-09-20T03:00:00+02:00"/></label>
        <label>Hemma/borta<select value={form.home_away} onChange={e=>setForm({...form,home_away:e.target.value})}><option>Hemma</option><option>Borta</option></select></label>
        <label>Arena<input value={form.arena} onChange={e=>setForm({...form,arena:e.target.value})} placeholder="Centennial Regional Arena"/></label>
        <label>Scoutnivå<input value={form.scout_level} onChange={e=>setForm({...form,scout_level:e.target.value})}/></label>
        <Button type="submit"><Save size={16}/> Spara match</Button>
      </form>
      <div className="admin-form">
        <h2>Importera CSV</h2>
        <p>Format: motståndare,datum,hemma/borta,arena,scoutnivå</p>
        <textarea value={csv} onChange={e=>setCsv(e.target.value)} placeholder={'Okotoks Oilers,2026-09-20T03:00:00+02:00,Hemma,Centennial Regional Arena,Hög'} />
        <Button onClick={parseCsv}><UploadCloud size={16}/> Importera lokalt</Button>
      </div>
    </div>
    {message&&<div className="notice"><CheckCircle2/> {message}</div>}
    <div className="info-panel"><h2>D1-setup</h2><p>Filen schema/d1_schema.sql finns i paketet. Skapa D1 i Cloudflare, kör schemat, lägg sedan tillbaka D1-bindningen i wrangler.toml med korrekt database_id.</p></div>
  </Page>
}
function App() {
  const [active,setActive]=useState('dashboard')
  const [isAdmin,setIsAdmin]=useState(false)
  const [matches,setMatches]=useState(seedMatches)
  const [dbSource,setDbSource]=useState('fallback')
  useEffect(()=>{fetch('/api/matches').then(r=>r.json()).then(data=>{if(data.matches){setMatches(data.matches);setDbSource(data.source||'api')}}).catch(()=>{})},[])
  function onLocalImport(items){setMatches(prev=>[...prev,...items].sort((a,b)=>new Date(a.game_date)-new Date(b.game_date)))}
  const page={
    dashboard:<Dashboard matches={matches} setActive={setActive} dbSource={dbSource}/>,
    matchcenter:<Matchcenter matches={matches} setActive={setActive} isAdmin={isAdmin}/>,
    player:<Player/>,
    media:<Media/>,
    travel:<Travel/>,
    scout:<Scout/>,
    family:<Family/>,
    admin:<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} onLocalImport={onLocalImport}/>
  }[active]
  return <main><TopNav active={active} setActive={setActive} isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>{page}<footer><span>Måns Hockey · manshockey.com</span><span>Version 6.0</span></footer></main>
}
createRoot(document.getElementById('root')).render(<App/>)
