
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, BarChart3, Bell, Bot, BookOpen, CalendarDays, CheckCircle2,
  Clock, CloudSun, Database, ExternalLink, FileText, Folder, Gauge, Home,
  Image, KeyRound, LogOut, MapPin, Newspaper, Plane, Radio, Route, Search,
  ShieldCheck, Star, Target, Trophy, UploadCloud, Users, Video, WalletCards,
  Zap, Send, Sparkles
} from 'lucide-react'
import './styles.css'

const tabs = [
  ['live','Live',Home],
  ['matches','Matcher',BookOpen],
  ['analytics','Analytics',BarChart3],
  ['ai','AI Coach',Bot],
  ['media','Media',Newspaper],
  ['travel','Resor',Plane],
  ['files','Filer',Folder],
  ['admin','Admin',UploadCloud]
]

const seedMatches = [
  { id:1, opponent:'Spruce Grove Saints', game_date:'2026-09-09T03:00:00+02:00', home_away:'Hemma', arena:'Centennial Regional Arena', city:'Brooks', report_before:'Fokus på enkel puckhantering, första pass och defensiv trygghet.' },
  { id:2, opponent:'Okotoks Oilers', game_date:'2026-09-12T03:05:00+02:00', home_away:'Borta', arena:'Viking Rentals Centre', city:'Okotoks', report_before:'Tidigt bortatest. Håll koll på special teams och sargspel.' }
]

