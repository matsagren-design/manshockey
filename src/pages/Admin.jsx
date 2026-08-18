import React,{useEffect,useState}from'react';
import{CalendarPlus,Database,Folder,KeyRound,RefreshCw,ShieldCheck}from'lucide-react';
import{Page}from'../components/Layout.jsx';
import{LoginPage}from'./Login.jsx';

export function Admin({user,onLogin,health}){
  const[preview,setPreview]=useState(null);
  const[message,setMessage]=useState('');
  const[loading,setLoading]=useState(false);
  useEffect(()=>{fetch('/api/schedule-import').then(r=>r.json()).then(setPreview).catch(()=>{})},[]);
  if(!user)return <LoginPage onLogin={onLogin}/>;
  async function importSchedule(){
    setLoading(true);setMessage('');
    try{
      const r=await fetch('/api/schedule-import',{method:'POST'});
      const d=await r.json();
      if(d.ok)setMessage(`Klart: ${d.created} nya, ${d.updated} uppdaterade, ${d.failed} fel. Totalt ${d.total} kända matcher.`);
      else setMessage(d.error||'Importen misslyckades.');
    }catch(e){setMessage(String(e))}
    finally{setLoading(false)}
  }
  return <Page kicker="Admin CMS" title="Kontrollpanel">
    {message&&<div className="notice">{message}</div>}
    <div className="grid">
      <article className="tile"><KeyRound/><h3>Inloggad</h3><p>{user.name||user.email} · {user.role}</p></article>
      <article className="tile"><Database/><h3>D1</h3><p>Status: {health?.d1?'aktiv':'ej kopplad'}.</p></article>
      <article className="tile"><Folder/><h3>R2</h3><p>Status: {health?.r2?'aktiv':'ej kopplad'}.</p></article>
      <article className="tile"><ShieldCheck/><h3>Säkerhet</h3><p>Admin krävs för schemaimport.</p></article>
      <article className="tile schedule-import-card">
        <CalendarPlus/>
        <h3>Brooks 2026/27</h3>
        <p>{preview?.known_games??55} kända matcher: {preview?.preseason_games??3} försäsong + {preview?.regular_games_currently_known??52} grundserie.</p>
        <p><small>Två BCHL Showcase-matcher läggs till när de finns i uppdaterad schemakälla.</small></p>
        <button onClick={importSchedule} disabled={loading}>{loading?<RefreshCw size={16}/>:<CalendarPlus size={16}/>} {loading?'Importerar…':'Importera / uppdatera schema'}</button>
      </article>
    </div>
  </Page>
}
