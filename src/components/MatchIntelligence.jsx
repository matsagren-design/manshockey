import React,{useEffect,useState}from'react';
import{Brain,RefreshCw,TrendingUp}from'lucide-react';

export function MatchIntelligence({matchId}){
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(false);

  async function load(force=false){
    if(!matchId)return;
    setLoading(true);
    try{
      const r=await fetch('/api/opponent-intel'+(force?'':`?match_id=${matchId}`),{
        method:force?'POST':'GET',
        headers:force?{'content-type':'application/json'}:undefined,
        body:force?JSON.stringify({match_id:matchId}):undefined
      });
      const d=await r.json();
      if(d.ok)setData(d.item);
    }finally{setLoading(false)}
  }

  useEffect(()=>{load(false)},[matchId]);

  if(!matchId)return null;

  return <section className="intel-panel">
    <div className="intel-head">
      <div>
        <span className="eyebrow">MATCH INTELLIGENCE</span>
        <h3><Brain size={18}/> Motståndaranalys</h3>
      </div>
      <button onClick={()=>load(true)} disabled={loading}>
        <RefreshCw size={15}/>{loading?'Uppdaterar…':'Uppdatera'}
      </button>
    </div>

    {!data ? <p>Analys saknas ännu.</p> :
    <>
      <p className="intel-summary">{data.ai_summary||data.form_summary}</p>

      <div className="intel-grid">
        <article>
          <strong>Form</strong>
          <p>{data.form_summary}</p>
        </article>
        <article>
          <strong>Hemma/Borta</strong>
          <p>{data.home_away_summary}</p>
        </article>
        <article>
          <strong>Måltrend</strong>
          <p>{data.scoring_summary}</p>
        </article>
        <article>
          <strong>Datatillit</strong>
          <p>{Math.round((data.confidence||0)*100)}%</p>
        </article>
      </div>

      {Array.isArray(data.last_games)&&data.last_games.length>0&&
        <div className="intel-games">
          <h4><TrendingUp size={16}/> Senaste verifierade matcher</h4>
          {data.last_games.map((g,i)=>
            <div className="intel-game" key={i}>
              <span>{new Date(g.date).toLocaleDateString('sv-SE')}</span>
              <strong>{g.result}</strong>
              <span>{g.outcome}</span>
            </div>
          )}
        </div>
      }
    </>}
  </section>
}
