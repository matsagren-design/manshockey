import React,{useMemo,useState}from'react';
import{Activity,Plus,Save,Trash2,Trophy}from'lucide-react';
import{Page}from'../components/Layout.jsx';
import{createItem,deleteItem,formatDate,isSameMatch,updateItem}from'../lib/api.js';

export function GameCenter({matches,gameEvents,playerStats,selectedMatchId,setSelectedMatchId,user,reload}) {
  const selected=useMemo(()=>matches.find(m=>String(m.id)===String(selectedMatchId))||matches[0],[matches,selectedMatchId]);
  const events=gameEvents.filter(e=>isSameMatch(e,selected?.id));
  const stats=playerStats.find(s=>isSameMatch(s,selected?.id)) || {};
  const [draft,setDraft]=useState(selected||{});
  const [eventForm,setEventForm]=useState({match_id:selected?.id||'',period:'1',game_time:'00:00',event_type:'Notering',team:'Brooks',player:'Måns',note:''});
  const [statForm,setStatForm]=useState({match_id:selected?.id||'',goals:0,assists:0,points:0,plus_minus:0,pim:0,shots:0,toi:'',hits:0,blocks:0,note:''});
  const [message,setMessage]=useState('');
  React.useEffect(()=>{setDraft(selected||{});setEventForm(f=>({...f,match_id:selected?.id||''}));setStatForm({...statForm,...stats,match_id:selected?.id||''})},[selected?.id]);

  if(!selected)return <Page kicker="GameCenter" title="Ingen match"><p>Lägg till en match först.</p></Page>;
  const isAdmin=user?.role==='admin';

  async function saveMatch(){const res=await updateItem('matches',draft);setMessage(res.ok?'GameCenter sparat.':res.error||'Fel.');setTimeout(()=>reload?.(),700)}
  async function addEvent(e){e.preventDefault();const res=await createItem('game_events',eventForm);setMessage(res.ok?'Event sparad.':res.error||'Fel.');setEventForm({...eventForm,note:''});setTimeout(()=>reload?.(),700)}
  async function removeEvent(id){if(!confirm('Ta bort händelse?'))return;await deleteItem('game_events',id);reload?.()}
  async function saveStats(e){e.preventDefault();const resource='player_stats';const payload={...statForm,match_id:selected.id};const res=payload.id?await updateItem(resource,payload):await createItem(resource,payload);setMessage(res.ok?'Spelarstatistik sparad.':res.error||'Fel.');setTimeout(()=>reload?.(),700)}

  return <Page kicker="Live GameCenter" title={`Brooks ${selected.home_away==='Hemma'?'vs':'@'} ${selected.opponent}`} action={<select className="match-select" value={selected.id} onChange={e=>setSelectedMatchId(e.target.value)}>{matches.map(m=><option key={m.id} value={m.id}>{formatDate(m.game_date)} – {m.opponent}</option>)}</select>}>
    {message&&<div className="notice">{message}</div>}
    <div className="game-scoreboard">
      <div><span>Brooks</span><strong>{selected.brooks_goals ?? '-'}</strong><small>{selected.brooks_shots ?? '-'} skott</small></div>
      <div><span>{selected.period||'Ej startad'}</span><b>{selected.game_clock||'--:--'}</b><small>{selected.game_status||'Kommande'}</small></div>
      <div><span>{selected.opponent}</span><strong>{selected.opponent_goals ?? '-'}</strong><small>{selected.opponent_shots ?? '-'} skott</small></div>
    </div>

    <div className="game-layout">
      <section className="mc-section">
        <h2><Activity/> Matchhändelser</h2>
        <div className="timeline">
          {events.length?events.map(ev=><div className="event-row" key={ev.id}><b>{ev.period} · {ev.game_time}</b><span>{ev.event_type}</span><p>{ev.team} · {ev.player} — {ev.note}</p>{isAdmin&&<button className="danger" onClick={()=>removeEvent(ev.id)}><Trash2 size={14}/></button>}</div>):<p>Inga händelser ännu.</p>}
        </div>
        {isAdmin&&<form className="inline-form" onSubmit={addEvent}>
          <input placeholder="Period" value={eventForm.period} onChange={e=>setEventForm({...eventForm,period:e.target.value})}/>
          <input placeholder="Tid" value={eventForm.game_time} onChange={e=>setEventForm({...eventForm,game_time:e.target.value})}/>
          <input placeholder="Typ" value={eventForm.event_type} onChange={e=>setEventForm({...eventForm,event_type:e.target.value})}/>
          <input placeholder="Lag" value={eventForm.team} onChange={e=>setEventForm({...eventForm,team:e.target.value})}/>
          <input placeholder="Spelare" value={eventForm.player} onChange={e=>setEventForm({...eventForm,player:e.target.value})}/>
          <input placeholder="Notering" value={eventForm.note} onChange={e=>setEventForm({...eventForm,note:e.target.value})}/>
          <button><Plus size={16}/> Lägg till</button>
        </form>}
      </section>

      <aside className="match-side">
        {isAdmin&&<section className="mc-section">
          <h2><Save/> Liveuppdatering</h2>
          <label>Status<input value={draft.game_status||''} onChange={e=>setDraft({...draft,game_status:e.target.value})}/></label>
          <label>Period<input value={draft.period||''} onChange={e=>setDraft({...draft,period:e.target.value})}/></label>
          <label>Klocka<input value={draft.game_clock||''} onChange={e=>setDraft({...draft,game_clock:e.target.value})}/></label>
          <label>Brooks mål<input value={draft.brooks_goals||''} onChange={e=>setDraft({...draft,brooks_goals:e.target.value})}/></label>
          <label>Motståndare mål<input value={draft.opponent_goals||''} onChange={e=>setDraft({...draft,opponent_goals:e.target.value})}/></label>
          <label>Brooks skott<input value={draft.brooks_shots||''} onChange={e=>setDraft({...draft,brooks_shots:e.target.value})}/></label>
          <label>Motståndare skott<input value={draft.opponent_shots||''} onChange={e=>setDraft({...draft,opponent_shots:e.target.value})}/></label>
          <button onClick={saveMatch}><Save size={16}/> Spara live</button>
        </section>}
        <section className="mc-section">
          <h2><Trophy/> Måns statistik</h2>
          <div className="stat-line"><span>G</span><b>{stats.goals||0}</b><span>A</span><b>{stats.assists||0}</b><span>P</span><b>{stats.points||0}</b></div>
          <p>+/- {stats.plus_minus||0} · PIM {stats.pim||0} · Skott {stats.shots||0} · TOI {stats.toi||'—'}</p>
          {isAdmin&&<form className="inline-form" onSubmit={saveStats}>
            {['goals','assists','points','plus_minus','pim','shots','toi','hits','blocks','note'].map(f=><input key={f} placeholder={f} value={statForm[f]??''} onChange={e=>setStatForm({...statForm,[f]:e.target.value})}/>)}
            <button><Save size={16}/> Spara statistik</button>
          </form>}
        </section>
      </aside>
    </div>
  </Page>
}
