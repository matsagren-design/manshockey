import React, { useEffect, useState } from 'react';
import { BookOpen, Bot, CalendarDays, Clock, Database, Newspaper, Plane } from 'lucide-react';
import { Page, Card } from '../components/Layout.jsx';
import { formatDate } from '../lib/api.js';

function useCountdown(date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diff = Math.max(0, new Date(date) - now);
  return { days: Math.floor(diff/86400000), hours: Math.floor(diff/3600000%24), minutes: Math.floor(diff/60000%60) };
}

export function Live({ matches, health, media, travel, setActive }) {
  const next = matches[0];
  const countdown = useCountdown(next?.game_date);
  const brooksTime = new Intl.DateTimeFormat('sv-SE', { hour:'2-digit', minute:'2-digit', timeZone:'America/Edmonton' }).format(new Date());

  return (
    <Page kicker="MansHockey" title="Live dashboard">
      <div className="livegrid">
        <div className="intro">
          <p>Strukturerad kodbas med separata komponenter, API-lager, Cloudflare Functions, D1/R2-förberedelse och arbetsflöde för funktionsutveckling.</p>
          <div className="actions">
            <button onClick={() => setActive('matches')}>Matcharkiv</button>
            <button onClick={() => setActive('admin')}>Admin</button>
          </div>
        </div>
        <div className="next">
          <div className="pill">Nästa match</div>
          <h2>Brooks {next?.home_away === 'Hemma' ? 'vs' : '@'} {next?.opponent}</h2>
          <p><CalendarDays size={16}/> {formatDate(next?.game_date)} · {next?.arena}</p>
          <div className="count">
            <div><b>{countdown.days}</b><span>dagar</span></div>
            <div><b>{countdown.hours}</b><span>tim</span></div>
            <div><b>{countdown.minutes}</b><span>min</span></div>
          </div>
        </div>
      </div>
      <div className="metrics">
        <Card icon={<Database/>} label="Backend" value={health?.d1 ? 'D1' : 'Fallback'} sub={health?.r2 ? 'R2 aktiv' : 'R2 redo'} />
        <Card icon={<Clock/>} label="Brooks" value={brooksTime} sub="lokal tid" />
        <Card icon={<BookOpen/>} label="Matcher" value={matches.length} sub="arkiv" onClick={() => setActive('matches')} />
        <Card icon={<Newspaper/>} label="Media" value={media.length} sub="flöden" onClick={() => setActive('media')} />
        <Card icon={<Plane/>} label="Resor" value={travel.length} sub="bevakningar" onClick={() => setActive('travel')} />
        <Card icon={<Bot/>} label="AI Coach" value="Redo" sub="Worker" onClick={() => setActive('ai')} />
      </div>
    </Page>
  );
}
