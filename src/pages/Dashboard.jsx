import React, { useEffect, useState } from 'react';
import { BookOpen, Bot, CalendarDays, Clock, Database, Folder, Newspaper, Plane, Target } from 'lucide-react';
import { Page, Card } from '../components/Layout.jsx';
import { formatDate } from '../lib/api.js';

function useCountdown(date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(date) - now);
  return { days: Math.floor(diff/86400000), hours: Math.floor(diff/3600000%24), minutes: Math.floor(diff/60000%60) };
}

export function Dashboard({ matches, scout, media, travel, documents, health, setActive }) {
  const next = matches[0];
  const c = useCountdown(next?.game_date);
  const brooksTime = new Intl.DateTimeFormat('sv-SE', { hour:'2-digit', minute:'2-digit', timeZone:'America/Edmonton' }).format(new Date());

  return <Page kicker="MansHockey Cloud" title="Datadriven hockeyplattform">
    <div className="livegrid">
      <div className="intro">
        <p>Innehåll ska nu hanteras via admin och API, inte genom nya ZIP-versioner. D1/R2 är förberett och kan kopplas i Cloudflare.</p>
        <div className="actions"><button onClick={() => setActive('admin')}>Öppna Admin</button><button onClick={() => setActive('matches')}>Matcharkiv</button></div>
      </div>
      <div className="next">
        <div className="pill">Nästa match</div>
        <h2>Brooks {next?.home_away === 'Hemma' ? 'vs' : '@'} {next?.opponent}</h2>
        <p><CalendarDays size={16}/> {formatDate(next?.game_date)} · {next?.arena}</p>
        <div className="count"><div><b>{c.days}</b><span>dagar</span></div><div><b>{c.hours}</b><span>tim</span></div><div><b>{c.minutes}</b><span>min</span></div></div>
      </div>
    </div>
    <div className="metrics">
      <Card icon={<Database/>} label="Databas" value={health?.d1 ? 'D1 aktiv' : 'Fallback'} sub="Cloudflare D1"/>
      <Card icon={<Folder/>} label="Filer" value={health?.r2 ? 'R2 aktiv' : 'R2 redo'} sub="bilder/video/PDF"/>
      <Card icon={<Clock/>} label="Brooks" value={brooksTime} sub="lokal tid"/>
      <Card icon={<BookOpen/>} label="Matcher" value={matches.length} sub="D1/API" onClick={() => setActive('matches')}/>
      <Card icon={<Target/>} label="Scout" value={scout.length} sub="rapporter" onClick={() => setActive('scout')}/>
      <Card icon={<Newspaper/>} label="Media" value={media.length} sub="flöde" onClick={() => setActive('media')}/>
      <Card icon={<Plane/>} label="Resor" value={travel.length} sub="bevakning" onClick={() => setActive('travel')}/>
      <Card icon={<Bot/>} label="AI Coach" value="Redo" sub="D1-context" onClick={() => setActive('ai')}/>
    </div>
  </Page>
}
