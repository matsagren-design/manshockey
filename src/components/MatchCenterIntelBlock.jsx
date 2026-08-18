import React from'react';
import{MatchIntelligence}from'./MatchIntelligence.jsx';

export function MatchCenterIntelBlock({selectedMatch}){
  if(!selectedMatch?.id)return null;
  return <MatchIntelligence match={selectedMatch}/>;
}
