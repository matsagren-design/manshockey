import React, { useEffect, useState } from "react";
import {
  Bot,
  Brain,
  RefreshCw,
  Send,
  Star,
  TrendingDown,
  TrendingUp,
  Video
} from "lucide-react";

function ScoreBar({ label, value, clips }) {
  const score = Number(value || 0);

  return (
    <div className="video-memory-bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.min(100, Math.max(4, score * 10))}%` }} />
      </div>
      <b>{value ?? "—"}</b>
      <small>{clips} klipp</small>
    </div>
  );
}

export function VideoMemory() {
  const [data, setData] = useState(null);
  const [question, setQuestion] = useState(
    "Vilket utvecklingsområde återkommer oftast i videoanalyserna?"
  );
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function loadMemory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/video-memory?v=${Date.now()}`);
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Video Memory kunde inte laddas.");
      }

      setData(json);
    } catch (err) {
      setError(err.message || "Video Memory kunde inte laddas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemory();
  }, []);

  async function askMemory(event) {
    event.preventDefault();

    if (!question.trim()) return;

    setAsking(true);
    setError("");

    try {
      const response = await fetch("/api/video-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Frågan kunde inte analyseras.");
      }

      setAnswer(json);
      setData(json);
    } catch (err) {
      setError(err.message || "Frågan kunde inte analyseras.");
    } finally {
      setAsking(false);
    }
  }

  const summary = data?.summary || {};
  const categories = data?.categories || [];

  return (
    <section className="mc-section video-memory-section">
      <div className="video-memory-head">
        <div>
          <h2><Brain /> AI Video Memory</h2>
          <p>
            Samlar alla tidigare videoanalyser och följer utvecklingen över tid.
          </p>
        </div>

        <button type="button" onClick={loadMemory} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? "Uppdaterar..." : "Uppdatera"}
        </button>
      </div>

      {error && (
        <article className="notice">
          <b>Fel</b>
          <p>{error}</p>
        </article>
      )}

      <div className="video-memory-summary">
        <article className="mini-card">
          <small>Klipp</small>
          <strong>{summary.clips ?? 0}</strong>
        </article>

        <article className="mini-card">
          <small>Analyserade</small>
          <strong>{summary.analyzed ?? 0}</strong>
        </article>

        <article className="mini-card">
          <small>Snittbetyg</small>
          <strong>{summary.averageScore ?? "—"}</strong>
        </article>

        <article className="mini-card">
          <small>Trend</small>
          <strong className={
            Number(summary.trend || 0) >= 0
              ? "video-trend-positive"
              : "video-trend-negative"
          }>
            {summary.trend == null
              ? "—"
              : `${summary.trend > 0 ? "+" : ""}${summary.trend}`}
          </strong>
        </article>
      </div>

      <div className="video-memory-layout">
        <div>
          <h3><Star size={17} /> Kategorier</h3>

          <div className="video-memory-bars">
            {categories.length ? (
              categories.map(category => (
                <ScoreBar
                  key={category.category}
                  label={category.category}
                  value={category.averageScore}
                  clips={category.clips}
                />
              ))
            ) : (
              <p>Det finns ännu inga analyserade kategorier.</p>
            )}
          </div>
        </div>

        <div className="video-memory-insights">
          <article className="mini-card">
            <b><TrendingUp size={16} /> Styrka</b>
            <strong>{data?.strongest?.category || "—"}</strong>
            <p>
              {data?.strongest?.averageScore != null
                ? `Snitt ${data.strongest.averageScore}/10`
                : "Mer data behövs."}
            </p>
          </article>

          <article className="mini-card">
            <b><TrendingDown size={16} /> Utveckla</b>
            <strong>{data?.develop?.category || "—"}</strong>
            <p>
              {data?.develop?.averageScore != null
                ? `Snitt ${data.develop.averageScore}/10`
                : "Mer data behövs."}
            </p>
          </article>

          <article className="mini-card">
            <b><Bot size={16} /> Lokal rekommendation</b>
            <p>{data?.localRecommendation || "Video Memory väntar på data."}</p>
          </article>
        </div>
      </div>

      <form className="video-memory-question" onSubmit={askMemory}>
        <label>
          Fråga Video Memory
          <input
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Exempel: Har förstapasset förbättrats?"
          />
        </label>

        <button type="submit" disabled={asking}>
          <Send size={16} />
          {asking ? "Analyserar..." : "Analysera utveckling"}
        </button>
      </form>

      {answer?.answer && (
        <article className="video-memory-answer">
          <div>
            <b><Bot size={17} /> AI-svar</b>
            <span>{answer.provider}{answer.cached ? " · cache" : ""}</span>
          </div>

          <p style={{ whiteSpace: "pre-wrap" }}>{answer.answer}</p>
        </article>
      )}
    </section>
  );
}
