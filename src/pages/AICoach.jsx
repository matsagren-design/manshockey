import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { postJson } from '../lib/api.js';

export function AICoach() {
  const [question, setQuestion] = useState('Hur ser nästa match ut?');
  const [answer, setAnswer] = useState('');

  async function ask() {
    const result = await postJson('/api/ai-coach', { question }, { answer: 'AI Coach kunde inte nås.' });
    setAnswer(result.answer || result.error || 'Inget svar.');
  }

  return (
    <Page kicker="AI Coach" title="Fråga appen">
      <div className="ai">
        <Sparkles/>
        <p>Ställ frågor om matcher, scouting, media och resor.</p>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} />
        <button onClick={ask}><Send size={16}/> Fråga</button>
        {answer && <div className="answer">{answer}</div>}
      </div>
    </Page>
  );
}
