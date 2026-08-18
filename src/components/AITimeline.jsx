import React, { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Sparkles,
  XCircle
} from "lucide-react";

function formatTimelineTime(value) {
  if (!value) return "Tid saknas";

  const normalized =
    value.includes("T") || value.endsWith("Z")
      ? value
      : `${value.replace(" ", "T")}Z`;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function ProviderBadge({ provider }) {
  const labels = {
    openai: "OpenAI",
    cache: "Cache",
    local: "Lokal",
    fallback: "Fallback"
  };

  return (
    <span className={`timeline-provider provider-${provider || "unknown"}`}>
      {labels[provider] || provider || "Okänd"}
    </span>
  );
}

export function AITimeline({ limit = 12 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadTimeline() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/ai-timeline?limit=${limit}&v=${Date.now()}`
      );

      const json = await response.json();
      setData(json);
    } catch (err) {
      setData({
        ok: false,
        error: err.message,
        items: []
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeline();

    const timer = setInterval(loadTimeline, 30000);
    return () => clearInterval(timer);
  }, [limit]);

  const summary = data?.summary || {};
  const items = data?.items || [];

  return (
    <section className="mc-section">
      <div className="timeline-heading">
        <h2>
          <Bot />
          AI Timeline
        </h2>

        <button
          type="button"
          onClick={loadTimeline}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {loading ? "Uppdaterar..." : "Uppdatera"}
        </button>
      </div>

      <div className="mini-grid timeline-summary">
        <article className="mini-card">
          <b>Händelser</b>
          <strong>{summary.events ?? 0}</strong>
        </article>

        <article className="mini-card">
          <b>Lyckade</b>
          <strong>{summary.successful ?? 0}</strong>
        </article>

        <article className="mini-card">
          <b>OpenAI</b>
          <strong>{summary.openai ?? 0}</strong>
        </article>

        <article className="mini-card">
          <b>Cache</b>
          <strong>{summary.cache ?? 0}</strong>
        </article>
      </div>

      {data?.error && (
        <article className="mini-card">
          <b>Fel</b>
          <p>{data.error}</p>
        </article>
      )}

      <div className="ai-timeline">
        {items.length ? (
          items.map(item => (
            <article
              className={`timeline-item ${
                item.ok ? "timeline-success" : "timeline-error"
              }`}
              key={item.id}
            >
              <div className="timeline-marker">
                {item.ok ? (
                  <CheckCircle size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </div>

              <div className="timeline-content">
                <div className="timeline-top">
                  <div>
                    <b>{item.title}</b>

                    <span className="timeline-time">
                      <Clock size={13} />
                      {formatTimelineTime(item.createdAt)}
                    </span>
                  </div>

                  <ProviderBadge provider={item.provider} />
                </div>

                <p>{item.description}</p>

                <small>
                  {item.matchId && `Match ${item.matchId} · `}
                  {item.durationMs} ms
                </small>
              </div>
            </article>
          ))
        ) : (
          <article className="mini-card">
            <Sparkles />
            <b>Ingen AI-historik ännu</b>
            <p>
              Kör hela AI-flödet i MatchCenter så visas händelserna här.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}