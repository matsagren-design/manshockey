import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ExternalLink,
  FileText,
  Filter,
  Globe2,
  Newspaper,
  RefreshCw,
  Search,
  ShieldX,
  Trash2,
  Video
} from "lucide-react";
import { Page } from "../components/Layout.jsx";

function formatDate(value) {
  if (!value) return "Datum saknas";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function SourceIcon({ type }) {
  if (type === "video") return <Video size={17} />;
  if (type === "article") return <Newspaper size={17} />;
  return <Globe2 size={17} />;
}

function StatusBadge({ status }) {
  const label = {
    new: "Ny",
    approved: "Godkänd",
    irrelevant: "Irrelevant"
  }[status] || status;

  return <span className={`mediawatch-status status-${status}`}>{label}</span>;
}

function MediaCard({
  item,
  onStatus,
  onDelete,
  onScrape,
  busyId
}) {
  return (
    <article className="mediawatch-card">
      <div className="mediawatch-card-head">
        <div className="mediawatch-source">
          <SourceIcon type={item.source_type} />
          <span>{item.source_name || "Okänd källa"}</span>
          <StatusBadge status={item.status} />
        </div>

        <span className="mediawatch-score">
          Relevans {item.relevance_score ?? 0}%
        </span>
      </div>

      <h3>{item.title}</h3>

      <p className="mediawatch-meta">
        {item.source_type || "web"} · {formatDate(item.published_at || item.created_at)}
      </p>

      {item.snippet && (
        <p className="mediawatch-snippet">
          {item.snippet.length > 800
            ? `${item.snippet.slice(0, 800)}…`
            : item.snippet}
        </p>
      )}

      <div className="mediawatch-actions">
        <a href={item.url} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Öppna original
        </a>

        <button
          type="button"
          onClick={() => onScrape(item)}
          disabled={busyId === item.id}
        >
          <FileText size={15} />
          {busyId === item.id ? "Läser..." : "Läs hela sidan"}
        </button>

        <button
          type="button"
          onClick={() => onStatus(item.id, "approved")}
        >
          <CheckCircle size={15} />
          Godkänn
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() => onStatus(item.id, "irrelevant")}
        >
          <ShieldX size={15} />
          Irrelevant
        </button>

        <button
          type="button"
          className="danger"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={15} />
          Ta bort
        </button>
      </div>
    </article>
  );
}

