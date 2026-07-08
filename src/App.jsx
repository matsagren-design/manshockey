import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { DataPage } from './pages/DataPage.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { AICoach } from './pages/AICoach.jsx';
import { Admin } from './pages/Admin.jsx';
import { getItems, getJson } from './lib/api.js';
import './styles.css';

function App() {
  const [active, setActive] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [health, setHealth] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [matches, setMatches] = useState([]);
  const [scout, setScout] = useState([]);
  const [media, setMedia] = useState([]);
  const [travel, setTravel] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    getJson('/api/health', {}).then(setHealth);
    getJson('/api/analytics', {}).then(setAnalytics);
    getItems('matches', []).then(setMatches);
    getItems('scout', []).then(setScout);
    getItems('media', []).then(setMedia);
    getItems('travel', []).then(setTravel);
    getItems('documents', []).then(setDocuments);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }, []);

  const pages = {
    dashboard: <Dashboard matches={matches} scout={scout} media={media} travel={travel} documents={documents} health={health} setActive={setActive}/>,
    matches: <DataPage type="matches" kicker="Match CMS" title="Matcher och matchrapporter" items={matches} setItems={setMatches} isAdmin={isAdmin}/>,
    scout: <DataPage type="scout" kicker="Scout CMS" title="Scoutlogg" items={scout} setItems={setScout} isAdmin={isAdmin}/>,
    analytics: <Analytics analytics={analytics}/>,
    ai: <AICoach/>,
    media: <DataPage type="media" kicker="Media CMS" title="Media och nyheter" items={media} setItems={setMedia} isAdmin={isAdmin}/>,
    travel: <DataPage type="travel" kicker="Travel CMS" title="Resor och bevakningar" items={travel} setItems={setTravel} isAdmin={isAdmin}/>,
    documents: <DataPage type="documents" kicker="Document CMS" title="Dokument och filer" items={documents} setItems={setDocuments} isAdmin={isAdmin}/>,
    admin: <Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin} health={health}/>
  };

  return <Layout active={active} setActive={setActive} isAdmin={isAdmin} setIsAdmin={setIsAdmin}>{pages[active]}</Layout>
}

createRoot(document.getElementById('root')).render(<App/>);
