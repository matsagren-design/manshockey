
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, BarChart3, Bell, CalendarDays, CheckCircle2, ChevronRight,
  CloudSun, FileText, MapPin, Newspaper, Plane, PlayCircle, ShieldCheck,
  Star, Target, Trophy, Users, Video, Zap, Clock, Gauge, ClipboardList,
  Radio, Home, Route, WalletCards, Luggage, Bot, UploadCloud
} from 'lucide-react'
import './styles.css'

const teams = {
  Brooks: { name: 'Brooks Bandits', short: 'BRO', logo: 'B', color: '#ffd34d', city: 'Brooks' },
  Spruce: { name: 'Spruce Grove Saints', short: 'SGS', logo: 'SG', color: '#e9c46a', city: 'Spruce Grove' },
  Okotoks: { name: 'Okotoks Oilers', short: 'OKO', logo: 'OK', color: '#ffb703', city: 'Okotoks' },
  Blackfalds: { name: 'Blackfalds Bulldogs', short: 'BLK', logo: 'BB', color: '#e94560', city: 'Blackfalds' },
  Sherwood: { name: 'Sherwood Park Crusaders', short: 'SPC', logo: 'SP', color: '#70e000', city: 'Sherwood Park' }
}

const schedule = [
  { id: 1, opponent: 'Spruce', date: '2026-09-09T03:00:00+02:00', type: 'Hemma', arena: 'Centennial Regional Arena', status: 'Kommande', scout: 'Försäsong', tv: 'FloHockey', result: null },
  { id: 2, opponent: 'Okotoks', date: '2026-09-12T03:05:00+02:00', type: 'Borta', arena: 'Viking Rentals Centre', status: 'Kommande', scout: 'Försäsong', tv: 'FloHockey', result: null },
  { id: 3, opponent: 'Okotoks', date: '2026-09-13T03:00:00+02:00', type: 'Hemma', arena: 'Centennial Regional Arena', status: 'Kommande', scout: 'Försäsong', tv: 'FloHockey', result: null },
  { id: 4, opponent: 'Blackfalds', date: '2026-09-19T03:00:00+02:00', type: 'Borta', arena: 'Eagle Builders Centre', status: 'Kommande', scout: 'Hög', tv: 'FloHockey', result: null },
  { id: 5, opponent: 'Okotoks', date: '2026-09-20T03:00:00+02:00', type: 'Hemma', arena: 'Centennial Regional Arena', status: 'Kommande', scout: 'Hög', tv: 'FloHockey', result: null },
  { id: 6, opponent: 'Spruce', date: '2026-09-26T03:00:00+02:00', type: 'Hemma', arena: 'Centennial Regional Arena', status: 'Kommande', scout: 'Hög', tv: 'FloHockey', result: null }
]

const standings = [
  ['Brooks Bandits', 0, 0, 0, 0, 0],
  ['Okotoks Oilers', 0, 0, 0, 0, 0],
  ['Spruce Grove Saints', 0, 0, 0, 0, 0],
  ['Blackfalds Bulldogs', 0, 0, 0, 0, 0],
  ['Sherwood Park Crusaders', 0, 0, 0, 0, 0]
]

const scoutRows = [
  ['Defensivt spel', 92, 'Stark framför mål och låg risk.'],
  ['Förstapass', 88, 'Snabb första puck ur zon.'],
  ['Boxplay', 94, 'Tydlig special teams-profil.'],
  ['Fysik', 90, 'Vinner närkamper längs sarg.'],
  ['Pucktransport', 78, 'Utvecklingsområde mot hög press.']
]

const travelOptions = [
  { airline: 'Air Canada', price: 'Bevakning', route: 'ARN–YYC', duration: 'Kortast möjlig', tags: ['ingen USA', 'efter 09:30', '1 byte'] },
  { airline: 'KLM', price: 'Bevakning', route: 'ARN–AMS–YYC', duration: 'Stabil transfer', tags: ['ingen USA', 'bra tid', 'familjevänlig'] },
  { airline: 'Finnair', price: 'Bevakning', route: 'ARN–HEL–YYC', duration: 'Alternativ', tags: ['ingen USA', 'Helsingfors', 'jämför pris'] }
]

const docs = [
  ['Pass', 'Giltighet och kopia'],
  ['Visum/eTA', 'Inresa Kanada'],
  ['Försäkring', 'BCHL + svensk försäkring'],
  ['Flygbiljetter', 'Kommande resor'],
  ['Boende', 'Billet/familjebesök'],
  ['Kvitton', 'Resor och utrustning']
]

function formatDate(date) {
  return new Intl.DateTimeFormat('sv-SE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

function useCountdown(dateString) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const diff = Math.max(0, new Date(dateString) - now)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  }
}

