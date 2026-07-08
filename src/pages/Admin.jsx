import React from 'react';
import { Database, Folder, KeyRound, ShieldCheck } from 'lucide-react';
import { Page } from '../components/Layout.jsx';

export function Admin({ isAdmin, setIsAdmin, health }) {
  if (!isAdmin) {
    return <Page kicker="Admin" title="Skyddad adminyta">
      <div className="panel">
        <KeyRound/>
        <h2>Aktivera adminläge</h2>
        <p>Detta är lokalt adminläge. Cloudflare Access rekommenderas som nästa säkerhetssteg.</p>
        <button onClick={() => setIsAdmin(true)}>Aktivera adminläge</button>
      </div>
    </Page>
  }
  return <Page kicker="Control Center" title="MansHockey Cloud CMS">
    <div className="grid">
      <article className="tile"><Database/><h3>D1</h3><p>Status: {health?.d1 ? 'aktiv' : 'ej kopplad'}. Admin kan nu skapa, redigera och ta bort data.</p></article>
      <article className="tile"><Folder/><h3>R2</h3><p>Status: {health?.r2 ? 'aktiv' : 'ej kopplad'}. Nästa steg för bilder, video och PDF.</p></article>
      <article className="tile"><ShieldCheck/><h3>Access</h3><p>Nästa steg: skydda admin med Cloudflare Access.</p></article>
    </div>
  </Page>
}
