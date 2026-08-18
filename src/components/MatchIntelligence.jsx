import React,{useEffect,useRef,useState}from'react';
import{Brain,RefreshCw,TrendingUp,ShieldCheck,Crosshair,Activity,Home,Plane}from'lucide-react';

const V=({value,fallback='–'})=>value===null||value===undefined||value===''?fallback:value;

export function MatchIntelligence({match}){
  const[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const requestSeq=useRef(0),matchId=match?.id,opponent=match?.opponent||'';

  async function load(force=false){
    if(!matchId)return;
    const seq=++requestSeq.current;
    setLoading(true);setError('');setData(null);

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

      if(seq!==requestSeq.current)return;
      if(!d.ok){setError(d.error||'Analysen kunde inte laddas.');return}

      const item=d.item;
      if(Number(item?.match_id)!==Number(matchId)||String(item?.opponent||'')!==String(opponent)){
        setError('Analysen matchade inte vald match.');
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
    setData(null);setError('');
    if(matchId)load(false);
  },[matchId,opponent]);

  if(!matchId)return null;
  const a=data?.advanced||{};
  const hasData=(a.data_points||0)>0;

  return <section className="intel-panel">
    <div className="intel-head">
      <div>
        <span className="eyebrow">ADVANCED OPPONENT INTELLIGENCE</span>
        <h3><Brain size={18}/> {opponent}</h3>
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
        <article><strong><Activity size={15}/> Form 5</strong><p>{V(a.form5)} · {V(a.record)}</p></article>
        <article><strong>GF / GA</strong><p>{hasData?`${a.gf} / ${a.ga} · diff ${a.diff>0?'+':''}${a.diff}`:'–'}</p></article>
        <article><strong><Home size={15}/> Hemma</strong><p>{V(a.home_record)}</p></article>
        <article><strong><Plane size={15}/> Borta</strong><p>{V(a.away_record)}</p></article>
        <article><strong>Målsnitt</strong><p>{hasData?`${a.avg_for} framåt · ${a.avg_against} bakåt`:'–'}</p></article>
        <article><strong>Underlag</strong><p>{hasData?`${a.data_points} verifierade matcher`:'Data saknas'}</p></article>
        <article><strong>Special Teams</strong><p>{a.special_teams?.note||'Data saknas'}</p></article>
        <article><strong><ShieldCheck size={15}/> Datatillit</strong><p>{Math.round((data.confidence||0)*100)}%</p></article>
      </div>

      <div className="intel-grid intel-actions">
        <article>
          <strong><Crosshair size={16}/> Keys to the Game</strong>
          {(a.keys_to_game||[]).map((x,i)=><p key={i}>{i+1}. {x}</p>)}
        </article>
        <article>
          <strong><ShieldCheck size={16}/> Måns Focus</strong>
          {(a.mans_focus||[]).map((x,i)=><p key={i}>{i+1}. {x}</p>)}
        </article>
      </div>

      {Array.isArray(data.last_games)&&data.last_games.length>0&&
        <div className="intel-games">
          <h4><TrendingUp size={16}/> Form 5 – verifierade matcher</h4>
          {data.last_games.map((g,i)=>
            <div className="intel-game" key={i}>
              <span>{new Date(g.date).toLocaleDateString('sv-SE')}</span>
              <span>{g.opponent}</span>
              <strong>{g.result}</strong>
              <span>{g.outcome}</span>
            </div>
          )}
        </div>
      }
    </>}
  </section>
}
