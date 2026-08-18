import React,{useEffect,useMemo,useRef,useState}from'react';
import{
  Brain,RefreshCw,TrendingUp,Activity,Home,Plane,ShieldCheck,Target,
  Gauge,Disc3,Timer,BarChart3
}from'lucide-react';

function valueOr(a,b,fallback='–'){
  if(a!==undefined&&a!==null&&a!=='')return a;
  if(b!==undefined&&b!==null&&b!=='')return b;
  return fallback;
}

function StatCard({icon,title,children}){
  return <article className="intel-stat-card">
    <div className="intel-stat-title">{icon}<strong>{title}</strong></div>
    <div className="intel-stat-value">{children}</div>
  </article>;
}

function pct(v){
  return v===null||v===undefined?'–':`${v}%`;
}

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
    setData(null);

    try{
      const r=await fetch(
        force
          ? '/api/opponent-intel'
          : `/api/opponent-intel?match_id=${encodeURIComponent(matchId)}`,
        {
          method:force?'POST':'GET',
          headers:force?{'content-type':'application/json'}:undefined,
          body:force?JSON.stringify({match_id:matchId}):undefined
        }
      );

      const d=await r.json();

      if(seq!==requestSeq.current)return;

      if(!d.ok){
        setError(d.error||'Analysen kunde inte laddas.');
        return;
      }

      const item=d.item;

      if(
        Number(item?.match_id)!==Number(matchId) ||
        String(item?.opponent||'')!==String(opponent)
      ){
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

  const a=data?.advanced||{};
  const st=a.special_teams||{};
  const shots=a.shots||null;
  const discipline=a.discipline||null;
  const periods=Array.isArray(a.periods)?a.periods:[];

  const display=useMemo(()=>({
    form5:valueOr(a.form5,data?.form5),
    record:valueOr(a.record,data?.record),
    home:valueOr(a.home_record,data?.home_record),
    away:valueOr(a.away_record,data?.away_record),
    gf:valueOr(a.gf,data?.gf,null),
    ga:valueOr(a.ga,data?.ga,null),
    diff:valueOr(a.diff,data?.diff,null),
    avgFor:valueOr(a.avg_for,data?.avg_for,null),
    avgAgainst:valueOr(a.avg_against,data?.avg_against,null),
    points:Number(valueOr(a.data_points,data?.data_points,0))||0
  }),[data,a]);

  if(!matchId)return null;

  return <section className="intel-panel">
    <div className="intel-head">
      <div>
        <span className="eyebrow">ADVANCED OPPONENT INTELLIGENCE</span>
        <h3><Brain size={18}/> {opponent}</h3>
      </div>

      <button onClick={()=>load(true)} disabled={loading}>
        <RefreshCw size={15}/>
        {loading?'Uppdaterar…':'Uppdatera'}
      </button>
    </div>

    {loading&&<p>Hämtar verifierad analys för {opponent}…</p>}
    {!loading&&error&&<p>{error}</p>}
    {!loading&&!error&&!data&&<p>Analys saknas ännu.</p>}

    {!loading&&!error&&data&&<>
      <p className="intel-summary">{data.ai_summary||data.form_summary}</p>

      <div className="intel-grid">
        <StatCard icon={<Activity size={16}/>} title="Form 5">
          <strong>{display.form5}</strong>
          {display.record!=='–'&&<small>{display.record}</small>}
        </StatCard>

        <StatCard icon={<TrendingUp size={16}/>} title="GF / GA">
          {display.gf!==null&&display.ga!==null
            ? <>{display.gf} / {display.ga} · diff {Number(display.diff)>=0?'+':''}{display.diff}</>
            : '–'}
        </StatCard>

        <StatCard icon={<Home size={16}/>} title="Hemma">{display.home}</StatCard>
        <StatCard icon={<Plane size={16}/>} title="Borta">{display.away}</StatCard>

        <StatCard icon={<Target size={16}/>} title="Målsnitt">
          {display.avgFor!==null&&display.avgAgainst!==null
            ? <>{display.avgFor} framåt · {display.avgAgainst} bakåt</>
            : '–'}
        </StatCard>

        <StatCard icon={<TrendingUp size={16}/>} title="Underlag">
          {display.points} verifierade matcher
        </StatCard>

        <StatCard icon={<ShieldCheck size={16}/>} title="PP / PK">
          {st.available
            ? <>{pct(st.power_play?.pct)} / {pct(st.penalty_kill?.pct)}</>
            : 'Advanced data saknas'}
        </StatCard>

        <StatCard icon={<ShieldCheck size={16}/>} title="Datatillit">
          {Math.round((data.confidence||0)*100)}%
        </StatCard>
      </div>

      {st.available&&
        <div className="intel-grid intel-grid-advanced">
          <StatCard icon={<Gauge size={16}/>} title="Powerplay">
            {st.power_play?.goals ?? 0}/{st.power_play?.opportunities ?? 0} · {pct(st.power_play?.pct)}
          </StatCard>

          <StatCard icon={<ShieldCheck size={16}/>} title="Penalty Kill">
            {st.penalty_kill?.kills ?? 0}/{st.penalty_kill?.opportunities ?? 0} · {pct(st.penalty_kill?.pct)}
          </StatCard>

          <StatCard icon={<Disc3 size={16}/>} title="Skott">
            {shots
              ? <>{shots.for_per_game ?? '–'} för · {shots.against_per_game ?? '–'} emot</>
              : '–'}
          </StatCard>

          <StatCard icon={<Timer size={16}/>} title="Disciplin">
            {discipline
              ? <>{discipline.pim_per_game ?? '–'} PIM/match · {discipline.infractions_per_game ?? '–'} utv/match</>
              : '–'}
          </StatCard>
        </div>
      }

      {periods.length>0&&
        <article className="intel-detail-card intel-period-card">
          <h4><BarChart3 size={16}/> Periodprofil</h4>
          <div className="intel-period-grid">
            {periods.map((p,i)=>
              <div key={`${p.period}-${i}`} className="intel-period-row">
                <strong>P{p.period}</strong>
                <span>{p.gf}–{p.ga}</span>
                <small>{p.gf_per_game ?? '–'} / {p.ga_per_game ?? '–'} per match</small>
              </div>
            )}
          </div>
        </article>
      }

      <div className="intel-wide-grid">
        <article className="intel-detail-card">
          <h4><Target size={16}/> Keys to the Game</h4>
          {(a.keys_to_game||[]).length
            ? <ol>{a.keys_to_game.map((x,i)=><li key={i}>{x}</li>)}</ol>
            : <p>Inga verifierade nycklar ännu.</p>}

          {(a.tactical_notes||[]).length>0&&<>
            <h4 style={{marginTop:16}}>Advanced Notes</h4>
            <ol>{a.tactical_notes.map((x,i)=><li key={i}>{x}</li>)}</ol>
          </>}
        </article>

        <article className="intel-detail-card">
          <h4><ShieldCheck size={16}/> Måns Focus</h4>
          {(a.mans_focus||[]).length
            ? <ol>{a.mans_focus.map((x,i)=><li key={i}>{x}</li>)}</ol>
            : <p>Ingen verifierad fokuslista ännu.</p>}
        </article>
      </div>

      {Array.isArray(data.last_games)&&data.last_games.length>0&&
        <div className="intel-games">
          <h4><TrendingUp size={16}/> Form 5 – verifierade matcher</h4>

          {data.last_games.map((g,i)=>
            <div className="intel-game" key={g.external_id||`${g.date}-${i}`}>
              <span>{new Date(`${g.date}T12:00:00Z`).toLocaleDateString('sv-SE')}</span>
              <span>{g.venue==='Home'?'Hemma':'Borta'}</span>
              <span>{g.opponent}</span>
              <strong>{g.result}</strong>
              <b>{g.outcome}</b>
            </div>
          )}
        </div>
      }
    </>}
  </section>;
}
