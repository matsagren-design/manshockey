/*
 * MansHockey Enterprise 30
 * Media Intelligence
 * E30.9.6 Temporal Classification Fix
 */

const VERSION = "E30.9.6";

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
    host.includes("brooksbandits.ca") ||
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

const PLAYER_TERMS = [
  "måns ågren", "mans agren", "måns agren", "mans ågren"
];

const TEAM_TERMS = [
  "brooks bandits", "brooks bandit", "bandits"
];

const LEAGUE_TERMS = [
  "bchl", "british columbia hockey league"
];

const HOCKEY_TERMS = [
  "hockey", "ice hockey", "defenceman", "defenseman", "defender",
  "roster", "lineup", "training camp", "camp", "preseason", "exhibition",
  "regular season", "transaction", "transactions", "signing", "signed",
  "commit", "preview", "game preview", "recap", "box score", "power play",
  "penalty kill", "goal", "assist", "points", "shift", "junior hockey",
  "eliteprospects", "flohockey"
];

const STRONG_PLAYER_CONTEXT = [
  "defenceman", "defenseman", "defender", "back", "roster", "lineup",
  "brooks bandits", "bchl", "eliteprospects", "flohockey", "bjorkloven",
  "björklöven", "boden", "u20", "j20"
];

const CURRENT_CONTEXT_TERMS = [
  "2026", "2026-27", "2026/27", "26/27",
  "brooks bandits", "bchl", "training camp", "preseason", "exhibition",
  "roster", "lineup", "transaction", "signing", "signed", "season",
  "game", "match", "preview", "recap"
];

const HISTORICAL_CONTEXT_TERMS = [
  "2025", "2024", "2023", "2022", "2021", "2020",
  "former", "where are they now", "previous season", "historical"
];

function containsAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}

function countAny(text, terms) {
  let count = 0;
  for (const term of terms) {
    if (text.includes(normalizeText(term))) count += 1;
  }
  return count;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function recencyInfo(item) {
  const date = parseDate(item.published_at || item.publishedAt || item.date);
  if (!date) return { label: "unknown", days: null, bonus: 0, tier: "unknown" };

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));

  if (days <= 7) return { label: "fresh", days, bonus: 14, tier: "now" };
  if (days <= 30) return { label: "fresh", days, bonus: 10, tier: "month" };
  if (days <= 90) return { label: "recent", days, bonus: 5, tier: "quarter" };
  if (days <= 180) return { label: "recent", days, bonus: 0, tier: "season" };
  if (days <= 365) return { label: "archive", days, bonus: -10, tier: "archive" };
  return { label: "archive", days, bonus: -18, tier: "archive" };
}

function verifiedIdentity(item) {
  const title = normalizeText(item.title);
  const snippet = normalizeText(item.snippet);
  const content = normalizeText(item.content);

  // IMPORTANT:
  // search_query is deliberately NOT used as identity evidence.
  const actualText = `${title} ${snippet} ${content}`.trim();

  const playerInTitle = containsAny(title, PLAYER_TERMS);
  const playerInSnippet = containsAny(snippet, PLAYER_TERMS);
  const playerInContent = containsAny(content, PLAYER_TERMS);
  const playerAnywhere = playerInTitle || playerInSnippet || playerInContent;

  const team = containsAny(actualText, TEAM_TERMS);
  const league = containsAny(actualText, LEAGUE_TERMS);
  const hockey = containsAny(actualText, HOCKEY_TERMS);
  const strongContextHits = countAny(actualText, STRONG_PLAYER_CONTEXT);

  let level = "none";

  if (playerInTitle) {
    level = "verified";
  } else if (playerInContent && strongContextHits >= 1) {
    level = "verified";
  } else if (playerInSnippet && strongContextHits >= 2) {
    level = "probable";
  } else if (playerAnywhere && strongContextHits >= 1) {
    level = "probable";
  }

  return {
    level,
    playerInTitle,
    playerInSnippet,
    playerInContent,
    playerAnywhere,
    team,
    league,
    hockey,
    strongContextHits
  };
}

