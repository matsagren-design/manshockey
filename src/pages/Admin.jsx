import React from 'react';
import { Bot, Database, Folder, KeyRound } from 'lucide-react';
import { Page } from '../components/Layout.jsx';

export function Admin({ isAdmin, setIsAdmin }) {
  if (!isAdmin) {
    return (
      <Page kicker="Admin" title="Skyddad adminyta">
        <div className="panel">
          <KeyRound/>
          <h2>Admin skyddas senare med Cloudflare Access</h2>
          <p>Aktivera adminläge lokalt för att se CMS-planen.</p>
          <button onClick={() => setIsAdmin(true)}>Aktivera</button>
        </div>
      </Page>
    );
  }

  return (
    <Page kicker="Control Center" title="CMS och drift">
      <div className="grid">
        <article className="tile"><Database/><h3>D1</h3><p>Databasstruktur finns i schema/d1_schema.sql.</p></article>
        <article className="tile"><Folder/><h3>R2</h3><p>Filuppladdning för bilder, video och PDF.</p></article>
        <article className="tile"><KeyRound/><h3>Access</h3><p>Skydda admin med Cloudflare Access.</p></article>
        <article className="tile"><Bot/><h3>AI</h3><p>AI Coach via Worker.</p></article>
      </div>
    </Page>
  );
}
