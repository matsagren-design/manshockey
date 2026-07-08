import React from 'react';
import { BarChart3, BookOpen, Bot, CalendarDays, FileText, Home, KeyRound, LogOut, Newspaper, Plane, Settings, Target, Users } from 'lucide-react';

export const tabs = [
  ['dashboard','Dashboard',Home],
  ['matches','Matcher',BookOpen],
  ['matchcenter','Matchcenter',CalendarDays],
  ['media','Media',Newspaper],
  ['scout','Scout',Target],
  ['travel','Resor',Plane],
  ['documents','Dokument',FileText],
  ['analytics','Analytics',BarChart3],
  ['ai','AI Coach',Bot],
  ['admin','Admin',Settings]
];

export function Layout({ active, setActive, user, onLogout, children }) {
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand" onClick={() => setActive('dashboard')}>
        <div className="mark">M12</div>
        <div><strong>MansHockey</strong><span>Matchcenter</span></div>
      </div>
      <nav>{tabs.map(([id,label,Icon]) => <button key={id} className={active===id?'active':''} onClick={() => setActive(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-user">
        {user ? <><span>{user.name || user.email}</span><button onClick={onLogout}><LogOut size={16}/> Logga ut</button></> : <button onClick={() => setActive('admin')}><KeyRound size={16}/> Logga in</button>}
      </div>
    </aside>
    <main className="content">{children}<footer><span>MansHockey 12 · manshockey.com</span><span>Matchcenter</span></footer></main>
  </div>
}

export function Page({ kicker, title, children, action }) {
  return <section className="page"><div className="head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section>
}
export function StatCard({ icon, label, value, sub, onClick }) {
  return <button className="stat-card" onClick={onClick}><div className="icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div></button>
}