function relevanceBreakdown(item) {
  const title = normalizeText(item.title);
  const snippet = normalizeText(item.snippet);
  const content = normalizeText(item.content);
  const actualText = `${title} ${snippet} ${content}`.trim();

  const host = hostname(item.url).toLowerCase();
  const identity = verifiedIdentity(item);
  const recency = recencyInfo(item);
  const reasons = [];

  const blockedHost = BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
  const wrongTerms = containsAny(actualText, WRONG_PERSON_TERMS);

  if (blockedHost || wrongTerms) {
    return {
      score: 0,
      category: "wrong_person",
      identity_level: "none",
      reasons: [blockedHost ? "blocked genealogy source" : "wrong-person/genealogy terms"],
      autoIrrelevant: true,
      recency
    };
  }

  let score = 0;
  let category = "other";
  let autoIrrelevant = false;

  if (identity.level === "verified") {
    category = "player";
    score = 84;
    reasons.push("verified Måns identity");

    if (identity.playerInTitle) {
      score += 8;
      reasons.push("Måns in title");
    }

    if (identity.team) {
      score += 5;
      reasons.push("Brooks context");
    }

    if (identity.league) {
      score += 2;
      reasons.push("BCHL context");
    }
  } else if (identity.level === "probable") {
    category = "player";
    score = 66;
    reasons.push("probable Måns identity");

    if (identity.team) score += 5;
    if (identity.league) score += 2;
  } else if (identity.team) {
    category = "team";
    score = 56;
    reasons.push("Brooks Bandits");
    if (identity.league) score += 4;
    if (identity.hockey) score += 3;
  } else if (identity.league) {
    category = "league";
    score = 44;
    reasons.push("BCHL");
    if (identity.hockey) score += 2;
  } else if (identity.hockey) {
    category = "hockey";
    score = 34;
    reasons.push("general hockey");
  }

  if (
    host.includes("bchl.ca") ||
    host.includes("brooksbandits.ca") ||
    host.includes("eliteprospects.com") ||
    host.includes("flohockey.tv")
  ) {
    score += 3;
    reasons.push("trusted hockey source");
  }

  score += recency.bonus;
  if (recency.label !== "unknown") reasons.push(`recency:${recency.label}`);

  if (category !== "player" && recency.label === "archive") {
    score -= 6;
    reasons.push("old non-player item");
  }

  // Social snippets are noisy. A social item cannot be "verified Måns" unless
  // the name is in the title or in scraped page content.
  if (
    item.source_type === "social" &&
    category === "player" &&
    identity.level === "verified" &&
    !identity.playerInTitle &&
    !identity.playerInContent
  ) {
    score = Math.min(score, 72);
    reasons.push("social snippet cap");
  }

  // Probable social items are capped harder.
  if (
    item.source_type === "social" &&
    category === "player" &&
    identity.level === "probable"
  ) {
    score = Math.min(score, 64);
    reasons.push("probable social cap");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 45) autoIrrelevant = true;

  // E30.8.9: stale generic team/league/hockey hits should not crowd the inbox.
  // Player hits are deliberately retained more generously for Måns' own history.
  if (
    category !== "player" &&
    recency.days !== null &&
    recency.days > 365 &&
    score < 60
  ) {
    autoIrrelevant = true;
    reasons.push("stale generic hit");
  }

  return {
    score,
    category,
    identity_level: identity.level,
    reasons,
    autoIrrelevant,
    recency
  };
}



