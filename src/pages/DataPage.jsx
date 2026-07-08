import React, { useState } from 'react';
import { Edit3, ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { createItem, deleteItem, formatDate, updateItem } from '../lib/api.js';

const configs = {
  matches: { empty:{opponent:'',game_date:'',home_away:'Hemma',arena:'',city:'',tv_link:'',map_url:'',weather_note:'',result:'',brooks_goals:'',opponent_goals:'',report_before:'',report_after:'',ai_summary:''}, titleField:'opponent', tagField:'home_away' },
  scout: { empty:{match_id:'',category:'',score:80,note:'',ai_comment:''}, titleField:'category', tagField:'score' },
  media: { empty:{match_id:'',title:'',source:'',url:'',tag:'',summary:'',media_type:'link',published_at:''}, titleField:'title', tagField:'tag' },
  travel: { empty:{match_id:'',origin:'ARN',destination:'YYC',airline:'',max_price_sek:10000,depart_after:'09:30',avoid_usa:1,note:'',status:'Bevakas'}, titleField:'airline', tagField:'status' },
  documents: { empty:{match_id:'',title:'',category:'',note:'',file_key:'',url:'',status:'Aktiv'}, titleField:'title', tagField:'category' }
};

export function DataPage({ type, title, kicker, items, setItems, user, reload, setActive, setSelectedMatchId }) {
  const isAdmin = Boolean(user?.role === 'admin');
  const config = configs[type];
  const [form, setForm] = useState(config.empty);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const fields = Object.keys(config.empty);

  function startCreate(){setEditing(null);setForm(config.empty);setTimeout(()=>document.getElementById(type+'-form')?.scrollIntoView({behavior:'smooth'}),50)}
  function startEdit(item){setEditing(item.id);setForm({...config.empty,...item});setTimeout(()=>document.getElementById(type+'-form')?.scrollIntoView({behavior:'smooth'}),50)}
  function openMatch(item){ if(type === 'matches'){ setSelectedMatchId?.(item.id); setActive?.('matchcenter'); } }
  async function submit(e){
    e.preventDefault();
    if(!isAdmin){setMessage('Logga in som admin först.');return}
    if(editing){const updated={...form,id:editing};setItems(prev=>prev.map(x=>x.id===editing?updated:x));const res=await updateItem(type,updated);setMessage(res.ok?'Uppdaterad i D1.':res.error||'Fel vid uppdatering.')}
    else{const temp={id:Date.now(),...form};setItems(prev=>[temp,...prev]);const res=await createItem(type,form);setMessage(res.ok?'Sparad i D1.':res.error||'Fel vid sparning.')}
    setEditing(null);setForm(config.empty);setTimeout(()=>reload?.(),700)
  }
  async function remove(item){
    if(!confirm('Ta bort posten?')) return;
    setItems(prev=>prev.filter(x=>x.id!==item.id));
    const res=await deleteItem(type,item.id);
    setMessage(res.ok?'Borttagen från D1.':res.error||'Fel vid borttagning.');
  }

  return <Page kicker={kicker} title={title} action={isAdmin ? <button onClick={startCreate}><Plus size={16}/> Ny</button> : null}>
    {message && <div className="notice">{message}</div>}
    <div className="cms-grid">
      <div className="table-card">
        <table>
          <thead><tr><th>Titel</th><th>Typ</th><th>Datum/Info</th><th></th></tr></thead>
          <tbody>{items.map((item,idx)=><tr key={item.id||idx}>
            <td><button className="link-button" onClick={()=>openMatch(item)}><strong>{item[config.titleField] || 'Post'}</strong></button><small>{item.summary || item.note || item.arena || item.url}</small></td>
            <td><span className="tag">{item[config.tagField] || 'Post'}</span></td>
            <td>{item.game_date ? formatDate(item.game_date) : (item.status || item.source || item.airline || '—')}</td>
            <td>{isAdmin && <div className="row-actions compact"><button onClick={()=>startEdit(item)}><Edit3 size={15}/></button><button className="danger" onClick={()=>remove(item)}><Trash2 size={15}/></button></div>}{item.url && <a href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {isAdmin && <form id={type+'-form'} className="admin-form" onSubmit={submit}>
        <div className="form-head"><h2>{editing?'Redigera':'Ny post'}</h2>{editing&&<button type="button" className="ghost" onClick={()=>{setEditing(null);setForm(config.empty)}}><X size={16}/> Avbryt</button>}</div>
        {fields.map(field=><label key={field}>{field}<input value={form[field] ?? ''} onChange={e=>setForm({...form,[field]:e.target.value})}/></label>)}
        <button type="submit"><Save size={16}/> {editing?'Uppdatera':'Spara'}</button>
      </form>}
    </div>
  </Page>
}
