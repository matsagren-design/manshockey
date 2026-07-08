import React, { useState } from 'react';
import { ExternalLink, Plus, Save } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { formatDate, saveItem } from '../lib/api.js';

export function DataPage({ type, title, kicker, items, setItems, isAdmin }) {
  const empty = {
    matches: { opponent:'', game_date:'', home_away:'Hemma', arena:'', city:'', tv_link:'', result:'', report_before:'', report_after:'' },
    scout: { match_id:'', category:'', score:80, note:'' },
    media: { title:'', source:'', url:'', tag:'', summary:'', published_at:'' },
    travel: { origin:'ARN', destination:'YYC', airline:'', max_price_sek:10000, depart_after:'09:30', avoid_usa:1, note:'' },
    documents: { title:'', category:'', note:'', file_key:'', url:'' }
  }[type];

  const [form, setForm] = useState(empty);
  const fields = Object.keys(empty);

  async function submit(e) {
    e.preventDefault();
    const item = { id: Date.now(), ...form };
    setItems(prev => [item, ...prev]);
    await saveItem(type, form);
    setForm(empty);
  }

  return <Page kicker={kicker} title={title} action={isAdmin ? <button onClick={() => document.getElementById(type+'-form')?.scrollIntoView()}><Plus size={16}/> Ny</button> : null}>
    <div className="grid">
      {items.map((item, idx) => <article className="tile" key={item.id || idx}>
        <span className="tag">{item.home_away || item.tag || item.category || item.airline || 'Item'}</span>
        <h3>{item.opponent || item.category || item.title || item.airline || 'Post'}</h3>
        {item.game_date && <p>{formatDate(item.game_date)}</p>}
        {item.arena && <p>{item.arena}</p>}
        {item.note && <p>{item.note}</p>}
        {item.summary && <p>{item.summary}</p>}
        {item.report_before && <div className="report"><b>Inför</b><p>{item.report_before}</p></div>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Öppna</a>}
      </article>)}
    </div>
    {isAdmin && <form id={type+'-form'} className="admin-form inline-form" onSubmit={submit}>
      <h2>Ny post</h2>
      {fields.map(field => <label key={field}>{field}<input value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}/></label>)}
      <button type="submit"><Save size={16}/> Spara</button>
    </form>}
  </Page>
}
