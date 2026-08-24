function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
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
  return String(value || "").trim();
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";

    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid"
    ]) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return clean(value);
  }
}

function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceType(url, source = "web") {
  const host = hostname(url).toLowerCase();

  if (
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("vimeo.com")
  ) {
    return "video";
  }

  if (
    host.includes("instagram.com") ||
    host.includes("facebook.com") ||
    host.includes("threads.net") ||
    host.includes("x.com") ||
    host.includes("twitter.com") ||
    host.includes("tiktok.com") ||
    host.includes("bsky.app") ||
    host.includes("linkedin.com")
  ) {
    return "social";
  }

  return source === "news" ? "article" : "web";
}

function normalizedText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function countHits(text, terms) {
  return terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0);
}

function relevanceBreakdown(item) {
  const title = normalizedText(item.title);
  const snippet = normalizedText(item.snippet);
  const content = `${title} ${snippet}`.trim();
  const host = normalizedText(hostname(item.url));

  const playerNames = ["mans agren"];

  const strongPlayerContext = [
    "brooks bandits","bchl","hockey","defenseman","defenceman",
    "defender","back","bjorkloven","boden","u20","j20","junior",
    "eliteprospects","flohockey","bandits"
  ];

  const hockeyContext = [
    "hockey","bchl","flohockey","eliteprospects","roster","schedule",
    "game","match","defenseman","defenceman","forward","goalie",
    "coach","playoffs","exhibition","regular season","junior"
  ];

  const trustedHockeyHosts = [
    "bchl ca","eliteprospects com","flohockey tv",
    "brooksbandits ca","hockeycanada ca"
  ];

  const negativeTerms = [
    "slakthistoria","slakt","genealogy","ancestry","family tree",
    "family history","heritage","historiska poster","historical records",
    "church records","birth records","marriage records","death records",
    "cemetery","myheritage"
  ];

  const historicalPatterns = [
    /\bfodd(?:es)?\s+(?:ar\s+)?1[5-8]\d{2}\b/,
    /\bborn\s+(?:in\s+)?1[5-8]\d{2}\b/,
    /\b1[5-8]\d{2}\s*[-–]\s*1[5-8]\d{2}\b/
  ];

  const hasPlayer = includesAny(content, playerNames);
  const playerInTitle = includesAny(title, playerNames);
  const contextHits = countHits(content, strongPlayerContext);
  const hasBrooks = content.includes("brooks bandits");
  const hasBchl = content.includes("bchl");
  const hockeyHits = countHits(content, hockeyContext);
  const trustedHost = trustedHockeyHosts.some(h => host.includes(h));
  const negative =
    includesAny(content, negativeTerms) ||
    historicalPatterns.some(re => re.test(content));

  let score = 0;
  let category = "other";
  const reasons = [];

  if (hasPlayer) {
    category = "player";
    score += playerInTitle ? 48 : 38;

    if (contextHits >= 3) {
      score += 38;
    } else if (contextHits === 2) {
      score += 30;
    } else if (contextHits === 1) {
      score += 18;
    } else {
      score += 2;
    }

    if (hasBrooks) score += 12;
    if (hasBchl) score += 8;
    if (trustedHost) score += 6;

    if (negative) {
      score -= 80;
    }
  } else if (hasBrooks || (hasBchl && hockeyHits >= 2)) {
    category = "team";

    if (hasBrooks) score += 44;
    if (hasBchl) score += 14;

    if (hockeyHits >= 3) {
      score += 12;
    } else if (hockeyHits >= 1) {
      score += 6;
    }

    if (trustedHost) score += 6;

    score = Math.min(score, 78);
  } else if (hockeyHits >= 3 && trustedHost) {
    category = "hockey";
    score = 38;
  }

  if (negative && !hasPlayer) {
    score -= 50;
  }

  if (item.source_type === "social" && !playerInTitle) {
    if (category === "player") {
      score = Math.min(score, 82);
    } else if (category === "team") {
      score = Math.min(score, 68);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    category,
    reasons
  };
}

function relevance(item) {
  return relevanceBreakdown(item).score;
}

async function firecrawlSearch(apiKey, query, includeContent = false) {
  const body = {
    query,
    limit: 10,
    sources: [
      { type: "web" },
      { type: "news" }
    ],
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
    throw new Error(
      `Firecrawl Search svarade med ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Firecrawl Search misslyckades.");
  }

  const web = (data.data?.web || []).map(item => ({
    title: clean(item.title || item.metadata?.title || "Namnlös träff"),
    snippet: clean(
      item.description ||
      item.metadata?.description ||
      item.markdown?.slice(0, 700) ||
      ""
    ),
    content: clean(item.markdown || ""),
    url: normalizeUrl(item.url || item.metadata?.sourceURL || item.metadata?.url || ""),
    source_name: hostname(item.url || item.metadata?.sourceURL || ""),
    source_type: sourceType(item.url || item.metadata?.sourceURL || "", "web"),
    published_at: clean(item.metadata?.publishedTime || item.metadata?.modifiedTime || "") || null,
    search_query: query
  }));

  const news = (data.data?.news || []).map(item => ({
    title: clean(item.title || item.metadata?.title || "Namnlös träff"),
    snippet: clean(
      item.snippet ||
      item.metadata?.description ||
      item.markdown?.slice(0, 700) ||
      ""
    ),
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
    throw new Error(
      `Firecrawl Scrape svarade med ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Firecrawl Scrape misslyckades.");
  }

  return {
    markdown: clean(data.data?.markdown || ""),
    metadata: data.data?.metadata || {}
  };
}

async function upsertItem(db, item) {
  const score = relevance(item);

  if (!item.url || !item.title || score < 50) {
    return false;
  }

  const result = await db.prepare(`
    INSERT INTO mans_media_watch (
      external_id,
      title,
      source_name,
      source_type,
      url,
      published_at,
      snippet,
      search_query,
      relevance_score,
      status,
      updated_at
    )
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      source_name = excluded.source_name,
      source_type = excluded.source_type,
      published_at = COALESCE(excluded.published_at, mans_media_watch.published_at),
      snippet = excluded.snippet,
      search_query = excluded.search_query,
      relevance_score = excluded.relevance_score,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    item.title,
    item.source_name || "",
    item.source_type || "web",
    item.url,
    item.published_at || null,
    item.snippet || "",
    item.search_query || "",
    score
  ).run();

  return Number(result.meta?.changes || 0) > 0;
}

async function listItems(db, url) {
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
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

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

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
    items: result.results || [],
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
        '"Brooks Bandits" BCHL',
        '"Brooks Bandits" hockey'
      ];

  const found = [];
  const errors = [];
  let creditsUsed = 0;

  for (const query of queries.slice(0, 8)) {
    try {
      const response = await firecrawlSearch(
        apiKey,
        query,
        includeContent
      );

      found.push(...response.results);
      creditsUsed += response.creditsUsed;
    } catch (error) {
      errors.push({
        query,
        error: error.message
      });
    }
  }

  const unique = new Map();

  for (const item of found) {
    if (!item.url) continue;

    const previous = unique.get(item.url);

    if (!previous || relevance(item) > relevance(previous)) {
      unique.set(item.url, item);
    }
  }

  let saved = 0;
  let playerHits = 0;
  let teamHits = 0;
  let rejected = 0;

  for (const item of unique.values()) {
    const rel = relevanceBreakdown(item);

    if (rel.score < 50) {
      rejected += 1;
      continue;
    }

    if (rel.category === "player") playerHits += 1;
    if (rel.category === "team") teamHits += 1;

    if (await upsertItem(db, item)) {
      saved += 1;
    }
  }

  return {
    queries,
    found: found.length,
    unique: unique.size,
    saved,
    playerHits,
    teamHits,
    rejected,
    creditsUsed,
    errors,
    version: "E30.8.2"
  };
}export async function onRequest(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({
        ok: false,
        module: "MansMediaWatch",
        version: "E30.8.2",
        error: "Ingen databasanslutning."
      }, 500);
    }

    const request = context.request;
    const url = new URL(request.url);

    if (request.method === "GET") {
      return json({
        ok: true,
        module: "MansMediaWatch",
        version: "E30.8.2",
        ...(await listItems(db, url)),
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const action = body.action || "search";

      if (!context.env.FIRECRAWL_API_KEY) {
        return json({
          ok: false,
          module: "MansMediaWatch",
          version: "E30.8.2",
          error: "FIRECRAWL_API_KEY saknas i Cloudflare Secrets."
        }, 500);
      }

      if (action === "search") {
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
          version: "E30.8.2",
          action: "search",
          search,
          ...(await listItems(db, url)),
          timestamp: new Date().toISOString()
        });
      }

      if (action === "scrape") {
        const id = Number(body.id);
        const targetUrl = clean(body.url);

        if (!id || !targetUrl) {
          return json({
            ok: false,
            error: "Id och URL krävs."
          }, 400);
        }

        const scraped = await firecrawlScrape(
          context.env.FIRECRAWL_API_KEY,
          targetUrl
        );

        const snippet = scraped.markdown.slice(0, 5000);

        await db.prepare(`
          UPDATE mans_media_watch
          SET snippet = ?,
              source_name = COALESCE(NULLIF(source_name, ''), ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          snippet,
          hostname(targetUrl),
          id
        ).run();

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: "E30.8.2",
          action: "scrape",
          id,
          chars: scraped.markdown.length,
          content: scraped.markdown
        });
      }

      if (action === "status") {
        const id = Number(body.id);
        const status = clean(body.status);

        if (
          !id ||
          !["new", "approved", "irrelevant"].includes(status)
        ) {
          return json({
            ok: false,
            error: "Ogiltigt id eller status."
          }, 400);
        }

        await db.prepare(`
          UPDATE mans_media_watch
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          status,
          id
        ).run();

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: "E30.8.2",
          action: "status",
          id,
          status
        });
      }

      return json({
        ok: false,
        error: "Okänd action."
      }, 400);
    }

    if (request.method === "DELETE") {
      const id = Number(
        url.searchParams.get("id")
      );

      if (!id) {
        return json({
          ok: false,
          error: "Träff-id saknas."
        }, 400);
      }

      await db.prepare(
        "DELETE FROM mans_media_watch WHERE id = ?"
      )
        .bind(id)
        .run();

      return json({
        ok: true,
        module: "MansMediaWatch",
        version: "E30.8.2",
        deleted: true,
        id
      });
    }

    return json({
      ok: false,
      error: "Method not allowed"
    }, 405);
  } catch (error) {
    return json({
      ok: false,
      module: "MansMediaWatch",
      version: "E30.8.2",
      error: error.message
    }, 500);
  }
}