function seasonContext(item) {
  const title = normalizeText(item.title);
  const snippet = normalizeText(item.snippet);
  const content = normalizeText(item.content);
  const text = `${title} ${snippet} ${content}`.trim();
  const published = parseDate(item.published_at || item.publishedAt || item.date);
  const now = new Date();

  const currentSeasonPatterns = [
    /\b2026[\s/–-]*27\b/,
    /\b26[\s/–-]*27\b/,
    /\b2026\b/
  ];

  const oldSeasonPatterns = [
    /\b2025[\s/–-]*26\b/,
    /\b2024[\s/–-]*25\b/,
    /\b2023[\s/–-]*24\b/,
    /\b2022[\s/–-]*23\b/,
    /\b2021[\s/–-]*22\b/,
    /\b2020[\s/–-]*21\b/
  ];

  const explicitOldClubTerms = [
    "bjorkloven", "björklöven", "boden", "bodens hf",
    "lulea hf", "luleå hf", "pitea hc", "piteå hc",
    "u16", "j20 2024", "j20 2025", "where are they now", "former"
  ];

  const futureSignalTerms = [
    "2026-27", "2026/27", "26-27", "26/27", "training camp", "camp",
    "preseason", "exhibition", "season opener", "opening night",
    "roster", "lineup", "signed", "signing", "transaction", "tender"
  ];

  const currentSeason = currentSeasonPatterns.some(re => re.test(text));
  const oldSeason = oldSeasonPatterns.some(re => re.test(text));
  const oldClubHits = countAny(text, explicitOldClubTerms);
  const futureSignalHits = countAny(text, futureSignalTerms);

  let publishedAgeDays = null;
  let publishedYear = null;
  if (published) {
    publishedAgeDays = Math.max(0, Math.floor((now.getTime() - published.getTime()) / 86400000));
    publishedYear = published.getUTCFullYear();
  }

  // Current-season evidence wins over generic historical wording.
  // Old-club references are historical only when there is no explicit 2026/27 signal.
  const historicalByText =
    !currentSeason &&
    (oldSeason || oldClubHits >= 1);

  let temporalClass = "unknown";
  if (currentSeason || futureSignalHits >= 1) temporalClass = "current";
  else if (historicalByText) temporalClass = "history";
  else if (publishedAgeDays !== null && publishedAgeDays <= 120) temporalClass = "recent";
  else if (publishedAgeDays !== null && publishedAgeDays > 365) temporalClass = "archive";
  else if (publishedAgeDays !== null) temporalClass = "background";

  return {
    currentSeason,
    oldSeason,
    oldClubHits,
    futureSignalHits,
    historicalByText,
    publishedAgeDays,
    publishedYear,
    temporalClass
  };
}

