import React from 'react';
import { FileText, Folder, Image, Video } from 'lucide-react';
import { Page } from '../components/Layout.jsx';

export function Files() {
  const items = [
    ['Video Center', 'Highlights och FloHockey-länkar', Video],
    ['Bildgalleri', 'Match, resa och familj', Image],
    ['Dokument', 'Pass, visum, försäkring', FileText],
    ['R2 Storage', 'Filer utanför GitHub', Folder]
  ];

  return (
    <Page kicker="Files" title="Video, bilder och dokument">
      <div className="grid">
        {items.map(([title, description, Icon]) => (
          <article className="tile" key={title}><Icon/><h3>{title}</h3><p>{description}</p></article>
        ))}
      </div>
    </Page>
  );
}
