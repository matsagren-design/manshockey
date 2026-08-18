import React,{useEffect,useRef,useState}from'react';
import{Brain,RefreshCw,TrendingUp}from'lucide-react';

export function MatchIntelligence({match}){
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const requestSeq=useRef(0);

  const matchId=match?.id;
  const opponent=match?.opponent||'';

  async function load(force=false){
    if(!matchId)return;

    const seq=++requestSeq.current;
    setLoading(true);
    setError('');

    // Never display the previous match's intelligence while a new one loads.
    setData(null);

    try{
      const r=await fetch(
        force?'/api/opponent-intel':`/api/opponent-intel?match_id=${encodeURIComponent(matchId)}`,
        {
          method:force?'POST':'GET',
          headers:force?{'content-type':'application/json'}:undefined,
          body:force?JSON.stringify({match_id:matchId}):undefined
        }
      );

      const d=await r.json();

      // Ignore a slower response from a previously selected match.
      if(seq!==requestSeq.current)return;

      if(!d.ok){
        setError(d.error||'Analysen kunde inte laddas.');
        return;
      }

      const item=d.item;

      // Frontend binding guard: never render intelligence for another match/opponent.
      if(Number(item?.match_id)!==Number(matchId) ||
         String(item?.opponent||'')!==String(opponent)){
        setError('Analysen matchade inte vald match och visades därför inte.');
        return;
      }

      setData(item);
    }catch(e){
      if(seq===requestSeq.current)setError(String(e));
    }finally{
      if(seq===requestSeq.current)setLoading(false);
    }
  }

  useEffect(()=>{
    requestSeq.current++;
    setData(null);
    setError('');
    if(matchId)load(false);
  },[matchId,opponent]);

  if(!matchId)return null;

  return <section className="intel-panel">
    <div className="intel-head">
      <div>
        <span className="eyebrow">MATCH INTELLIGENCE</span>
        <h3><Brain size={18}/> Motståndaranalys · {opponent}</h3>
      </div>
      <button onClick={()=>load(true)} disabled={loading}>
        <RefreshCw size={15}/>{loading?'Uppdaterar…':'Uppdatera'}
      </button>
    </div>

    {loading&&<p>Hämtar analys för {opponent}…</p>}
    {!loading&&error&&<p>{error}</p>}
    {!loading&&!error&&!data&&<p>Analys saknas ännu.</p>}

    {!loading&&!error&&data&&<>
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