function smartBucket(item) {
  const rel = relevanceBreakdown(item);
  const title = normalizeText(item.title);
  const snippet = normalizeText(item.snippet);
  const content = normalizeText(item.content);
  // Search queries describe what we asked the search engine for, not what the result is about.
  // Never use search_query as evidence when deciding Current / History / Background.
  const text = `${title} ${snippet} ${content}`.trim();
  const age = rel.recency?.days;
  const season = seasonContext(item);

  if (rel.category === "wrong_person" || rel.autoIrrelevant) {
    return { bucket:"irrelevant", status:"irrelevant", reason:"identity-filter" };
  }

  const explicitCurrentSignals = [
    "2026-27","2026/27","26-27","26/27",
    "training camp","camp","preseason","exhibition",
    "season opener","opening night","lineup","roster move","roster update",
    "signed","signing","commit","committed","tender",
    "transaction","transactions","trade","traded",
    "game preview","match preview","recap","game recap"
  ];

  const staticReferenceTerms = [
    "roster, news, stats","stats & more","tag:","all-time","archive",
    "player profile","career stats","transactions today","latest trades & signings",
    "videos","best goals","where are they now","previous season"
  ];

  const currentHits = countAny(text, explicitCurrentSignals);
  const staticHits = countAny(text, staticReferenceTerms);

  // Explicit old season / old club context leaves Current immediately.
  if (season.historicalByText) {
    if (rel.category === "player") {
      return { bucket:"history", status:"history", reason:"historical-player-context" };
    }
    return { bucket:"background", status:"background", reason:"historical-nonplayer-context" };
  }

  // Static profile/reference pages never belong in Current unless there is a clear 2026/27 signal.
  if (staticHits >= 1 && !season.currentSeason && currentHits === 0) {
    if (rel.category === "player") {
      return { bucket:"history", status:"history", reason:"static-player-reference" };
    }
    return { bucket:"background", status:"background", reason:"static-reference-page" };
  }

  if (rel.category === "player") {
    // Current Måns item must have explicit current-season evidence OR be genuinely fresh and strong.
    if (
      season.currentSeason ||
      currentHits >= 1 ||
      (age !== null && age <= 45 && rel.score >= 78)
    ) {
      return { bucket:"current", status:"new", reason:"strict-current-player" };
    }

    return { bucket:"history", status:"history", reason:"player-history" };
  }

  if (rel.category === "team") {
    // Brooks items require a current-season signal. Generic team pages go to Background.
    if (
      season.currentSeason ||
      (age !== null && age <= 30 && currentHits >= 1)
    ) {
      return { bucket:"current", status:"new", reason:"strict-current-team" };
    }

    return { bucket:"background", status:"background", reason:"team-background" };
  }

  if (rel.category === "league") {
    // BCHL only enters Current when very fresh and clearly tied to a current signal.
    if (
      age !== null &&
      age <= 21 &&
      currentHits >= 1
    ) {
      return { bucket:"current", status:"new", reason:"fresh-current-league" };
    }

    return { bucket:"background", status:"background", reason:"league-background" };
  }

  if (rel.category === "hockey") {
    // General hockey should almost never occupy the Smart Inbox.
    if (
      age !== null &&
      age <= 7 &&
      currentHits >= 2 &&
      rel.score >= 55
    ) {
      return { bucket:"current", status:"new", reason:"exceptional-fresh-hockey" };
    }

    return { bucket:"background", status:"background", reason:"general-hockey-background" };
  }

  return { bucket:"irrelevant", status:"irrelevant", reason:"outside-current-scope" };
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
  const smart = smartBucket(item);

  if (
    !item.url ||
    !item.title ||
    rel.category === "wrong_person" ||
    rel.score < 35
  ) return false;

  const result = await db.prepare(`
    INSERT INTO mans_media_watch (
      external_id, title, source_name, source_type, url, published_at,
      snippet, search_query, relevance_score, status, updated_at
    )
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      source_name = excluded.source_name,
      source_type = excluded.source_type,
      published_at = COALESCE(excluded.published_at, mans_media_watch.published_at),
      snippet = excluded.snippet,
      search_query = excluded.search_query,
      relevance_score =
        CASE
          WHEN mans_media_watch.status = 'approved'
            THEN mans_media_watch.relevance_score
          ELSE excluded.relevance_score
        END,
      status =
        CASE
          WHEN mans_media_watch.status = 'approved'
            THEN 'approved'
          WHEN mans_media_watch.status = 'irrelevant'
            THEN 'irrelevant'
          ELSE excluded.status
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
    rel.score,
    smart.status
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
  let movedToHistory = 0;
  let movedToBackground = 0;
  let movedToInbox = 0;
  let approvedProtected = 0;
  let unchanged = 0;
  const examples = [];

  for (const row of rows) {
    scanned += 1;

    if (row.status === "approved") {
      approvedProtected += 1;
      continue;
    }

    // Respect a manual irrelevant decision: cleanup never resurrects it.
    if (row.status === "irrelevant") {
      unchanged += 1;
      continue;
    }

    const rel = relevanceBreakdown(row);
    const smart = smartBucket(row);

    const nextStatus = smart.status;
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
    if (statusChanged && nextStatus === "history") movedToHistory += 1;
    if (statusChanged && nextStatus === "background") movedToBackground += 1;
    if (statusChanged && nextStatus === "new") movedToInbox += 1;

    if (examples.length < 30) {
      examples.push({
        id: row.id,
        title: row.title,
        old_score: oldScore,
        new_score: rel.score,
        old_status: row.status,
        new_status: nextStatus,
        smart_bucket: smart.bucket,
        smart_reason: smart.reason,
        category: rel.category,
        identity_level: rel.identity_level,
        recency: rel.recency,
        reasons: rel.reasons
      });
    }
  }

  return {
    scanned,
    rescored,
    autoIrrelevant,
    movedToHistory,
    movedToBackground,
    movedToInbox,
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
    const smart = smartBucket(item);

    return {
      ...item,
      intelligence_category: intelligence.category,
      identity_level: intelligence.identity_level,
      intelligence_reasons: intelligence.reasons,
      auto_irrelevant: intelligence.autoIrrelevant,
      freshness: intelligence.recency.label,
      age_days: intelligence.recency.days,
      calculated_relevance: intelligence.score,
      smart_bucket: smart.bucket,
      smart_reason: smart.reason,
      season_context: seasonContext(item)
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

  const identitySummary = classifiedItems.reduce((acc, item) => {
    const key = item.identity_level || "none";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {
    verified: 0,
    probable: 0,
    none: 0
  });

  const smartSummary = classifiedItems.reduce((acc, item) => {
    const key = item.smart_bucket || "background";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {
    current: 0,
    history: 0,
    background: 0,
    irrelevant: 0
  });

  const temporalSummary = classifiedItems.reduce((acc, item) => {
    const key = item.season_context?.temporalClass || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {
    current: 0,
    recent: 0,
    history: 0,
    archive: 0,
    background: 0,
    unknown: 0
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
      SUM(CASE WHEN status = 'history' THEN 1 ELSE 0 END) AS history,
      SUM(CASE WHEN status = 'background' THEN 1 ELSE 0 END) AS background,
      SUM(CASE WHEN source_type = 'article' THEN 1 ELSE 0 END) AS articles,
      SUM(CASE WHEN source_type = 'social' THEN 1 ELSE 0 END) AS social,
      SUM(CASE WHEN source_type = 'video' THEN 1 ELSE 0 END) AS videos
    FROM mans_media_watch
  `).first();

  return {
    items: filteredItems,
    intelligenceSummary,
    identitySummary,
    smartSummary,
    temporalSummary,
    freshnessSummary,
    summary: {
      total: Number(summary?.total || 0),
      newItems: Number(summary?.new_items || 0),
      approved: Number(summary?.approved || 0),
      irrelevant: Number(summary?.irrelevant || 0),
      history: Number(summary?.history || 0),
      background: Number(summary?.background || 0),
      smartInbox: Number(summary?.new_items || 0),
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
        '"Måns Ågren" roster lineup camp transaction signing 2026',
        '"Mans Agren" roster lineup camp transaction signing 2026',
        '"Brooks Bandits" roster lineup camp preseason 2026',
        '"Brooks Bandits" BCHL preview recap transaction 2026'
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
  let verifiedPlayerHits = 0;
  let probablePlayerHits = 0;
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
          identity_level: rel.identity_level,
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
          identity_level: rel.identity_level,
          recency: rel.recency,
          reasons: rel.reasons
        });
      }
      continue;
    }

    if (rel.category === "player" && rel.identity_level === "verified") verifiedPlayerHits += 1;
    if (rel.category === "player" && rel.identity_level === "probable") probablePlayerHits += 1;
    if (rel.category === "team") teamHits += 1;
    if (rel.category === "league") leagueHits += 1;
    if (rel.category === "hockey") hockeyHits += 1;

    if (acceptedExamples.length < 15) {
      acceptedExamples.push({
        title: item.title,
        url: item.url,
        score: rel.score,
        category: rel.category,
        identity_level: rel.identity_level,
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
    verifiedPlayerHits,
    probablePlayerHits,
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
            identity_level: rel.identity_level,
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

        if (!id || !["new", "approved", "irrelevant", "history", "background"].includes(status)) {
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
