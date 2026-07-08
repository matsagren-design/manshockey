import React,{useState} from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
export function AICoach(){const[question,setQuestion]=useState('Sammanfatta kommande matcher och scoutläget.');const[answer,setAnswer]=useState('');async function ask(){const r=await fetch('/api/ai-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});const j=await r.json();setAnswer(j.answer||'Inget svar.')}return <Page kicker="AI Coach" title="AI Control Center"><div className="ai"><Sparkles/><p>AI Coach läser D1-kontext.</p><textarea value={question} onChange={e=>setQuestion(e.target.value)}/><button onClick={ask}><Send size={16}/> Fråga</button>{answer&&<div className="answer">{answer}</div>}</div></Page>}
