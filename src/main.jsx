
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, BarChart3, Bell, Bot, CalendarDays, ChevronRight, CloudSun,
  FileText, Gauge, Home, Luggage, MapPin, Newspaper, Plane, PlayCircle,
  Radio, Search, ShieldCheck, Star, Target, Trophy, UploadCloud, Users,
  Video, WalletCards, Clock, ExternalLink, ClipboardList
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

const teams = {
  Brooks:{name:'Brooks Bandits',short:'BRO',logo:'B',color:'#ffd34d',city:'Brooks'},
  Spruce:{name:'Spruce Grove Saints',short:'SGS',logo:'SG',color:'#e9c46a',city:'Spruce Grove'},
  Okotoks:{name:'Okotoks Oilers',short:'OKO',logo:'OK',color:'#ffb703',city:'Okotoks'},
  Blackfalds:{name:'Blackfalds Bulldogs',short:'BLK',logo:'BB',color:'#e94560',city:'Blackfalds'}
}

const schedule = [
  {id:1,opponent:'Spruce',date:'2026-09-09T03:00:00+02:00',type:'Hemma',arena:'Centennial Regional Arena',scout:'Försäsong',tv:'FloHockey'},
  {id:2,opponent:'Okotoks',date:'2026-09-12T03:05:00+02:00',type:'Borta',arena:'Viking Rentals Centre',scout:'Försäsong',tv:'FloHockey'},
  {id:3,opponent:'Okotoks',date:'2026-09-13T03:00:00+02:00',type:'Hemma',arena:'Centennial Regional Arena',scout:'Försäsong',tv:'FloHockey'},
  {id:4,opponent:'Blackfalds',date:'2026-09-19T03:00:00+02:00',type:'Borta',arena:'Eagle Builders Centre',scout:'Hög',tv:'FloHockey'},
  {id:5,opponent:'Okotoks',date:'2026-09-20T03:00:00+02:00',type:'Hemma',arena:'Centennial Regional Arena',scout:'Hög',tv:'FloHockey'},
  {id:6,opponent:'Spruce',date:'2026-09-26T03:00:00+02:00',type:'Hemma',arena:'Centennial Regional Arena',scout:'Hög',tv:'FloHockey'}
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
function TeamLogo({team,large=false}) {
  const t=teams[team]
  return <div className={large?'team-logo large':'team-logo'} style={{'--team':t.color}}><span>{t.logo}</span></div>
}
function Button({children,onClick,variant='primary'}) { return <button className={'btn '+variant} onClick={onClick}>{children}</button> }
function ExternalCard({title,url,desc}) {
  return <a className="external-card" href={url} target="_blank" rel="noreferrer">
    <div><ExternalLink/><span>{desc}</span></div><h3>{title}</h3><p>Öppnas i ny flik</p>
  </a>
}
function Metric({icon,label,value,sub,onClick}) {
  return <button className="metric" onClick={onClick}>
    <div className="metric-icon">{icon}</div>
    <div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>
  </button>
}
function TopNav({active,setActive}) {
  return <header className="topnav">
    <div className="brand" onClick={()=>setActive('dashboard')}>
      <div className="brand-mark">MÅ</div><div><strong>Måns Hockey</strong><span>App 5.1</span></div>
    </div>
    <nav>{views.map(([id,label,Icon])=><button className={active===id?'active':''} key={id} onClick={()=>setActive(id)}><Icon size={16}/>{label}</button>)}</nav>
  </header>
}
function Page({kicker,title,children,action}) {
  return <section className="page"><div className="page-head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section>
}
function NextGame({setActive}) {
  const game=schedule[0]; const c=useCountdown(game.date); const opp=teams[game.opponent]
  return <div className="hero-card">
    <div className="live-pill"><Radio size={14}/> Nästa match</div>
    <div className="hero-matchup">
      <div><TeamLogo team="Brooks" large/><strong>Brooks</strong><small>Bandits</small></div>
      <div className="versus">VS</div>
      <div><TeamLogo team={game.opponent} large/><strong>{opp.short}</strong><small>{opp.city}</small></div>
    </div>
    <h2>{game.type==='Hemma'?`Brooks vs ${opp.name}`:`Brooks @ ${opp.name}`}</h2>
    <p><CalendarDays size={16}/> {formatDate(game.date)} svensk tid · {game.arena}</p>
    <div className="countdown"><div><strong>{c.days}</strong><span>dagar</span></div><div><strong>{c.hours}</strong><span>tim</span></div><div><strong>{c.minutes}</strong><span>min</span></div><div><strong>{c.seconds}</strong><span>sek</span></div></div>
    <div className="hero-actions"><Button onClick={()=>setActive('matchcenter')}>Öppna matchcenter</Button><Button variant="light" onClick={()=>setActive('scout')}>Scoutkort</Button></div>
  </div>
}
function MatchTile({game,setActive}) {
  const t=teams[game.opponent]
  return <article className="match-tile">
    <div className="tile-top"><span className={game.type==='Hemma'?'tag home':'tag away'}>{game.type}</span><span className="tag">Scout: {game.scout}</span></div>
    <div className="tile-main"><TeamLogo team="Brooks"/><ChevronRight/><TeamLogo team={game.opponent}/></div>
    <h3>{game.type==='Hemma'?`Brooks vs ${t.name}`:`Brooks @ ${t.name}`}</h3>
    <p>{formatDate(game.date)}</p><p>{game.arena}</p>
    <div className="tile-actions"><button onClick={()=>setActive('matchcenter')}>Inför</button><button onClick={()=>setActive('scout')}>Scout</button><a href="https://www.flohockey.tv/" target="_blank" rel="noreferrer">FloHockey</a></div>
  </article>
}
function Dashboard({setActive}) {
  const brooksTime=new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Edmonton'}).format(new Date())
  return <Page kicker="MansHockey 5.1" title="Familjens hockeyapp">
    <div className="dashboard-grid">
      <div className="hero-copy">
        <p>Nu med klickbar appnavigation: varje huvuddel öppnar en egen vy och externa länkar fungerar.</p>
        <div className="hero-links"><Button onClick={()=>setActive('matchcenter')}>Matchcenter</Button><Button variant="light" onClick={()=>setActive('media')}>Media</Button></div>
      </div>
      <NextGame setActive={setActive}/>
    </div>
    <div className="quick-grid">
      <Metric icon={<Trophy/>} label="Matcher" value="55" sub="schema" onClick={()=>setActive('matchcenter')}/>
      <Metric icon={<Clock/>} label="Brooks-tid" value={brooksTime} sub="lokal tid"/>
      <Metric icon={<Newspaper/>} label="Media" value="6 länkar" sub="klickbar" onClick={()=>setActive('media')}/>
      <Metric icon={<Plane/>} label="Flyg" value="ARN→YYC" sub="bevakning" onClick={()=>setActive('travel')}/>
      <Metric icon={<Target/>} label="Scout" value="logg" sub="efter match" onClick={()=>setActive('scout')}/>
      <Metric icon={<Users/>} label="Familj" value="portal" sub="dokument" onClick={()=>setActive('family')}/>
    </div>
  </Page>
}
function Matchcenter({setActive}) {
  return <Page kicker="Game Center" title="Matchcenter" action={<Button onClick={()=>alert('Importfunktionen kopplas till CSV/ICS i nästa steg.')}>Importera schema</Button>}>
    <div className="match-grid">{schedule.map(g=><MatchTile key={g.id} game={g} setActive={setActive}/>)}</div>
    <div className="info-panel"><h2>Inför/efter match</h2><p>Varje matchkort har nu klickbara åtgärder. Nästa steg är matchdetaljsida med statistik, rapportmall, highlights och resultat.</p></div>
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
    <div className="info-panel"><h2>Regelbunden bevakning</h2><p>Appen har nu klickbara medielänkar. Nästa steg är Cloudflare Worker som kör daglig sökning och sparar träffar i D1.</p></div>
  </Page>
}
function Travel() {
  return <Page kicker="Travel Center" title="Flygresor ARN–Calgary" action={<Button onClick={()=>window.open('https://www.google.com/travel/flights','_blank')}>Öppna Google Flights</Button>}>
    <div className="external-grid">{flightLinks.map(([title,url,desc])=><ExternalCard key={title} title={title} url={url} desc={desc}/>)}</div>
    <div className="travel-rules">
      <h2>Bevakningsregler</h2>
      <div className="chips"><span>Air Canada</span><span>KLM</span><span>Finnair</span><span>ingen USA-transit</span><span>avgång efter 09:30</span><span>ARN → YYC</span><span>kort restid</span></div>
    </div>
  </Page>
}
function Scout() {
  const rows=[['Defensivt spel',92],['Förstapass',88],['Boxplay',94],['Fysik',90],['Pucktransport',78]]
  return <Page kicker="Scout Center" title="Scoutlogg och rapporter" action={<Button onClick={()=>alert('Scoutprotokoll kommer i 5.2.')}>Ny rapport</Button>}>
    <div className="scout-panel">{rows.map(([label,val])=><div className="scout-row" key={label}><div className="scout-label"><ShieldCheck size={18}/><strong>{label}</strong></div><div className="bar"><span style={{width:`${val}%`}}/></div><b>{val}</b></div>)}</div>
  </Page>
}
function Family() {
  const docs=[['Pass','Giltighet och kopia'],['Visum/eTA','Inresa Kanada'],['Försäkring','BCHL + svensk'],['Flygbiljetter','Kommande resor'],['Boende','Billet/familjebesök'],['Packlista','Resor och match']]
  return <Page kicker="Family Portal" title="Familj, dokument och planering">
    <div className="doc-grid">{docs.map(([name,desc])=><article className="doc-card" key={name}><FileText/><div><strong>{name}</strong><span>{desc}</span></div></article>)}</div>
  </Page>
}
function Admin() {
  const tasks=[['Importera schema','CSV/ICS eller manuell import',UploadCloud],['Matchrapport','Inför/efter match',ClipboardList],['Scoutlogg','Betyg och anteckningar',Target],['Flygbevakning','Regler och prisgränser',Plane],['AI-assistent','Frågor om matcher, resor och media',Bot]]
  return <Page kicker="Control Center" title="Admin">
    <div className="admin-grid">{tasks.map(([title,desc,Icon])=><article className="admin-card" key={title}><Icon/><h3>{title}</h3><p>{desc}</p><button onClick={()=>alert(title+' kopplas i nästa funktionssteg.')}>Öppna</button></article>)}</div>
  </Page>
}
function App() {
  const [active,setActive]=useState('dashboard')
  const page={dashboard:<Dashboard setActive={setActive}/>,matchcenter:<Matchcenter setActive={setActive}/>,player:<Player/>,media:<Media/>,travel:<Travel/>,scout:<Scout/>,family:<Family/>,admin:<Admin/>}[active]
  return <main><TopNav active={active} setActive={setActive}/>{page}<footer><span>Måns Hockey · manshockey.com</span><span>Version 5.1</span></footer></main>
}
createRoot(document.getElementById('root')).render(<App/>)
