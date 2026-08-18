import React,{useEffect,useState}from'react';
import{CalendarPlus,Database,Folder,KeyRound,RefreshCw,ShieldCheck,Radio}from'lucide-react';
import{Page}from'../components/Layout.jsx';
import{LoginPage}from'./Login.jsx';

export function Admin({user,onLogin,health}){
  const[preview,setPreview]=useState(null);
  const[syncInfo,setSyncInfo]=useState(null);
  const[message,setMessage]=useState('');
  const[loading,setLoading]=useState(false);
  const[syncing,setSyncing]=useState(false);

  function loadStatus(){
    fetch('/api/schedule-import').then(r=>r.json()).then(setPreview).catch(()=>{});
    fetch('/api/bchl-auto-sync').then(r=>r.json()).then(setSyncInfo).catch(()=>{});
  }

  useEffect(()=>{loadStatus()},[]);

  if(!user)return <LoginPage onLogin={onLogin}/>;

  async function importSchedule(){
    setLoading(true);setMessage('');
    try{
      const r=await fetch('/api/schedule-import',{method:'POST'});
      const d=await r.json();
      if(d.ok)setMessage(`Schema: ${d.created} nya, ${d.updated} uppdaterade, ${d.failed} fel.`);
      else setMessage(d.error||'Importen misslyckades.');
    }catch(e){setMessage(String(e))}
    finally{setLoading(false);loadStatus()}
  }

  async function syncBchl(){
    setSyncing(true);setMessage('');
    try{
      const r=await fetch('/api/bchl-auto-sync',{method:'POST'});
      const d=await r.json();
      if(d.ok)setMessage(`BCHL: ${d.games_found} rader hittade, ${d.games_matched} matchade, ${d.games_updated} uppdaterade.`);
      else if(d.safe_abort)setMessage(`Säkerhetsstopp: ${d.error}`);
      else setMessage(d.error||'BCHL-synken misslyckades.');
    }catch(e){setMessage(String(e))}
    finally{setSyncing(false);loadStatus()}
  }

  const last=syncInfo?.runs?.[0];

  return <Page kicker="Admin CMS" title="Kontrollpanel">
    {message&&<div className="notice">{message}</div>}
    <div className="grid">
      <article className="tile"><KeyRound/><h3>Inloggad</h3><p>{user.name||user.email} · {user.role}</p></article>
      <article className="tile"><Database/><h3>D1</h3><p>Status: {health?.d1?'aktiv':'ej kopplad'}.</p></article>
      <article className="tile"><Folder/><h3>R2</h3><p>Status: {health?.r2?'aktiv':'ej kopplad'}.</p></article>
      <article className="tile"><ShieldCheck/><h3>Säkerhet</h3><p>Admin krävs för manuella synkar.</p></article>

      <article className="tile">
        <CalendarPlus/>
        <h3>Brooks 2026/27</h3>
        <p>{preview?.known_games??55} kända matcher: {preview?.preseason_games??3} försäsong + {preview?.regular_games_currently_known??52} grundserie.</p>
        <button onClick={importSchedule} disabled={loading}>
          {loading?<RefreshCw size={16}/>:<CalendarPlus size={16}/>}
          {loading?'Importerar…':'Importera / uppdatera schema'}
        </button>
      </article>

      <article className="tile">
        <Radio/>
        <h3>BCHL Auto Matchdata</h3>
        <p>Officiell BCHL-källa. Uppdaterar bara resultat och matchstatus när matchningen är säker.</p>
        <p><small>Senaste: {last ? `${last.status} · ${last.games_updated||0} uppdaterade` : 'Ingen synk ännu'}</small></p>
        <button onClick={syncBchl} disabled={syncing}>
          <RefreshCw size={16}/>
          {syncing?'Synkar…':'Synka BCHL nu'}
        </button>
      </article>
    </div>
  </Page>
}
