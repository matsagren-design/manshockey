import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { DataPage } from './pages/DataPage.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { AICoach } from './pages/AICoach.jsx';
import { Admin } from './pages/Admin.jsx';
import { Placeholder } from './pages/Placeholder.jsx';
import { getItems, getJson, logout, me } from './lib/api.js';
import './styles.css';

function App() {
  const [active,setActive]=useState('dashboard');
  const [user,setUser]=useState(null);
  const [health,setHealth]=useState({});
  const [analytics,setAnalytics]=useState({});
  const [matches,setMatches]=useState([]);
  const [scout,setScout]=useState([]);
  const [media,setMedia]=useState([]);
  const [travel,setTravel]=useState([]);
  const [documents,setDocuments]=useState([]);

  async function loadAll(){
    getJson('/api/health',{}).then(setHealth);
    getJson('/api/analytics',{}).then(setAnalytics);
    getItems('matches',[]).then(setMatches);
    getItems('scout',[]).then(setScout);
    getItems('media',[]).then(setMedia);
    getItems('travel',[]).then(setTravel);
    getItems('documents',[]).then(setDocuments);
  }
  useEffect(()=>{loadAll();me().then(r=>setUser(r.user||null));if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{})},[]);
  async function handleLogout(){await logout();setUser(null);setActive('dashboard')}

  const pages={
    dashboard:<Dashboard matches={matches} scout={scout} media={media} travel={travel} documents={documents} health={health} user={user} setActive={setActive}/>,
    matches:<DataPage type="matches" kicker="Match CMS" title="Matcher" items={matches} setItems={setMatches} user={user} reload={loadAll}/>,
    media:<DataPage type="media" kicker="Media CMS" title="Media" items={media} setItems={setMedia} user={user} reload={loadAll}/>,
    scout:<DataPage type="scout" kicker="Scout CMS" title="Scout" items={scout} setItems={setScout} user={user} reload={loadAll}/>,
    travel:<DataPage type="travel" kicker="Travel CMS" title="Resor" items={travel} setItems={setTravel} user={user} reload={loadAll}/>,
    documents:<DataPage type="documents" kicker="Document CMS" title="Dokument" items={documents} setItems={setDocuments} user={user} reload={loadAll}/>,
    calendar:<Placeholder kicker="Kalender" title="Familjekalender"><p>Kalendervyn är förberedd. Nästa steg är ICS-import, Google Calendar eller intern kalender i D1.</p></Placeholder>,
    users:<Placeholder kicker="Användare" title="Användare och roller"><p>Roller är förberedda: Admin, Familj och Gäst. Nästa steg är användar-CMS och säkrare lösenord.</p></Placeholder>,
    analytics:<Analytics analytics={analytics}/>,
    ai:<AICoach/>,
    admin:<Admin user={user} onLogin={setUser} health={health}/>
  };

  return <Layout active={active} setActive={setActive} user={user} onLogout={handleLogout}>{pages[active]}</Layout>
}
createRoot(document.getElementById('root')).render(<App/>);
