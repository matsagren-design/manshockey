import React from 'react';
import { Database, Folder, KeyRound, ShieldCheck } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { LoginPage } from './Login.jsx';
export function Admin({ user, onLogin, health }) {
  if (!user) return <LoginPage onLogin={onLogin}/>;
  return <Page kicker="Admin" title="Inställningar"><div className="grid"><article className="tile"><KeyRound/><h3>Inloggad</h3><p>{user.name || user.email} · {user.role}</p></article><article className="tile"><Database/><h3>D1</h3><p>Status: {health?.d1 ? 'aktiv' : 'ej kopplad'}.</p></article><article className="tile"><Folder/><h3>R2</h3><p>Status: {health?.r2 ? 'aktiv' : 'ej kopplad'}.</p></article><article className="tile"><ShieldCheck/><h3>Säkerhet</h3><p>Nästa steg: hashade lösenord och rate limiting.</p></article></div></Page>
}
