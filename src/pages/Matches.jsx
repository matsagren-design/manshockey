import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { formatDate } from '../lib/api.js';

export function Matches({ matches }) {
  return (
    <Page kicker="Match Archive" title="Matcharkiv och rapporter">
      <div className="grid">
        {matches.map(match => (
          <article className="tile" key={match.id || match.game_date}>
            <span className="tag">{match.home_away}</span>
            <h3>Brooks {match.home_away === 'Hemma' ? 'vs' : '@'} {match.opponent}</h3>
            <p>{formatDate(match.game_date)}</p>
            <p>{match.arena}</p>
            <div className="report">
              <b>Inför</b><p>{match.report_before || 'Rapportmall redo.'}</p>
              <b>Efter</b><p>{match.report_after || 'Efterrapport fylls efter match.'}</p>
            </div>
            {match.tv_link && <a href={match.tv_link} target="_blank" rel="noreferrer"><ExternalLink size={16}/> TV</a>}
          </article>
        ))}
      </div>
    </Page>
  );
}