function fmt(date){return new Intl.DateTimeFormat('sv-SE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(date))}
function useCountdown(date){const [now,setNow]=useState(new Date());useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);const d=Math.max(0,new Date(date)-now);return{days:Math.floor(d/86400000),hours:Math.floor(d/3600000%24),minutes:Math.floor(d/60000%60)}}
async function getJson(url,fallback){try{const r=await fetch(url);return await r.json()}catch{return fallback}}

function Top({active,setActive,isAdmin,setIsAdmin}) {
  return <header className="top">
    <div className="brand" onClick={()=>setActive('live')}><div className="mark">MX</div><div><strong>MansHockey X</strong><span>Version 8 · platform</span></div></div>
    <nav>{tabs.map(([id,label,Icon])=><button key={id} className={active===id?'active':''} onClick={()=>setActive(id)}><Icon size={16}/>{label}</button>)}</nav>
    <button className={isAdmin?'admin on':'admin'} onClick={()=>setIsAdmin(!isAdmin)}>{isAdmin?<LogOut size={14}/>:<KeyRound size={14}/>} {isAdmin?'Admin':'Login'}</button>
  </header>
}
function Page({kicker,title,children,action}){return <section className="page"><div className="head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section>}
function Card({icon,label,value,sub,onClick}){return <button className="card" onClick={onClick}><div className="icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div></button>}
function Next({matches,setActive}){const m=matches[0]||seedMatches[0];const c=useCountdown(m.game_date);return <div className="next"><div className="pill"><Radio size={14}/> Live dashboard</div><h2>Brooks {m.home_away==='Hemma'?'vs':'@'} {m.opponent}</h2><p><CalendarDays size={16}/> {fmt(m.game_date)} · {m.arena}</p><div className="count"><div><b>{c.days}</b><span>dagar</span></div><div><b>{c.hours}</b><span>tim</span></div><div><b>{c.minutes}</b><span>min</span></div></div><div className="actions"><button onClick={()=>setActive('matches')}>Matcharkiv</button><button onClick={()=>setActive('ai')}>Fråga AI</button></div></div>}
function Live({matches,setActive,health,media,travel}){const brooks=new Intl.DateTimeFormat('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Edmonton'}).format(new Date());return <Page kicker="MansHockey X" title="Live dashboard"><div className="livegrid"><div className="intro"><p>Ny generation: sportplattform med live-dashboard, AI Coach, analytics, video/bildcenter, familjefiler, resecenter och Cloudflare D1/R2/Access-plan.</p><div className="actions"><button onClick={()=>setActive('admin')}>Control Center</button><button onClick={()=>setActive('analytics')}>Analytics</button></div></div><Next matches={matches} setActive={setActive}/></div><div className="metrics"><Card icon={<Database/>} label="Backend" value={health?.d1?'D1 aktiv':'Fallback'} sub={health?.r2?'R2 aktiv':'R2 redo'}/><Card icon={<Clock/>} label="Brooks" value={brooks} sub="lokal tid"/><Card icon={<BookOpen/>} label="Matcher" value={matches.length} sub="arkiv"/><Card icon={<Newspaper/>} label="Media" value={media.length} sub="flöden" onClick={()=>setActive('media')}/><Card icon={<Plane/>} label="Resor" value={travel.length} sub="bevakningar" onClick={()=>setActive('travel')}/><Card icon={<Bot/>} label="AI Coach" value="Demo" sub="redo" onClick={()=>setActive('ai')}/></div></Page>}
function Matches({matches}){return <Page kicker="Match Archive" title="Matcharkiv och rapporter"><div className="grid">{matches.map(m=><article className="tile" key={m.id||m.game_date}><span className="tag">{m.home_away}</span><h3>Brooks {m.home_away==='Hemma'?'vs':'@'} {m.opponent}</h3><p>{fmt(m.game_date)}</p><p>{m.arena}</p><div className="report"><b>Inför</b><p>{m.report_before||'Rapportmall redo.'}</p><b>Efter</b><p>{m.report_after||'Efterrapport fylls efter match.'}</p></div></article>)}</div></Page>}
function Analytics({analytics}){const points=analytics?.points||[];const scout=analytics?.scout||[];return <Page kicker="Analytics" title="Utveckling och statistik"><div className="analytics"><section><h2>Poäng per månad</h2>{points.map(x=><div className="barrow" key={x.label}><span>{x.label}</span><div><i style={{width:`${Math.max(6,x.value*20)}%`}}/></div><b>{x.value}</b></div>)}</section><section><h2>Scoutprofil</h2>{scout.map(x=><div className="barrow" key={x.label}><span>{x.label}</span><div><i style={{width:`${x.value}%`}}/></div><b>{x.value}</b></div>)}</section></div></Page>}
function AICoach(){const [q,setQ]=useState('Hur ser nästa match ut?');const [a,setA]=useState('');async function ask(){const r=await fetch('/api/ai-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});const j=await r.json();setA(j.answer)}return <Page kicker="AI Coach" title="Fråga appen"><div className="ai"><Sparkles/><p>Ställ frågor om matcher, scouting, media och resor. Nu som säker Worker-grund.</p><textarea value={q} onChange={e=>setQ(e.target.value)}/><button onClick={ask}><Send size={16}/> Fråga</button>{a&&<div className="answer">{a}</div>}</div></Page>}
function Media({media}){return <Page kicker="Media" title="Media och nyheter"><div className="grid">{media.map((m,i)=><a className="tile" key={i} href={m.url} target="_blank"><span className="tag">{m.tag||m.source}</span><h3>{m.title}</h3><p>{m.source}</p><ExternalLink/></a>)}</div></Page>}
function Travel({travel}){return <Page kicker="Travel" title="Resecenter"><div className="grid">{travel.map((t,i)=><article className="tile" key={i}><span className="tag">{t.airline}</span><h3>{t.origin} → {t.destination}</h3><p>Max {t.max_price_sek||'—'} kr · efter {t.depart_after} · undvik USA: {t.avoid_usa?'ja':'nej'}</p><p>{t.note}</p></article>)}</div></Page>}
function Files({isAdmin}){const items=[['Video Center','Highlights och FloHockey-länkar',Video],['Bildgalleri','Match, resa och familj',Image],['Dokument','Pass, visum, försäkring',FileText],['R2 Storage','Filer utanför GitHub',Folder]];return <Page kicker="Files" title="Video, bilder och dokument" action={isAdmin?<button>Ladda upp</button>:null}><div className="grid">{items.map(([t,d,Icon])=><article className="tile" key={t}><Icon/><h3>{t}</h3><p>{d}</p></article>)}</div></Page>}
function Admin({isAdmin,setIsAdmin}){return <Page kicker="Control Center" title="CMS och drift">{!isAdmin?<div className="panel"><KeyRound/><h2>Admin skyddas senare med Cloudflare Access</h2><p>Aktivera adminläge lokalt för att se CMS-planen.</p><button onClick={()=>setIsAdmin(true)}>Aktivera</button></div>:<div className="grid"><article className="tile"><Database/><h3>D1</h3><p>Databasstruktur finns i schema/d1_schema.sql.</p></article><article className="tile"><Folder/><h3>R2</h3><p>Filuppladdning för bilder, video och PDF.</p></article><article className="tile"><LockIcon/><h3>Access</h3><p>Skydda admin med Cloudflare Access.</p></article><article className="tile"><Bot/><h3>AI</h3><p>AI Coach via Worker, kan kopplas till Cloudflare AI/OpenAI.</p></article></div>}</Page>}
function LockIcon(){return <KeyRound/>}

function App(){const [active,setActive]=useState('live');const [isAdmin,setIsAdmin]=useState(false);const [matches,setMatches]=useState(seedMatches);const [media,setMedia]=useState([]);const [travel,setTravel]=useState([]);const [analytics,setAnalytics]=useState(null);const [health,setHealth]=useState(null);useEffect(()=>{getJson('/api/health',{}).then(setHealth);getJson('/api/matches',{matches:seedMatches}).then(d=>setMatches(d.matches||seedMatches));getJson('/api/media',{media:[]}).then(d=>setMedia(d.media||[]));getJson('/api/travel',{travel:[]}).then(d=>setTravel(d.travel||[]));getJson('/api/analytics',{}).then(setAnalytics);if('serviceWorker'in navigator){navigator.serviceWorker.register('/service-worker.js').catch(()=>{})}},[]);const pages={live:<Live matches={matches} setActive={setActive} health={health} media={media} travel={travel}/>,matches:<Matches matches={matches}/>,analytics:<Analytics analytics={analytics}/>,ai:<AICoach/>,media:<Media media={media}/>,travel:<Travel travel={travel}/>,files:<Files isAdmin={isAdmin}/>,admin:<Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>};return <main><Top active={active} setActive={setActive} isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>{pages[active]}<footer><span>MansHockey X · manshockey.com</span><span>Version 8</span></footer></main>}

createRoot(document.getElementById('root')).render(<App/>)
