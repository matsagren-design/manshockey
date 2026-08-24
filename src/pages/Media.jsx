import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,Clock,ExternalLink,FileSearch,Filter,Globe2,Newspaper,RefreshCw,Search,ShieldCheck,Video,XCircle}from'lucide-react';
import{Page}from'../components/Layout.jsx';

function fmtDate(value){
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value);
  return d.toLocaleDateString('sv-SE',{year:'numeric',month:'short',day:'numeric'});
}

function typeLabel(type){
  if(type==='article')return 'Artikel';
  if(type==='video')return 'Video';
  if(type==='social')return 'Social';
  return 'Webb';
}

function TypeIcon({type,size=16}){
  if(type==='video')return <Video size={size}/>;
  if(type==='article')return <Newspaper size={size}/>;
  return <Globe2 size={size}/>;
}

function WatchCard({item,onStatus,onScrape,busyId}){
  const busy=busyId===item.id;
  return <article className="tile media-watch-card">
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
      <span className="tag" style={{display:'inline-flex',gap:6,alignItems:'center'}}>
        <TypeIcon type={item.source_type}/>{typeLabel(item.source_type)}
      </span>
      <span style={{fontSize:12,opacity:.72,whiteSpace:'nowrap'}}>
        Relevans {Math.round(Number(item.relevance_score||0))}/100
      </span>
    </div>
    <h3 style={{marginBottom:8}}>{item.title}</h3>
    <div style={{display:'flex',flexWrap:'wrap',gap:10,fontSize:13,opacity:.72,marginBottom:10}}>
      {item.source_name&&<span>{item.source_name}</span>}
      {item.published_at&&<span>{fmtDate(item.published_at)}</span>}
      {item.status&&<span>Status: {item.status}</span>}
    </div>
    {item.snippet&&<p style={{opacity:.82,display:'-webkit-box',WebkitLineClamp:5,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{item.snippet}</p>}
    {item.search_query&&<small style={{display:'block',opacity:.58,marginTop:10}}>Sökning: {item.search_query}</small>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:16}}>
      <a className="btn" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Öppna</a>
      <button type="button" className="btn" disabled={busy} onClick={()=>onScrape(item)}><FileSearch size={15}/>{busy?'Läser…':'Läs hela'}</button>
      {item.status!=='approved'&&<button type="button" className="btn" disabled={busy} onClick={()=>onStatus(item.id,'approved')}><CheckCircle2 size={15}/>Godkänn</button>}
      {item.status!=='irrelevant'&&<button type="button" className="btn" disabled={busy} onClick={()=>onStatus(item.id,'irrelevant')}><XCircle size={15}/>Irrelevant</button>}
      {item.status!=='new'&&<button type="button" className="btn" disabled={busy} onClick={()=>onStatus(item.id,'new')}><Clock size={15}/>Till inkorg</button>}
    </div>
  </article>;
}

function MatchMediaCard({item}){
  return <a className="tile" href={item.url} target="_blank" rel="noreferrer">
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
      <span className="tag">{item.tag||item.media_type||item.source||'Matchmedia'}</span><ExternalLink size={17}/>
    </div>
    <h3>{item.title}</h3>
    {item.summary&&<p style={{opacity:.82}}>{item.summary}</p>}
    <div style={{display:'flex',flexWrap:'wrap',gap:10,fontSize:13,opacity:.72,marginTop:12}}>
      {item.source&&<span>{item.source}</span>}
      {item.published_at&&<span>{fmtDate(item.published_at)}</span>}
      {item.match_id!==undefined&&item.match_id!==null&&item.match_id!==''&&<span>Match {item.match_id}</span>}
    </div>
  </a>;
}

function SummaryCard({icon,title,value}){
  return <article className="tile" style={{minHeight:120}}><div style={{opacity:.72}}>{icon}</div><h3 style={{fontSize:28,margin:'12px 0 4px'}}>{value}</h3><p style={{margin:0,opacity:.72}}>{title}</p></article>;
}

export function Media({media=[]}){
  const[items,setItems]=useState([]);
  const[summary,setSummary]=useState({total:0,newItems:0,approved:0,irrelevant:0,articles:0,social:0,videos:0});
  const[loading,setLoading]=useState(true);
  const[searching,setSearching]=useState(false);
const[cleaning,setCleaning]=useState(false);
const[lastCleanup,setLastCleanup]=useState(null);
const[busyId,setBusyId]=useState(null);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[tab,setTab]=useState('inbox');
  const[typeFilter,setTypeFilter]=useState('all');
  const[textFilter,setTextFilter]=useState('');
  const[lastSearch,setLastSearch]=useState(null);

  async function loadWatch(){
    try{
      setLoading(true); setError('');
      const r=await fetch('/api/media-watch?limit=200',{credentials:'include',cache:'no-store'});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d?.error||`HTTP ${r.status}`);
      setItems(Array.isArray(d.items)?d.items:[]);
      if(d.summary)setSummary(d.summary);
    }catch(e){setError(`Media Watch kunde inte laddas: ${e.message||e}`)}
    finally{setLoading(false)}
  }

  async function runSearch(){
    try{
      setSearching(true); setError(''); setNotice('');
      const r=await fetch('/api/media-watch',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'search',include_content:false})});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d?.error||`HTTP ${r.status}`);
      setItems(Array.isArray(d.items)?d.items:[]);
      if(d.summary)setSummary(d.summary);
      setLastSearch(d.search||null);
      const s=d.search||{};
      setNotice(`Sökningen klar: ${s.found??0} träffar, ${s.unique??0} unika, ${s.saved??0} sparade.`);
      setTab('inbox');
    }catch(e){setError(`Nät­sökningen misslyckades: ${e.message||e}`)}
    finally{setSearching(false)}
  }

  async function runCleanup(){
  const confirmed=window.confirm(
    'Räkna om relevansen för alla befintliga nätträffar? Manuellt godkända träffar lämnas orörda.'
  );

  if(!confirmed)return;

  try{
    setCleaning(true);
    setError('');
    setNotice('');
    setLastCleanup(null);

    const r=await fetch('/api/media-watch',{
      method:'POST',
      credentials:'include',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        action:'cleanup'
      })
    });

    const d=await r.json();

    if(!r.ok||!d.ok){
      throw new Error(d?.error||`HTTP ${r.status}`);
    }

    setItems(Array.isArray(d.items)?d.items:[]);

    if(d.summary){
      setSummary(d.summary);
    }

    setLastCleanup(d.cleanup||null);

    const c=d.cleanup||{};

    setNotice(
      `Rensningen klar. ${c.scanned??0} träffar kontrollerades, `+
      `${c.rescored??0} räknades om och `+
      `${c.autoIrrelevant??0} klassades som irrelevanta.`
    );

    setTab('inbox');

  }catch(e){
    setError(
      `Rensningen misslyckades: ${e.message||e}`
    );
  }finally{
    setCleaning(false);
  }
}
  async function setStatus(id,status){
    try{
      setBusyId(id); setError('');
      const r=await fetch('/api/media-watch',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status',id,status})});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d?.error||`HTTP ${r.status}`);
      await loadWatch();
    }catch(e){setError(`Status kunde inte ändras: ${e.message||e}`)}
    finally{setBusyId(null)}
  }

  async function scrapeItem(item){
    try{
      setBusyId(item.id); setError(''); setNotice('');
      const r=await fetch('/api/media-watch',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'scrape',id:item.id,url:item.url})});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d?.error||`HTTP ${r.status}`);
      setNotice(`Hela innehållet lästes in (${d.chars||0} tecken).`);
      await loadWatch();
    }catch(e){setError(`Innehållet kunde inte läsas: ${e.message||e}`)}
    finally{setBusyId(null)}
  }

  useEffect(()=>{loadWatch()},[]);

  const visibleWatch=useMemo(()=>{
    const q=textFilter.trim().toLowerCase();
    return items.filter(item=>{
      if(tab==='inbox'&&item.status!=='new')return false;
      if(tab==='approved'&&item.status!=='approved')return false;
      if(tab==='irrelevant'&&item.status!=='irrelevant')return false;
      if(typeFilter!=='all'&&item.source_type!==typeFilter)return false;
      if(q){
        const hay=[item.title,item.snippet,item.source_name,item.search_query].filter(Boolean).join(' ').toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });
  },[items,tab,typeFilter,textFilter]);

  const matchMedia=useMemo(()=>{
    const q=textFilter.trim().toLowerCase();
    if(!q)return media;
    return media.filter(item=>[item.title,item.source,item.summary,item.tag,item.media_type].filter(Boolean).join(' ').toLowerCase().includes(q));
  },[media,textFilter]);

  const showingMatch=tab==='match';

  return <Page
  kicker="Media Intelligence"
  title="Media och nyheter"
  action={
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button
        className="btn"
        type="button"
        onClick={runCleanup}
        disabled={cleaning||searching}
      >
        <ShieldCheck size={16}/>
        {cleaning?'Rensar…':'Rensa irrelevanta'}
      </button>

      <button
        className="btn"
        type="button"
        onClick={runSearch}
        disabled={searching||cleaning}
      >
        <RefreshCw size={16}/>
        {searching?'Söker på nätet…':'Sök på nätet'}
      </button>
    </div>
  }
>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:22}}>
      <SummaryCard icon={<Clock size={20}/>} title="Nya" value={summary.newItems}/>
      <SummaryCard icon={<ShieldCheck size={20}/>} title="Godkända" value={summary.approved}/>
      <SummaryCard icon={<Newspaper size={20}/>} title="Artiklar" value={summary.articles}/>
      <SummaryCard icon={<Globe2 size={20}/>} title="Social" value={summary.social}/>
      <SummaryCard icon={<Video size={20}/>} title="Video" value={summary.videos}/>
      <SummaryCard icon={<ExternalLink size={20}/>} title="Matchmedia" value={media.length}/>
    </div>

    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:16}}>
      <button className={`btn ${tab==='inbox'?'active':''}`} onClick={()=>setTab('inbox')}>Inkorg ({summary.newItems})</button>
      <button className={`btn ${tab==='approved'?'active':''}`} onClick={()=>setTab('approved')}>Godkända ({summary.approved})</button>
      <button className={`btn ${tab==='irrelevant'?'active':''}`} onClick={()=>setTab('irrelevant')}>Irrelevanta ({summary.irrelevant})</button>
      <button className={`btn ${tab==='all'?'active':''}`} onClick={()=>setTab('all')}>Alla nätträffar ({summary.total})</button>
      <button className={`btn ${tab==='match'?'active':''}`} onClick={()=>setTab('match')}>Matchmedia ({media.length})</button>
    </div>

    <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:20}}>
      {!showingMatch&&<>
        <span style={{display:'inline-flex',gap:6,alignItems:'center',opacity:.72}}><Filter size={15}/>Typ</span>
        {[["all","Alla"],["article","Artikel"],["social","Social"],["video","Video"],["web","Webb"]].map(([key,label])=><button key={key} className={`btn ${typeFilter===key?'active':''}`} onClick={()=>setTypeFilter(key)}>{label}</button>)}
      </>}
      <div style={{marginLeft:'auto',position:'relative',minWidth:260,flex:'0 1 360px'}}>
        <Search size={16} style={{position:'absolute',left:12,top:11,opacity:.6}}/>
        <input value={textFilter} onChange={e=>setTextFilter(e.target.value)} placeholder="Sök i media…" style={{width:'100%',padding:'10px 12px 10px 36px'}}/>
      </div>
    </div>

    {error&&<div className="tile" style={{marginBottom:16}}><XCircle size={18}/><strong>{error}</strong></div>}
    {notice&&<div className="tile" style={{marginBottom:16}}><CheckCircle2 size={18}/><strong>{notice}</strong>{lastSearch?.creditsUsed!==undefined&&<small style={{display:'block',opacity:.65,marginTop:6}}>Firecrawl credits: {lastSearch.creditsUsed}</small>}</div>}

    {loading&&!showingMatch
      ? <div className="tile"><Clock size={18}/><p>Läser Media Watch…</p></div>
      : showingMatch
        ? matchMedia.length
          ? <div className="grid">{matchMedia.map((item,index)=><MatchMediaCard item={item} key={item.id||item.url||index}/>)}</div>
          : <div className="tile"><Video size={20}/><h3>Ingen matchmedia</h3><p>Det finns inga matchkopplade mediaobjekt i filtret.</p></div>
        : visibleWatch.length
          ? <div className="grid">{visibleWatch.map(item=><WatchCard key={item.id||item.url} item={item} busyId={busyId} onStatus={setStatus} onScrape={scrapeItem}/>)}</div>
          : <div className="tile"><Search size={20}/><h3>Inga träffar här</h3><p>Kör en ny nät­sökning eller ändra status-/typfiltret.</p></div>
    }
  </Page>;
}