export function MediaWatch() {
  const [data, setData] = useState({
    items: [],
    summary: {}
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [cleaning, setCleaning] = useState(false);
const [lastCleanup, setLastCleanup] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [lastSearch, setLastSearch] = useState(null);

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      params.set("v", Date.now());

      const response = await fetch(`/api/media-watch?${params.toString()}`);
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Media Watch kunde inte laddas.");
      }

      setData(json);
    } catch (err) {
      setError(err.message || "Media Watch kunde inte laddas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [statusFilter, typeFilter]);

  async function runSearch() {
    setSearching(true);
    setError("");

    try {
      const response = await fetch("/api/media-watch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "search",
          include_content: false
        })
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Sökningen kunde inte genomföras.");
      }

      setLastSearch(json.search || null);
      setData(json);
    } catch (err) {
      setError(err.message || "Sökningen kunde inte genomföras.");
    } finally {
      setSearching(false);
    }
  }

  async function runCleanup() {
  const ok = window.confirm(
    "Räkna om relevansen för alla befintliga träffar? " +
    "Manuellt godkända träffar kommer inte att ändras."
  );

  if (!ok) return;

  setCleaning(true);
  setError("");

  try {
    const response = await fetch("/api/media-watch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "cleanup"
      })
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      throw new Error(
        json.error || "Cleanup kunde inte genomföras."
      );
    }

    setLastCleanup(json.cleanup || null);
    setData(json);
  } catch (err) {
    setError(
      err.message || "Cleanup kunde inte genomföras."
    );
  } finally {
    setCleaning(false);
  }
}async function updateStatus(id, status) {
    setError("");

    try {
      const response = await fetch("/api/media-watch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "status",
          id,
          status
        })
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Status kunde inte uppdateras.");
      }

      await loadItems();
    } catch (err) {
      setError(err.message || "Status kunde inte uppdateras.");
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Ta bort den här träffen?")) return;

    setError("");

    try {
      const response = await fetch(`/api/media-watch?id=${id}`, {
        method: "DELETE"
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Träffen kunde inte tas bort.");
      }

      await loadItems();
    } catch (err) {
      setError(err.message || "Träffen kunde inte tas bort.");
    }
  }

  async function scrapeItem(item) {
    setBusyId(item.id);
    setError("");

    try {
      const response = await fetch("/api/media-watch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "scrape",
          id: item.id,
          url: item.url
        })
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Sidan kunde inte läsas.");
      }

      await loadItems();
    } catch (err) {
      setError(err.message || "Sidan kunde inte läsas.");
    } finally {
      setBusyId(null);
    }
  }

  const summary = data.summary || {};
  const items = data.items || [];

  const visibleTypes = useMemo(() => {
    return [...new Set(items.map(item => item.source_type).filter(Boolean))];
  }, [items]);

  return (
    <Page
      kicker="Måns Media Watch"
      title="Mediebevakning"
      action={
        <button type="button" onClick={runSearch} disabled={searching}>
          <Search size={17} />
          {searching ? "Söker..." : "Sök nya träffar"}
        </button>
      }
    >
      {error && (
        <article className="notice">
          <b>Fel</b>
          <p>{error}</p>
        </article>
      )}

      <div className="mediawatch-summary">
        <article className="mini-card">
          <small>Totalt</small>
          <strong>{summary.total ?? 0}</strong>
        </article>

        <article className="mini-card">
          <small>Nya</small>
          <strong>{summary.newItems ?? 0}</strong>
        </article>

        <article className="mini-card">
          <small>Godkända</small>
          <strong>{summary.approved ?? 0}</strong>
        </article>

        <article className="mini-card">
          <small>Sociala</small>
          <strong>{summary.social ?? 0}</strong>
        </article>
      </div>

      {lastSearch && (
        <article className="mc-section mediawatch-search-result">
          <h2><Search /> Senaste sökning</h2>
          <p>
            Hittade {lastSearch.found ?? 0} träffar, varav{" "}
            {lastSearch.unique ?? 0} unika. Sparade{" "}
            {lastSearch.saved ?? 0}. Firecrawl-krediter:{" "}
            {lastSearch.creditsUsed ?? 0}.
          </p>
        </article>
      )}

      {lastCleanup && (
  <article className="mc-section mediawatch-search-result">
    <h2>
      <ShieldX /> Senaste rensning
    </h2>

    <p>
      Kontrollerade {lastCleanup.scanned ?? 0} träffar.{" "}
      Räknade om {lastCleanup.rescored ?? 0}.{" "}
      Flyttade {lastCleanup.autoIrrelevant ?? 0} till irrelevanta.{" "}
      Skyddade {lastCleanup.approvedProtected ?? 0} manuellt godkända.
    </p>
  </article>
)}<section className="mc-section">
        <div className="mediawatch-toolbar">
          <div>
            <h2><Newspaper /> Träffar</h2>
            <p>Artiklar, videor och offentligt indexerade sociala inlägg.</p>
          </div>

          <button
  type="button"
  onClick={runCleanup}
  disabled={cleaning || searching}
>
  <ShieldX size={16} />
  {cleaning ? "Rensar..." : "Rensa irrelevanta"}
</button><button type="button" onClick={loadItems} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? "Uppdaterar..." : "Uppdatera"}
          </button>
        </div>

        <div className="mediawatch-filters">
          <label>
            <Filter size={15} />
            Status
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="">Alla</option>
              <option value="new">Nya</option>
              <option value="approved">Godkända</option>
              <option value="irrelevant">Irrelevanta</option>
            </select>
          </label>

          <label>
            <Filter size={15} />
            Typ
            <select
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
            >
              <option value="">Alla typer</option>
              <option value="article">Artiklar</option>
              <option value="web">Webb</option>
              <option value="social">Sociala medier</option>
              <option value="video">Video</option>
              {visibleTypes
                .filter(type => !["article", "web", "social", "video"].includes(type))
                .map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mediawatch-list">
          {items.length ? (
            items.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onStatus={updateStatus}
                onDelete={deleteItem}
                onScrape={scrapeItem}
                busyId={busyId}
              />
            ))
          ) : (
            <article className="mini-card">
              <Search />
              <b>Inga träffar ännu</b>
              <p>Klicka på “Sök nya träffar” för att starta bevakningen.</p>
            </article>
          )}
        </div>
      </section>
    </Page>
  );
}
