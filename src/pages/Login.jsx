import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { login } from '../lib/api.js';
export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('manshockey-admin');
  const [message, setMessage] = useState('');
  async function submit(e) {
    e.preventDefault();
    const res = await login(email, password);
    if (res.ok) onLogin(res.user);
    else setMessage(res.error || 'Kunde inte logga in.');
  }
  return <Page kicker="Login" title="Admininloggning"><form className="login-card" onSubmit={submit}><KeyRound/><h2>Logga in</h2><label>E-post<input value={email} onChange={e => setEmail(e.target.value)} placeholder="din e-post"/></label><label>Lösenord<input type="password" value={password} onChange={e => setPassword(e.target.value)}/></label><button type="submit">Logga in</button>{message && <div className="notice">{message}</div>}</form></Page>
}