function TeamLogo({ team, large=false }) {
  const t = teams[team]
  return <div className={large ? 'team-logo large' : 'team-logo'} style={{ '--team': t.color }}>
    <span>{t.logo}</span>
  </div>
}

function TopNav() {
  const items = [
    ['Dashboard', '#dashboard'], ['Matchcenter', '#matchcenter'], ['Måns', '#player'], ['Scout', '#scout'],
    ['Resor', '#travel'], ['Media', '#media'], ['Familj', '#family'], ['Admin', '#admin']
  ]
  return <header className="topnav">
    <div className="brand">
      <div className="brand-mark">MÅ</div>
      <div><strong>Måns Hockey</strong><span>Elite family platform</span></div>
    </div>
    <nav>{items.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</nav>
  </header>
}

function Metric({ icon, label, value, sub }) {
  return <div className="metric">
    <div className="metric-icon">{icon}</div>
    <div><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
  </div>
}

function Section({ id, kicker, title, children, action }) {
  return <section id={id} className="section">
    <div className="section-head">
      <div><span>{kicker}</span><h2>{title}</h2></div>
      {action && <button className="outline-btn">{action}</button>}
    </div>
    {children}
  </section>
}

function NextGame() {
  const next = schedule[0]
  const c = useCountdown(next.date)
  const opponent = teams[next.opponent]
  return <div className="next-game hero-card">
    <div className="live-pill"><Radio size={14}/> Matchcenter 5.0</div>
    <div className="hero-matchup">
      <div><TeamLogo team="Brooks" large/><strong>Brooks</strong><small>Bandits</small></div>
      <div className="versus">VS</div>
      <div><TeamLogo team={next.opponent} large/><strong>{opponent.short}</strong><small>{opponent.city}</small></div>
    </div>
    <h2>{next.type === 'Hemma' ? `Brooks vs ${opponent.name}` : `Brooks @ ${opponent.name}`}</h2>
    <p><CalendarDays size={16}/> {formatDate(next.date)} svensk tid · {next.arena}</p>
    <div className="countdown">
      <div><strong>{c.days}</strong><span>dagar</span></div>
      <div><strong>{c.hours}</strong><span>tim</span></div>
      <div><strong>{c.minutes}</strong><span>min</span></div>
      <div><strong>{c.seconds}</strong><span>sek</span></div>
    </div>
    <div className="hero-actions"><button>Inför match</button><button className="light">Scoutkort</button></div>
  </div>
}

function MatchTile({ game }) {
  const t = teams[game.opponent]
  return <article className="match-tile">
    <div className="tile-top">
      <span className={game.type === 'Hemma' ? 'tag home' : 'tag away'}>{game.type}</span>
      <span className="tag">Scout: {game.scout}</span>
    </div>
    <div className="tile-main">
      <TeamLogo team="Brooks" />
      <ChevronRight />
      <TeamLogo team={game.opponent} />
    </div>
    <h3>{game.type === 'Hemma' ? `Brooks vs ${t.name}` : `Brooks @ ${t.name}`}</h3>
    <p>{formatDate(game.date)}</p>
    <p>{game.arena}</p>
    <div className="tile-actions"><a>Inför</a><a>Live</a><a>Efter</a></div>
  </article>
}

function PlayerProfile() {
  return <div className="player-layout">
    <div className="player-card glass">
      <div className="avatar">MÅ</div>
      <div>
        <span className="kicker">Spelarprofil</span>
        <h2>Måns Ågren</h2>
        <p>Back · Left · 2006 · Brooks Bandits</p>
        <div className="chips">
          <span>185 cm</span><span>93 kg</span><span>Shutdown D</span><span>Boxplay</span><span>Förstapass</span>
        </div>
      </div>
    </div>
    <div className="player-metrics">
      <Metric icon={<Activity />} label="Matcher" value="0" sub="Säsong startar snart"/>
      <Metric icon={<Star />} label="Poäng" value="0" sub="0+0"/>
      <Metric icon={<Gauge />} label="+/-" value="0" sub="fylls efter match"/>
      <Metric icon={<Video />} label="Highlights" value="0" sub="videoarkiv"/>
    </div>
  </div>
}

function StandingsTable() {
  return <div className="table-card">
    <table>
      <thead><tr><th>Lag</th><th>GP</th><th>W</th><th>L</th><th>OT</th><th>P</th></tr></thead>
      <tbody>
        {standings.map(row => <tr key={row[0]} className={row[0].includes('Brooks') ? 'highlight' : ''}>
          <td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td><td>{row[5]}</td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

function ScoutCenter() {
  return <div className="scout-panel">
    {scoutRows.map(([label, score, note]) => <div className="scout-row" key={label}>
      <div className="scout-label"><ShieldCheck size={18}/><div><strong>{label}</strong><small>{note}</small></div></div>
      <div className="bar"><span style={{ width: `${score}%` }} /></div>
      <b>{score}</b>
    </div>)}
  </div>
}

function TravelCenter() {
  return <div className="travel-list">
    {travelOptions.map(f => <article className="travel-option" key={f.airline}>
      <div className="airline"><Plane/><strong>{f.airline}</strong></div>
      <h3>{f.route}</h3>
      <p>{f.duration} · bevakar priser och resväg</p>
      <div className="chips">{f.tags.map(t => <span key={t}>{t}</span>)}</div>
      <button>Aktivera bevakning</button>
    </article>)}
  </div>
}

function MediaCenter() {
  const items = [
    ['Måns Ågren', 'Personlig mediabevakning', 'Media Watch'],
    ['Brooks Bandits', 'Nyheter från klubben', 'Team'],
    ['BCHL', 'Liga, schema och resultat', 'League'],
    ['EliteProspects', 'Statistik och profil', 'Stats']
  ]
  return <div className="media-grid">
    {items.map(([title, desc, tag]) => <article className="media-item" key={title}>
      <span>{tag}</span><h3>{title}</h3><p>{desc}</p><button>Öppna flöde</button>
    </article>)}
  </div>
}

function FamilyPortal() {
  return <div className="doc-grid">
    {docs.map(([name, desc]) => <article className="doc-card" key={name}>
      <FileText /><div><strong>{name}</strong><span>{desc}</span></div>
    </article>)}
  </div>
}

function AdminCenter() {
  const tasks = [
    ['Importera schema', 'CSV/ICS eller manuell import', UploadCloud],
    ['Lägg matchrapport', 'Inför/efter match', ClipboardList],
    ['Uppdatera scoutlogg', 'Betyg och anteckningar', Target],
    ['Lägg resor', 'Flyg, hotell och bil', Luggage],
    ['AI-assistent', 'Frågor om matcher, resor och media', Bot]
  ]
  return <div className="admin-grid">
    {tasks.map(([title, desc, Icon]) => <article className="admin-card" key={title}>
      <Icon/><h3>{title}</h3><p>{desc}</p>
    </article>)}
  </div>
}

function App() {
  const brooksTime = new Intl.DateTimeFormat('sv-SE', { hour:'2-digit', minute:'2-digit', timeZone:'America/Edmonton' }).format(new Date())
  return <main>
    <TopNav />
    <section id="dashboard" className="hero">
      <div className="hero-copy">
        <span className="kicker">MansHockey 5.0</span>
        <h1>En riktig hockeyplattform för Måns BCHL-säsong.</h1>
        <p>Matchcenter, statistik, resor, media, scoutlogg, dokument och familjeplanering samlat på manshockey.com.</p>
        <div className="hero-links"><a href="#matchcenter">Öppna matchcenter</a><a href="#player">Måns profil</a></div>
      </div>
      <NextGame />
    </section>

    <section className="quick-grid">
      <Metric icon={<Trophy />} label="Säsong" value="55 matcher" sub="28 hemma · 27 borta"/>
      <Metric icon={<Clock />} label="Brooks-tid" value={brooksTime} sub="America/Edmonton"/>
      <Metric icon={<CloudSun />} label="Väder" value="API redo" sub="Brooks live-väder"/>
      <Metric icon={<Plane />} label="Flyg" value="ARN → YYC" sub="Air Canada · KLM · Finnair"/>
      <Metric icon={<Newspaper />} label="Media" value="4 flöden" sub="Måns · Brooks · BCHL"/>
      <Metric icon={<Bell />} label="Notiser" value="Planerade" sub="match, media, flyg"/>
    </section>

    <Section id="matchcenter" kicker="Game Center" title="Matchcenter 5.0" action="Importera fler matcher">
      <div className="match-grid">{schedule.map(g => <MatchTile key={g.id} game={g} />)}</div>
    </Section>

    <Section id="player" kicker="Player Hub" title="Måns profil och statistik">
      <PlayerProfile />
    </Section>

    <section className="two-col">
      <Section id="standings" kicker="BCHL" title="Tabell">
        <StandingsTable />
      </Section>
      <Section id="scout" kicker="Scout Center" title="Scoutlogg">
        <ScoutCenter />
      </Section>
    </section>

    <Section id="travel" kicker="Travel Center" title="Resor Stockholm–Calgary">
      <TravelCenter />
    </Section>

    <Section id="media" kicker="Media Center" title="Nyheter och bevakning">
      <MediaCenter />
    </Section>

    <Section id="family" kicker="Family Portal" title="Dokument, kalender och planering">
      <FamilyPortal />
    </Section>

    <Section id="admin" kicker="Control Center" title="Admin och AI">
      <AdminCenter />
    </Section>

    <footer><span>Måns Hockey · manshockey.com</span><span>Version 5.0</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
