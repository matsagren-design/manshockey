/*
 * MansHockey Enterprise 30
 * Media Intelligence
 * E30.8.7 Precision & Recency Engine
 */

const VERSION = "E30.8.7";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeUrl(value) {
  const raw = clean(value);
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const key of [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid"
    ]) {
      u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceType(url, fallback = "web") {
  const host = hostname(url).toLowerCase();

  if (
    host.includes("instagram.com") ||
    host.includes("facebook.com") ||
    host.includes("x.com") ||
    host.includes("twitter.com") ||
    host.includes("tiktok.com") ||
    host.includes("threads.net")
  ) return "social";

  if (
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("vimeo.com")
  ) return "video";

  if (
    host.includes("bchl.ca") ||
    host.includes("flohockey.tv") ||
    host.includes("eliteprospects.com") ||
    host.includes("thehockeynews.com") ||
    host.includes("dailyfaceoff.com") ||
    host.includes("hockeysverige.se")
  ) return "article";

  return fallback || "web";
}

const BLOCKED_HOSTS = [
  "myheritage.se",
  "myheritage.com",
  "ancestry.com",
  "ancestry.se",
  "geni.com",
  "geneanet.org",
  "familysearch.org"
];

const WRONG_PERSON_TERMS = [
  "släkthistoria", "slakthistoria", "släktforskning", "slaktforskning",
  "genealogy", "family tree", "historiska poster", "historical records",
  "föddes år", "foddes ar", "vigselplats", "pehrsdotter"
];

const HOCKEY_TERMS = [
  "hockey", "ice hockey", "bchl", "brooks bandits", "bandits",
  "defenceman", "defenseman", "defender", "roster", "lineup",
  "training camp", "camp", "preseason", "exhibition", "regular season",
  "transaction", "transactions", "signing", "signed", "commit",
  "preview", "game preview", "recap", "box score", "power play",
  "penalty kill", "goal", "assist", "points", "shift", "junior hockey",
  "eliteprospects", "flohockey"
];

const PLAYER_TERMS = [
  "måns ågren", "mans agren", "måns agren", "mans ågren"
];

const TEAM_TERMS = [
  "brooks bandits", "brooks bandit", "bandits"
];

const LEAGUE_TERMS = [
  "bchl", "british columbia hockey league"
];

function containsAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function recencyInfo(item) {
  const date = parseDate(item.published_at || item.publishedAt || item.date);
  if (!date) {
    return { label: "unknown", days: null, bonus: 0 };
  }

  const now = Date.now();
  const days = Math.max(0, Math.floor((now - date.getTime()) / 86400000));

  if (days <= 7) return { label: "fresh", days, bonus: 14 };
  if (days <= 30) return { label: "fresh", days, bonus: 10 };
  if (days <= 90) return { label: "recent", days, bonus: 5 };
  if (days <= 180) return { label: "recent", days, bonus: 1 };
  if (days <= 365) return { label: "archive", days, bonus: -6 };
  return { label: "archive", days, bonus: -12 };
}

function relevanceBreakdown(item) {
  const title = normalizeText(item.title);
  const snippet = normalizeText(item.snippet);
  const content = normalizeText(item.content);
  const query = normalizeText(item.search_query);
  const host = hostname(item.url).toLowerCase();
  const text = `${title} ${snippet} ${content} ${query} ${host}`;

  const player = containsAny(text, PLAYER_TERMS);
  const team = containsAny(text, TEAM_TERMS);
  const league = containsAny(text, LEAGUE_TERMS);
  const hockey = containsAny(text, HOCKEY_TERMS);

  const blockedHost = BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
  const wrongTerms = containsAny(text, WRONG_PERSON_TERMS);

  const reasons = [];
  let score = 0;
  let category = "other";
  let autoIrrelevant = false;

  if (blockedHost || wrongTerms) {
    score = 0;
    category = "wrong_person";
    autoIrrelevant = true;
    reasons.push(blockedHost ? "blocked genealogy source" : "wrong-person/genealogy terms");
    return {
      score,
      category,
      reasons,
      autoIrrelevant,
      recency: recencyInfo(item)
    };
  }

  // Måns is the primary signal.
  if (player) {
    category = "player";
    score = 78;
    reasons.push("Måns Ågren");
    if (hockey) {
      score += 12;
      reasons.push("hockey context");
    }
    if (team) {
      score += 7;
      reasons.push("Brooks Bandits");
    }
    if (league) {
      score += 3;
      reasons.push("BCHL");
    }
  } else if (team) {
    category = "team";
    score = 62;
    reasons.push("Brooks Bandits");
    if (league) {
      score += 6;
      reasons.push("BCHL");
    }
    if (hockey) {
      score += 4;
      reasons.push("hockey context");
    }
  } else if (league) {
    category = "league";
    score = 50;
    reasons.push("BCHL");
    if (hockey) {
      score += 4;
      reasons.push("hockey context");
    }
  } else if (hockey) {
    category = "hockey";
    score = 42;
    reasons.push("general hockey");
  }

  // Strong title weighting.
  if (containsAny(title, PLAYER_TERMS)) {
    score += 8;
    reasons.push("Måns in title");
  } else if (containsAny(title, TEAM_TERMS)) {
    score += 4;
    reasons.push("Brooks in title");
  }

  // Trusted hockey sources get a small boost, never enough to turn irrelevant content relevant.
  if (
    host.includes("bchl.ca") ||
    host.includes("brooksbandits.ca") ||
    host.includes("eliteprospects.com") ||
    host.includes("flohockey.tv")
  ) {
    score += 3;
    reasons.push("trusted hockey source");
  }

  const recency = recencyInfo(item);
  score += recency.bonus;
  if (recency.label !== "unknown") {
    reasons.push(`recency:${recency.label}`);
  }

  // General Brooks/BCHL archive material should not outrank current Måns material.
  if (!player && recency.label === "archive") {
    score -= 5;
    reasons.push("old non-player item");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 45) autoIrrelevant = true;

  return {
    score,
    category,
    reasons,
    autoIrrelevant,
    recency
  };
}

function relevance(item) {
  return relevanceBreakdown(item).score;
}

async function firecrawlSearch(apiKey, query, includeContent = false) {
  const body = {
    query,
    limit: 10,
    sources: [{ type: "web" }, { type: "news" }],
    country: "SE",
    location: "Sweden",
    timeout: 60000,
    ignoreInvalidURLs: true
  };

  if (includeContent) {
    body.scrapeOptions = {
      formats: [{ type: "markdown" }],
      onlyMainContent: true
    };
  }

  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Firecrawl Search svarade med ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Firecrawl Search misslyckades.");

  const web = (data.data?.web || []).map(item => ({
    title: clean(item.title || item.metadata?.title || "Namnlös träff"),
    snippet: clean(item.description || item.metadata?.description || item.markdown?.slice(0, 700) || ""),
    content: clean(item.markdown || ""),
    url: normalizeUrl(item.url || item.metadata?.sourceURL || item.metadata?.url || ""),
    source_name: hostname(item.url || item.metadata?.sourceURL || ""),
    source_type: sourceType(item.url || item.metadata?.sourceURL || "", "web"),
    published_at: clean(item.metadata?.publishedTime || item.metadata?.modifiedTime || "") || null,
    search_query: query
  }));

  const news = (data.data?.news || []).map(item => ({
    title: clean(item.title || item.metadata?.title || "Namnlös träff"),
    snippet: clean(item.snippet || item.metadata?.description || item.markdown?.slice(0, 700) || ""),
    content: clean(item.markdown || ""),
    url: normalizeUrl(item.url || item.metadata?.sourceURL || item.metadata?.url || ""),
    source_name: hostname(item.url || item.metadata?.sourceURL || ""),
    source_type: sourceType(item.url || item.metadata?.sourceURL || "", "news"),
    published_at: clean(item.date || item.metadata?.publishedTime || "") || null,
    search_query: query
  }));

  return {
    results: [...news, ...web],
    creditsUsed: Number(data.creditsUsed || 0),
    warning: data.warning || null
  };
}

async function firecrawlScrape(apiKey, url) {
  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url,
      formats: [{ type: "markdown" }],
      onlyMainContent: true,
      timeout: 60000
    })
  });

  if (!response.ok) {
    throw new Error(`Firecrawl Scrape svarade med ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Firecrawl Scrape misslyckades.");

  return {
    markdown: clean(data.data?.markdown || ""),
    metadata: data.data?.metadata || {}
  };
}

async function upsertItem(db, item) {
  const rel = relevanceBreakdown(item);

  // Block known wrong-person sources before D1.
  if (
    !item.url ||
    !item.title ||
    rel.category === "wrong_person" ||
    rel.autoIrrelevant ||
    rel.score < 50
  ) return false;

  const result = await db.prepare(`
    INSERT INTO mans_media_watch (
      external_id, title, source_name, source_type, url, published_at,
      snippet, search_query, relevance_score, status, updated_at
    )
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      source_name = excluded.source_name,
      source_type = excluded.source_type,
      published_at = COALESCE(excluded.published_at, mans_media_watch.published_at),
      snippet = excluded.snippet,
      search_query = excluded.search_query,
      relevance_score =
        CASE WHEN mans_media_watch.status = 'approved'
          THEN mans_media_watch.relevance_score
          ELSE excluded.relevance_score
        END,
      status =
        CASE WHEN mans_media_watch.status = 'approved'
          THEN 'approved'
          ELSE mans_media_watch.status
        END,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    item.title,
    item.source_name || "",
    item.source_type || "web",
    item.url,
    item.published_at || null,
    item.snippet || "",
    item.search_query || "",
    rel.score
  ).run();

  return Number(result.meta?.changes || 0) > 0;
}

