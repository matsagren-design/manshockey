import React from 'react';
import { Page } from '../components/Layout.jsx';
function BarRow({ label, value }) { return <div className="barrow"><span>{label}</span><div><i style={{width:`${Math.max(6,value)}%`}}/></div><b>{value}</b></div> }
export function Analytics({ analytics }) {
  return <Page kicker="Analytics" title="Statistik"><div className="analytics"><section><h2>Matcher, media och events</h2>{(analytics?.points||[]).map(x=><BarRow key={x.label} label={x.label} value={x.value*20}/>)}</section><section><h2>Scout</h2>{(analytics?.scout||[]).map(x=><BarRow key={x.label} label={x.label} value={x.value}/>)}</section></div></Page>
}
