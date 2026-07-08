import React from 'react';
import { Page } from '../components/Layout.jsx';

export function Travel({ travel }) {
  return (
    <Page kicker="Travel" title="Resecenter">
      <div className="grid">
        {travel.map((item, index) => (
          <article className="tile" key={index}>
            <span className="tag">{item.airline}</span>
            <h3>{item.origin} → {item.destination}</h3>
            <p>Max {item.max_price_sek || '—'} kr · efter {item.depart_after} · undvik USA: {item.avoid_usa ? 'ja' : 'nej'}</p>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </Page>
  );
}