async function cleanupExisting(db) {
  const rows = (await db.prepare(`
    SELECT id, title, source_name, source_type, url, published_at,
           snippet, search_query, relevance_score, status
    FROM mans_media_watch
    ORDER BY id
  `).all()).results || [];

  let scanned = 0;
  let rescored = 0;
  let autoIrrelevant = 0;
  let approvedProtected = 0;
  let unchanged = 0;
  const examples = [];

  for (const row of rows) {
    scanned += 1;

    if (row.status === "approved") {
      approvedProtected += 1;
      continue;
    }

    const rel = relevanceBreakdown(row);
    let nextStatus = row.status;

    if (rel.autoIrrelevant || rel.category === "wrong_person") {
      nextStatus = "irrelevant";
    }

    const oldScore = Number(row.relevance_score || 0);
    const scoreChanged = oldScore !== rel.score;
    const statusChanged = String(row.status || "") !== String(nextStatus || "");

    if (!scoreChanged && !statusChanged) {
      unchanged += 1;
      continue;
    }

    await db.prepare(`
      UPDATE mans_media_watch
      SET relevance_score = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(rel.score, nextStatus, row.id).run();

    if (scoreChanged) rescored += 1;
    if (statusChanged && nextStatus === "irrelevant") autoIrrelevant += 1;

    if (examples.length < 20) {
      examples.push({
        id: row.id,
        title: row.title,
        old_score: oldScore,
        new_score: rel.score,
        old_status: row.status,
        new_status: nextStatus,
        category: rel.category,
        recency: rel.recency,
        reasons: rel.reasons
      });
    }
  }

  return {
    scanned,
    rescored,
    autoIrrelevant,
    approvedProtected,
    unchanged,
    examples
  };
}

async function listItems(db, url) {
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const category = clean(url.searchParams.get("category"));
  const freshness = clean(url.searchParams.get("freshness"));

  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") || 100))
  );

  const conditions = [];
  const values = [];

  if (status) {
    conditions.push("status = ?");
    values.push(status);
  }

  if (type) {
    conditions.push("source_type = ?");
    values.push(type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const statement = db.prepare(`
    SELECT *
    FROM mans_media_watch
    ${where}
    ORDER BY
      CASE status
        WHEN 'new' THEN 0
        WHEN 'approved' THEN 1
        WHEN 'irrelevant' THEN 2
        ELSE 3
      END,
      relevance_score DESC,
      COALESCE(published_at, created_at) DESC,
      id DESC
    LIMIT ?
  `);

  const result = values.length
    ? await statement.bind(...values, limit).all()
    : await statement.bind(limit).all();

  const classifiedItems = (result.results || []).map(item => {
    const intelligence = relevanceBreakdown(item);
    return {
      ...item,
      intelligence_category: intelligence.category,
      intelligence_reasons: intelligence.reasons,
      auto_irrelevant: intelligence.autoIrrelevant,
      freshness: intelligence.recency.label,
      age_days: intelligence.recency.days,
      calculated_relevance: intelligence.score
    };
  });

  const filteredItems = classifiedItems.filter(item => {
    if (category && item.intelligence_category !== category) return false;
    if (freshness && item.freshness !== freshness) return false;
    return true;
  });

  const intelligenceSummary = classifiedItems.reduce((acc, item) => {
    const key = item.intelligence_category || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {
    player: 0,
    team: 0,
    league: 0,
    hockey: 0,
    wrong_person: 0,
    other: 0
  });

  const freshnessSummary = classifiedItems.reduce((acc, item) => {
    const key = item.freshness || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {
    fresh: 0,
    recent: 0,
    archive: 0,
    unknown: 0
  });

  const summary = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_items,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'irrelevant' THEN 1 ELSE 0 END) AS irrelevant,
      SUM(CASE WHEN source_type = 'article' THEN 1 ELSE 0 END) AS articles,
      SUM(CASE WHEN source_type = 'social' THEN 1 ELSE 0 END) AS social,
      SUM(CASE WHEN source_type = 'video' THEN 1 ELSE 0 END) AS videos
    FROM mans_media_watch
  `).first();

  return {
    items: filteredItems,
    intelligenceSummary,
    freshnessSummary,
    summary: {
      total: Number(summary?.total || 0),
      newItems: Number(summary?.new_items || 0),
      approved: Number(summary?.approved || 0),
      irrelevant: Number(summary?.irrelevant || 0),
      articles: Number(summary?.articles || 0),
      social: Number(summary?.social || 0),
      videos: Number(summary?.videos || 0)
    }
  };
}

async function runSearch(db, apiKey, customQueries, includeContent) {
  const queries = customQueries.length
    ? customQueries
    : [
        '"Måns Ågren" hockey',
        '"Mans Agren" hockey',
        '"Måns Ågren" "Brooks Bandits"',
        '"Mans Agren" "Brooks Bandits"',
        '"Måns Ågren" BCHL',
        '"Mans Agren" BCHL',
        '"Måns Ågren" roster OR lineup OR camp OR transaction OR signing',
        '"Mans Agren" roster OR lineup OR camp OR transaction OR signing',
        '"Brooks Bandits" roster OR lineup OR camp OR preseason',
        '"Brooks Bandits" BCHL preview OR recap OR transaction'
      ];

  const found = [];
  const errors = [];
  let creditsUsed = 0;

  for (const query of queries.slice(0, 10)) {
    try {
      const response = await firecrawlSearch(apiKey, query, includeContent);
      found.push(...response.results);
      creditsUsed += response.creditsUsed;
    } catch (error) {
      errors.push({ query, error: error.message });
    }
  }

  const unique = new Map();

  for (const item of found) {
    if (!item.url) continue;

    const host = hostname(item.url).toLowerCase();
    if (BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
      continue;
    }

    const previous = unique.get(item.url);
    if (!previous || relevance(item) > relevance(previous)) {
      unique.set(item.url, item);
    }
  }

  let saved = 0;
  let playerHits = 0;
  let teamHits = 0;
  let leagueHits = 0;
  let hockeyHits = 0;
  let rejected = 0;
  let wrongPerson = 0;

  const acceptedExamples = [];
  const rejectedExamples = [];

  for (const item of unique.values()) {
    const rel = relevanceBreakdown(item);

    if (rel.category === "wrong_person") {
      wrongPerson += 1;
      rejected += 1;
      if (rejectedExamples.length < 15) {
        rejectedExamples.push({
          title: item.title,
          url: item.url,
          score: rel.score,
          category: rel.category,
          recency: rel.recency,
          reasons: rel.reasons
        });
      }
      continue;
    }

    if (rel.score < 50 || rel.autoIrrelevant) {
      rejected += 1;
      if (rejectedExamples.length < 15) {
        rejectedExamples.push({
          title: item.title,
          url: item.url,
          score: rel.score,
          category: rel.category,
          recency: rel.recency,
          reasons: rel.reasons
        });
      }
      continue;
    }

    if (rel.category === "player") playerHits += 1;
    if (rel.category === "team") teamHits += 1;
    if (rel.category === "league") leagueHits += 1;
    if (rel.category === "hockey") hockeyHits += 1;

    if (acceptedExamples.length < 15) {
      acceptedExamples.push({
        title: item.title,
        url: item.url,
        score: rel.score,
        category: rel.category,
        recency: rel.recency,
        reasons: rel.reasons
      });
    }

    if (await upsertItem(db, item)) saved += 1;
  }

  return {
    version: VERSION,
    queries,
    found: found.length,
    unique: unique.size,
    saved,
    playerHits,
    teamHits,
    leagueHits,
    hockeyHits,
    wrongPerson,
    rejected,
    creditsUsed,
    errors,
    acceptedExamples,
    rejectedExamples
  };
}

export async function onRequest(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({
        ok: false,
        module: "MansMediaWatch",
        version: VERSION,
        error: "Ingen databasanslutning."
      }, 500);
    }

    const request = context.request;
    const url = new URL(request.url);

    if (request.method === "GET") {
      return json({
        ok: true,
        module: "MansMediaWatch",
        version: VERSION,
        ...(await listItems(db, url)),
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const action = body.action || "search";

      if (action === "cleanup") {
        const cleanup = await cleanupExisting(db);

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: VERSION,
          action: "cleanup",
          cleanup,
          ...(await listItems(db, url)),
          timestamp: new Date().toISOString()
        });
      }

      if (action === "search") {
        if (!context.env.FIRECRAWL_API_KEY) {
          return json({
            ok: false,
            module: "MansMediaWatch",
            version: VERSION,
            error: "FIRECRAWL_API_KEY saknas i Cloudflare Secrets."
          }, 500);
        }

        const customQueries = Array.isArray(body.queries)
          ? body.queries.map(clean).filter(Boolean)
          : [];

        const search = await runSearch(
          db,
          context.env.FIRECRAWL_API_KEY,
          customQueries,
          Boolean(body.include_content)
        );

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: VERSION,
          action: "search",
          search,
          ...(await listItems(db, url)),
          timestamp: new Date().toISOString()
        });
      }

      if (action === "scrape") {
        if (!context.env.FIRECRAWL_API_KEY) {
          return json({
            ok: false,
            module: "MansMediaWatch",
            version: VERSION,
            error: "FIRECRAWL_API_KEY saknas i Cloudflare Secrets."
          }, 500);
        }

        const id = Number(body.id);
        const targetUrl = clean(body.url);

        if (!id || !targetUrl) {
          return json({ ok: false, error: "Id och URL krävs." }, 400);
        }

        const scraped = await firecrawlScrape(
          context.env.FIRECRAWL_API_KEY,
          targetUrl
        );

        const snippet = scraped.markdown.slice(0, 5000);

        await db.prepare(`
          UPDATE mans_media_watch
          SET
            snippet = ?,
            source_name = COALESCE(NULLIF(source_name, ''), ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(snippet, hostname(targetUrl), id).run();

        const refreshed = await db.prepare(`
          SELECT id, title, source_name, source_type, url, published_at,
                 snippet, search_query, relevance_score, status
          FROM mans_media_watch
          WHERE id = ?
          LIMIT 1
        `).bind(id).first();

        let relevanceAfterScrape = null;

        if (refreshed) {
          const rel = relevanceBreakdown(refreshed);

          relevanceAfterScrape = {
            score: rel.score,
            category: rel.category,
            reasons: rel.reasons,
            autoIrrelevant: rel.autoIrrelevant,
            recency: rel.recency
          };

          if (refreshed.status !== "approved") {
            const nextStatus = rel.autoIrrelevant ? "irrelevant" : refreshed.status;

            await db.prepare(`
              UPDATE mans_media_watch
              SET relevance_score = ?, status = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(rel.score, nextStatus, id).run();
          }
        }

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: VERSION,
          action: "scrape",
          id,
          chars: scraped.markdown.length,
          relevance: relevanceAfterScrape,
          content: scraped.markdown
        });
      }

      if (action === "status") {
        const id = Number(body.id);
        const status = clean(body.status);

        if (!id || !["new", "approved", "irrelevant"].includes(status)) {
          return json({
            ok: false,
            error: "Ogiltigt id eller status."
          }, 400);
        }

        await db.prepare(`
          UPDATE mans_media_watch
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(status, id).run();

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: VERSION,
          action: "status",
          id,
          status
        });
      }

      return json({
        ok: false,
        module: "MansMediaWatch",
        version: VERSION,
        error: "Okänd action."
      }, 400);
    }

    if (request.method === "DELETE") {
      const id = Number(url.searchParams.get("id"));

      if (!id) {
        return json({
          ok: false,
          error: "Träff-id saknas."
        }, 400);
      }

      await db.prepare(`
        DELETE FROM mans_media_watch
        WHERE id = ?
      `).bind(id).run();

      return json({
        ok: true,
        module: "MansMediaWatch",
        version: VERSION,
        deleted: true,
        id
      });
    }

    return json({
      ok: false,
      module: "MansMediaWatch",
      version: VERSION,
      error: "Method not allowed"
    }, 405);

  } catch (error) {
    return json({
      ok: false,
      module: "MansMediaWatch",
      version: VERSION,
      error: error.message
    }, 500);
  }
}
