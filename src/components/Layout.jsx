import React from 'react';
import { Home, BookOpen, BarChart3, Bot, Newspaper, Plane, Folder, UploadCloud, KeyRound, LogOut, Target } from 'lucide-react';

export const tabs = [
  ['dashboard','Dashboard',Home],
  ['matches','Matcher',BookOpen],
  ['scout','Scout',Target],
  ['analytics','Analytics',BarChart3],
  ['ai','AI Coach',Bot],
  ['media','Media',Newspaper],
  ['travel','Resor',Plane],
  ['documents','Dokument',Folder],
  ['admin','Admin',UploadCloud]
];

export function Layout({ active, setActive, user, onLogout, children }) {
  return <main>
    <header className="top">
      <div className="brand" onClick={() => setActive('dashboard')}>
        <div className="mark">M10</div>
        <div><strong>MansHockey 10</strong><span>{user ? `${user.name || user.email} · ${user.role}` : 'secure CMS'}</span></div>
      </div>
      <nav>{tabs.map(([id,label,Icon]) => <button key={id} className={active===id?'active':''} onClick={() => setActive(id)}><Icon size={16}/>{label}</button>)}</nav>
      {user ? <button className="admin on" onClick={onLogout}><LogOut size={14}/> Logga ut</button> : <button className="admin" onClick={() => setActive('admin')}><KeyRound size={14}/> Login</button>}
    </header>
    {children}
    <footer><span>MansHockey 10 · manshockey.com</span><span>Auth + CMS + D1</span></footer>
  </main>
}

export function Page({ kicker, title, children, action }) {
  return <section className="page"><div className="head"><div><span>{kicker}</span><h1>{title}</h1></div>{action}</div>{children}</section>
}
export function Card({ icon, label, value, sub, onClick }) {
  return <button className="card" onClick={onClick}><div className="icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div></button>
}
