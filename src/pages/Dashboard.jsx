import React, { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock, Database, Newspaper, Plane, Target, Video } from 'lucide-react';
import { Page, StatCard } from '../components/Layout.jsx';
import { formatDate } from '../lib/api.js';

function useCountdown(date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(date) - now);
  return { days: Math.floor(diff/86400000), hours: Math.floor(diff/3600000%24), minutes: Math.floor(diff/60000%60) };
}

export function Dashboard({ matches, scout, media, travel, health, setActive, setSelectedMatchId }) {
  const next = matches[0];
  const c = useCountdown(next?.game_date);
  const brooksTime = new Intl.DateTimeFormat('sv-SE', { hour:'2-digit', minute:'2-digit', timeZone:'America/Edmonton' }).format(new Date());

  function openMatch() {
    if (next?.id) setSelectedMatchId(next.id);
    setActive('matchcenter');
  }

  return <Page kicker="Enterprise 13" title="MansHockey Matchcenter">
    <div className="hero">
      <div>
        <span className="pill">Nästa match</span>
        <h2>Brooks {next?.home_away === 'Hemma' ? 'vs' : '@'} {next?.opponent}</h2>
        <p><CalendarDays size={16}/> {formatDate(next?.game_date)} · {next?.arena}</p>
        <div className="count"><div><b>{c.days}</b><span>dagar</span></div><div><b>{c.hours}</b><span>tim</span></div><div><b>{c.minutes}</b><span>min</span></div></div>
      </div>
      <div className="quick-actions">
        <button onClick={openMatch}>Öppna Matchcenter</button>
        <button onClick={() => setActive('matches')}>Alla matcher</button>
      </div>
    </div>
    <div className="metrics">
      <StatCard icon={<Database/>} label="D1" value={health?.d1 ? 'Aktiv' : 'Fallback'} sub="databas"/>
      <StatCard icon={<Clock/>} label="Brooks" value={brooksTime} sub="lokal tid"/>
      <StatCard icon={<BookOpen/>} label="Matcher" value={matches.length} sub="poster" onClick={() => setActive('matches')}/>
      <StatCard icon={<Target/>} label="Scout" value={scout.length} sub="rapporter" onClick={() => setActive('scout')}/>
      <StatCard icon={<Newspaper/>} label="Media" value={media.length} sub="flöde" onClick={() => setActive('media')}/>
      <StatCard icon={<Plane/>} label="Resor" value={travel.length} sub="bevakning" onClick={() => setActive('travel')}/>
      <StatCard icon={<Video/>} label="Matchcenter" value="Live" sub="ny modul" onClick={openMatch}/>
    </div>
  </Page>
}
