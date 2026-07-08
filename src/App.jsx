import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout.jsx';
import { Live } from './pages/Live.jsx';
import { Matches } from './pages/Matches.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { AICoach } from './pages/AICoach.jsx';
import { Media } from './pages/Media.jsx';
import { Travel } from './pages/Travel.jsx';
import { Files } from './pages/Files.jsx';
import { Admin } from './pages/Admin.jsx';
import { getJson } from './lib/api.js';
import { seedMatches } from './data/seed.js';
import './styles.css';

function App() {
  const [active, setActive] = useState('live');
  const [isAdmin, setIsAdmin] = useState(false);
  const [health, setHealth] = useState({});
  const [matches, setMatches] = useState(seedMatches);
  const [analytics, setAnalytics] = useState(null);
  const [media, setMedia] = useState([]);
  const [travel, setTravel] = useState([]);

  useEffect(() => {
    getJson('/api/health', {}).then(setHealth);
    getJson('/api/matches', { matches: seedMatches }).then(data => setMatches(data.matches || seedMatches));
    getJson('/api/analytics', {}).then(setAnalytics);
    getJson('/api/media', { media: [] }).then(data => setMedia(data.media || []));
    getJson('/api/travel', { travel: [] }).then(data => setTravel(data.travel || []));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }, []);

  const pages = {
    live: <Live matches={matches} health={health} media={media} travel={travel} setActive={setActive}/>,
    matches: <Matches matches={matches}/>,
    analytics: <Analytics analytics={analytics}/>,
    ai: <AICoach/>,
    media: <Media media={media}/>,
    travel: <Travel travel={travel}/>,
    files: <Files/>,
    admin: <Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>
  };

  return (
    <Layout active={active} setActive={setActive} isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      {pages[active]}
    </Layout>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
