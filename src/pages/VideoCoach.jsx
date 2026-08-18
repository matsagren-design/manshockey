import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
  Play,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Video
} from "lucide-react";
import { Page } from "../components/Layout.jsx";
import { formatDate } from "../lib/api.js";

const CATEGORIES = [
  "Breakout",
  "Gap Control",
  "Defensive Zone",
  "First Pass",
  "Physical Play",
  "Boxplay",
  "Powerplay",
  "Transition",
  "Offensive Blue Line",
  "Decision Making",
  "Other"
];

function secondsToTime(value) {
  const total = Math.max(0, Number(value || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ClipCard({ clip, onAnalyze, onDelete, analyzingId }) {
  const analysis = clip.analysis || null;

  return (
    <article className="video-clip-card">
      <div className="video-clip-head">
        <div>
          <span className="tag">{clip.category || "Video"}</span>
          <h3>{clip.title}</h3>
          <p>
            {clip.opponent ? `Brooks vs ${clip.opponent}` : "Ingen match kopplad"}
            {clip.game_date ? ` · ${formatDate(clip.game_date)}` : ""}
          </p>
        </div>

        <a href={clip.video_url} target="_blank" rel="noreferrer" className="video-link">
          <ExternalLink size={16} />
          Öppna video
        </a>
      </div>

      <div className="video-meta-grid">
        <div>
          <small>Tidskod</small>
          <strong>{secondsToTime(clip.start_seconds)}–{secondsToTime(clip.end_seconds)}</strong>
        </div>
        <div>
          <small>Period</small>
          <strong>{clip.period || "—"}</strong>
        </div>
        <div>
          <small>Matchklocka</small>
          <strong>{clip.game_clock || "—"}</strong>
        </div>
        <div>
          <small>Status</small>
          <strong>{clip.status || "pending"}</strong>
        </div>
      </div>

      {clip.note && <p className="video-note">{clip.note}</p>}

      {analysis && (
        <div className="video-analysis">
          <div className="video-analysis-head">
            <b><Bot size={16} /> AI Coach-analys</b>
            <span><Star size={15} /> {analysis.score ?? "—"}/10</span>
          </div>

          <p style={{ whiteSpace: "pre-wrap" }}>{analysis.analysis}</p>

          {analysis.strengths && (
            <div>
              <b>Styrkor</b>
              <p style={{ whiteSpace: "pre-wrap" }}>{analysis.strengths}</p>
            </div>
          )}

          {analysis.improvements && (
            <div>
              <b>Utveckla</b>
              <p style={{ whiteSpace: "pre-wrap" }}>{analysis.improvements}</p>
            </div>
          )}

          {analysis.coaching_points && (
            <div>
              <b>Coachpunkter</b>
              <p style={{ whiteSpace: "pre-wrap" }}>{analysis.coaching_points}</p>
            </div>
          )}
        </div>
      )}

      <div className="video-actions">
        <button
          type="button"
          onClick={() => onAnalyze(clip.id)}
          disabled={analyzingId === clip.id}
        >
          <Bot size={16} />
          {analyzingId === clip.id
            ? "Analyserar..."
            : analysis
              ? "Uppdatera analys"
              : "Analysera klipp"}
        </button>

        <button type="button" className="danger" onClick={() => onDelete(clip.id)}>
          <Trash2 size={16} />
          Ta bort
        </button>
      </div>
    </article>
  );
}

export function VideoCoach({ matches = [], user }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [form, setForm] = useState({
    match_id: "",
    title: "",
    video_url: "",
    start_seconds: 0,
    end_seconds: 15,
    period: "",
    game_clock: "",
    category: "Breakout",
    note: ""
  });

  async function loadClips() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (matchFilter) params.set("match_id", matchFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("v", Date.now());

      const response = await fetch(`/api/video-clips?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Video-API svarade med ${response.status}`);
      }

      setClips(data.items || []);
    } catch (err) {
      setError(err.message || "Kunde inte ladda videoklipp.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClips();
  }, [matchFilter, categoryFilter]);

  const stats = useMemo(() => {
    const analyzed = clips.filter(clip => clip.analysis).length;
    const average = clips.length
      ? clips
          .filter(clip => clip.analysis?.score != null)
          .reduce((sum, clip) => sum + Number(clip.analysis.score || 0), 0) /
        Math.max(1, clips.filter(clip => clip.analysis?.score != null).length)
      : 0;

    return {
      total: clips.length,
      analyzed,
      pending: clips.length - analyzed,
      average: average ? average.toFixed(1) : "—"
    };
  }, [clips]);

  function updateForm(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  async function saveClip(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.video_url.trim()) {
      setError("Titel och videolänk måste anges.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/video-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          match_id: form.match_id ? Number(form.match_id) : null,
          start_seconds: Number(form.start_seconds || 0),
          end_seconds: Number(form.end_seconds || 0)
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Klippet kunde inte sparas.");
      }

      setForm({
        match_id: "",
        title: "",
        video_url: "",
        start_seconds: 0,
        end_seconds: 15,
        period: "",
        game_clock: "",
        category: "Breakout",
        note: ""
      });

      await loadClips();
    } catch (err) {
      setError(err.message || "Klippet kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  async function analyzeClip(clipId) {
    setAnalyzingId(clipId);
    setError("");

    try {
      const response = await fetch("/api/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Klippet kunde inte analyseras.");
      }

      await loadClips();
    } catch (err) {
      setError(err.message || "Klippet kunde inte analyseras.");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function deleteClip(clipId) {
    if (!window.confirm("Ta bort videoklippet och dess analys?")) return;

    setError("");

    try {
      const response = await fetch(`/api/video-clips?id=${clipId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Klippet kunde inte tas bort.");
      }

      await loadClips();
    } catch (err) {
      setError(err.message || "Klippet kunde inte tas bort.");
    }
  }

  return (
    <Page kicker="AI Video Coach" title="Videoanalys">
      <div className="video-summary-grid">
        <article className="mini-card">
          <small>Klipp</small>
          <strong>{stats.total}</strong>
        </article>
        <article className="mini-card">
          <small>Analyserade</small>
          <strong>{stats.analyzed}</strong>
        </article>
        <article className="mini-card">
          <small>Väntar</small>
          <strong>{stats.pending}</strong>
        </article>
        <article className="mini-card">
          <small>Snittbetyg</small>
          <strong>{stats.average}</strong>
        </article>
      </div>

      {error && (
        <article className="notice">
          <b>Fel</b>
          <p>{error}</p>
        </article>
      )}

      <div className="video-layout">
        <form className="admin-form video-form" onSubmit={saveClip}>
          <div className="form-head">
            <div>
              <h2><Plus size={20} /> Lägg till klipp</h2>
              <p>Spara en länk och tidskod. AI analyserar anteckningen och matchkontexten.</p>
            </div>
          </div>

          <label>
            Match
            <select
              value={form.match_id}
              onChange={event => updateForm("match_id", event.target.value)}
            >
              <option value="">Ingen match</option>
              {matches.map(match => (
                <option key={match.id} value={match.id}>
                  {formatDate(match.game_date)} – {match.opponent}
                </option>
              ))}
            </select>
          </label>

          <label>
            Titel
            <input
              value={form.title}
              onChange={event => updateForm("title", event.target.value)}
              placeholder="Exempel: Breakout under press"
            />
          </label>

          <label>
            Videolänk
            <input
              value={form.video_url}
              onChange={event => updateForm("video_url", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="video-form-grid">
            <label>
              Start, sekunder
              <input
                type="number"
                min="0"
                value={form.start_seconds}
                onChange={event => updateForm("start_seconds", event.target.value)}
              />
            </label>

            <label>
              Slut, sekunder
              <input
                type="number"
                min="0"
                value={form.end_seconds}
                onChange={event => updateForm("end_seconds", event.target.value)}
              />
            </label>

            <label>
              Period
              <input
                value={form.period}
                onChange={event => updateForm("period", event.target.value)}
                placeholder="1"
              />
            </label>

            <label>
              Matchklocka
              <input
                value={form.game_clock}
                onChange={event => updateForm("game_clock", event.target.value)}
                placeholder="12:34"
              />
            </label>
          </div>

          <label>
            Kategori
            <select
              value={form.category}
              onChange={event => updateForm("category", event.target.value)}
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            Observation
            <textarea
              value={form.note}
              onChange={event => updateForm("note", event.target.value)}
              placeholder="Beskriv situationen: press, beslut, positionering, resultat..."
              rows="5"
            />
          </label>

          <button type="submit" disabled={saving || !user}>
            <Save size={16} />
            {saving ? "Sparar..." : user ? "Spara klipp" : "Logga in för att spara"}
          </button>
        </form>

        <section className="mc-section video-library">
          <div className="video-library-head">
            <div>
              <h2><Video /> Klippbibliotek</h2>
              <p>Filtrera och analysera sparade situationer.</p>
            </div>

            <button type="button" onClick={loadClips} disabled={loading}>
              <RefreshCw size={16} />
              {loading ? "Laddar..." : "Uppdatera"}
            </button>
          </div>

          <div className="video-filters">
            <label>
              <Filter size={15} /> Match
              <select value={matchFilter} onChange={e => setMatchFilter(e.target.value)}>
                <option value="">Alla matcher</option>
                {matches.map(match => (
                  <option key={match.id} value={match.id}>
                    {match.opponent}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <Filter size={15} /> Kategori
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">Alla kategorier</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="video-clips">
            {clips.length ? (
              clips.map(clip => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onAnalyze={analyzeClip}
                  onDelete={deleteClip}
                  analyzingId={analyzingId}
                />
              ))
            ) : (
              <article className="mini-card">
                <Play />
                <b>Inga videoklipp ännu</b>
                <p>Lägg till det första klippet med formuläret.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
