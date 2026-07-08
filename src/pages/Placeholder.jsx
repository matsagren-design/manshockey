import React from 'react';
import { Page } from '../components/Layout.jsx';
export function Placeholder({ title, kicker, children }) {
  return <Page kicker={kicker} title={title}><div className="tile wide">{children}</div></Page>
}
