import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Page } from '../components/Layout.jsx';

export function Media({ media }) {
  return (
    <Page kicker="Media" title="Media och nyheter">
      <div className="grid">
        {media.map((item, index) => (
          <a className="tile" href={item.url} key={index} target="_blank" rel="noreferrer">
            <span className="tag">{item.tag || item.source}</span>
            <h3>{item.title}</h3>
            <p>{item.source}</p>
            <ExternalLink/>
          </a>
        ))}
      </div>
    </Page>
  );
}
