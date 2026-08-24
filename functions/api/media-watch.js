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
  return terms.reduce(
    (n, term) => n + (text.includes(term) ? 1 : 0),
    0
  );
}

function relevanceBreakdown(item) {
  const title = normalizedText(item.title);
  const snippet = normalizedText(item.snippet);
  const content = `${title} ${snippet}`.trim();
  const host = normalizedText(hostname(item.url));

  const player = "mans agren";

  const playerInTitle = title.includes(player);
  const playerInSnippet = snippet.includes(player);
  const hasPlayer = playerInTitle || playerInSnippet;

  const hockeyTerms = [
    "hockey",
    "bchl",
    "brooks bandits",
    "bandits",
    "defenseman",
    "defenceman",
    "defender",
    "back",
    "bjorkloven",
    "boden",
    "u20",
    "j20",
    "junior",
    "eliteprospects",
    "flohockey",
    "roster",
    "game",
    "match",
    "playoffs",
    "exhibition",
    "regular season",
    "goalie",
    "forward",
    "coach"
  ];

  const strongPlayerTerms = [
    "brooks bandits",
    "bchl",
    "defenseman",
    "defenceman",
    "bjorkloven",
    "boden",
    "u20",
    "j20",
    "eliteprospects",
    "flohockey"
  ];

  const trustedHosts = [
    "bchl ca",
    "eliteprospects com",
    "flohockey tv",
    "brooksbandits ca",
    "hockeycanada ca"
  ];

  const genealogyTerms = [
    "slakthistoria",
    "slakt",
    "genealogy",
    "ancestry",
    "family tree",
    "family history",
    "historiska poster",
    "historical records",
    "church records",
    "birth records",
    "marriage records",
    "death records",
    "cemetery",
    "myheritage"
  ];

  const historicalPatterns = [
    /\bfodd(?:es)?\s+(?:ar\s+)?1[5-8]\d{2}\b/,
    /\bborn\s+(?:in\s+)?1[5-8]\d{2}\b/,
    /\b1[5-8]\d{2}\s*[-–]\s*1[5-8]\d{2}\b/
  ];

  const hasBrooks = content.includes("brooks bandits");
  const hasBchl = content.includes("bchl");

  const hockeyHits = countHits(
    content,
    hockeyTerms
  );

  const strongHits = countHits(
    content,
    strongPlayerTerms
  );

  const trustedHost = trustedHosts.some(
    h => host.includes(h)
  );

  const genealogy =
    includesAny(content, genealogyTerms) ||
    historicalPatterns.some(re => re.test(content));

  const social = item.source_type === "social";

  let score = 0;
  let category = "other";
  const reasons = [];

  /*
   * HÅRD SPÄRR:
   * MyHeritage, släktforskning och historiska namnar
   * får aldrig klassas som hockeyspelaren Måns.
   */
  if (genealogy) {
    reasons.push(
      "Släktforskning/historisk namne – inte hockeyspelaren."
    );

    return {
      score: 0,
      category: "wrong_person",
      reasons,
      autoIrrelevant: true
    };
  }

  /*
   * DIREKT MÅNS-TRÄFF
   */
  if (hasPlayer) {
    category = "player";

    if (playerInTitle) {
      score += 55;
      reasons.push(
        "Måns Ågren finns i titeln."
      );
    } else {
      score += 25;
      reasons.push(
        "Måns Ågren finns endast i beskrivning/snippet."
      );
    }

    if (strongHits >= 3) {
      score += 35;
    } else if (strongHits === 2) {
      score += 28;
    } else if (strongHits === 1) {
      score += 16;
    }

    if (hasBrooks) {
      score += 15;
      reasons.push(
        "Brooks Bandits-kontext."
      );
    }

    if (hasBchl) {
      score += 8;
      reasons.push(
        "BCHL-kontext."
      );
    }

    if (trustedHost) {
      score += 5;
    }

    /*
     * Namnet Måns Ågren ensamt räcker inte.
     */
    if (hockeyHits === 0) {
      score = Math.min(score, 25);

      reasons.push(
        "Ingen verifierbar hockeykontext."
      );
    }

    /*
     * Sociala sökresultat kan få sökorden
     * insprängda i snippets trots att inlägget
     * egentligen handlar om någon annan.
     */
    if (social && !playerInTitle) {
      score = Math.min(
        score,
        strongHits === 0 ? 30 : 68
      );

      reasons.push(
        "Social träff utan Måns i titeln – nedviktad."
      );
    }
  }

  /*
   * BROOKS BANDITS UTAN MÅNS
   */
  else if (hasBrooks) {
    category = "team";
    score = 48;

    if (hasBchl) {
      score += 12;
    }

    if (hockeyHits >= 3) {
      score += 10;
    } else if (hockeyHits >= 1) {
      score += 5;
    }

    if (trustedHost) {
      score += 5;
    }

    score = Math.min(
      score,
      social ? 65 : 78
    );

    reasons.push(
      "Brooks Bandits-lagbevakning utan Måns."
    );
  }

  /*
   * BCHL UTAN MÅNS/BROOKS
   */
  else if (
    hasBchl &&
    hockeyHits >= 2
  ) {
    category = "league";

    score = trustedHost
      ? 45
      : 32;

    reasons.push(
      "BCHL-träff utan direkt koppling till Måns."
    );
  }

  /*
   * ALLMÄN HOCKEY
   */
  else if (
    trustedHost &&
    hockeyHits >= 3
  ) {
    category = "hockey";
    score = 35;

    reasons.push(
      "Allmän hockeyträff från betrodd källa."
    );
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    score,
    category,
    reasons,
    autoIrrelevant: score < 30
  };
}

function relevance(item) {
  return relevanceBreakdown(item).score;
}

async function firecrawlSearch(
  apiKey,
  query,
  includeContent = false
) {
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
      formats: [
        { type: "markdown" }
      ],
      onlyMainContent: true
    };
  }

  const response = await fetch(
    "https://api.firecrawl.dev/v2/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Firecrawl Search svarade med ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error ||
      "Firecrawl Search misslyckades."
    );
  }

  const web = (
    data.data?.web || []
  ).map(item => ({
    title: clean(
      item.title ||
      item.metadata?.title ||
      "Namnlös träff"
    ),

    snippet: clean(
      item.description ||
      item.metadata?.description ||
      item.markdown?.slice(0, 700) ||
      ""
    ),

    content: clean(
      item.markdown || ""
    ),

    url: normalizeUrl(
      item.url ||
      item.metadata?.sourceURL ||
      item.metadata?.url ||
      ""
    ),

    source_name: hostname(
      item.url ||
      item.metadata?.sourceURL ||
      ""
    ),

    source_type: sourceType(
      item.url ||
      item.metadata?.sourceURL ||
      "",
      "web"
    ),

    published_at:
      clean(
        item.metadata?.publishedTime ||
        item.metadata?.modifiedTime ||
        ""
      ) || null,

    search_query: query
  }));

  const news = (
    data.data?.news || []
  ).map(item => ({
    title: clean(
      item.title ||
      item.metadata?.title ||
      "Namnlös träff"
    ),

    snippet: clean(
      item.snippet ||
      item.metadata?.description ||
      item.markdown?.slice(0, 700) ||
      ""
    ),

    content: clean(
      item.markdown || ""
    ),

    url: normalizeUrl(
      item.url ||
      item.metadata?.sourceURL ||
      item.metadata?.url ||
      ""
    ),

    source_name: hostname(
      item.url ||
      item.metadata?.sourceURL ||
      ""
    ),

    source_type: sourceType(
      item.url ||
      item.metadata?.sourceURL ||
      "",
      "news"
    ),

    published_at:
      clean(
        item.date ||
        item.metadata?.publishedTime ||
        ""
      ) || null,

    search_query: query
  }));

  return {
    results: [
      ...news,
      ...web
    ],

    creditsUsed:
      Number(
        data.creditsUsed || 0
      ),

    warning:
      data.warning || null
  };
}

async function firecrawlScrape(
  apiKey,
  url
) {
  const response = await fetch(
    "https://api.firecrawl.dev/v2/scrape",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        url,

        formats: [
          { type: "markdown" }
        ],

        onlyMainContent: true,
        timeout: 60000
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Firecrawl Scrape svarade med ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error ||
      "Firecrawl Scrape misslyckades."
    );
  }

  return {
    markdown: clean(
      data.data?.markdown || ""
    ),

    metadata:
      data.data?.metadata || {}
  };
}async function upsertItem(db, item) {
  const rel = relevanceBreakdown(item);
  const score = rel.score;

  /*
   * Träffar under 50 sparas inte som nya poster.
   * Tydligt fel person / släktforskning stoppas helt.
   */
  if (
    !item.url ||
    !item.title ||
    score < 50 ||
    rel.category === "wrong_person"
  ) {
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
    VALUES (
      NULL,
      ?, ?, ?, ?, ?, ?, ?, ?,
      'new',
      CURRENT_TIMESTAMP
    )

    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      source_name = excluded.source_name,
      source_type = excluded.source_type,

      published_at = COALESCE(
        excluded.published_at,
        mans_media_watch.published_at
      ),

      snippet = excluded.snippet,
      search_query = excluded.search_query,

      relevance_score = CASE
        WHEN mans_media_watch.status = 'approved'
          THEN mans_media_watch.relevance_score
        ELSE excluded.relevance_score
      END,

      status = CASE
        WHEN mans_media_watch.status = 'approved'
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
    score
  ).run();

  return Number(
    result.meta?.changes || 0
  ) > 0;
}


/*
 * Räknar om all befintlig Media Watch-data
 * med E30.8.3-modellen.
 *
 * Viktigt:
 * manuellt GODKÄNDA poster lämnas helt orörda.
 */
async function cleanupExisting(db) {
  const rows = (
    await db.prepare(`
      SELECT
        id,
        title,
        source_name,
        source_type,
        url,
        snippet,
        search_query,
        relevance_score,
        status
      FROM mans_media_watch
      ORDER BY id
    `).all()
  ).results || [];

  let scanned = 0;
  let rescored = 0;
  let autoIrrelevant = 0;
  let approvedProtected = 0;
  let unchanged = 0;

  const examples = [];

  for (const row of rows) {
    scanned += 1;

    /*
     * Manuellt godkända träffar ska aldrig
     * flyttas eller skrivas om automatiskt.
     */
    if (row.status === "approved") {
      approvedProtected += 1;
      continue;
    }

    const rel = relevanceBreakdown(row);

    let nextStatus = row.status;

    /*
     * Tydligt fel person eller mycket låg
     * relevans flyttas automatiskt till irrelevant.
     */
    if (
      rel.autoIrrelevant ||
      rel.category === "wrong_person"
    ) {
      nextStatus = "irrelevant";
    }

    const oldScore =
      Number(row.relevance_score || 0);

    const scoreChanged =
      oldScore !== rel.score;

    const statusChanged =
      String(row.status || "") !==
      String(nextStatus || "");

    if (
      !scoreChanged &&
      !statusChanged
    ) {
      unchanged += 1;
      continue;
    }

    await db.prepare(`
      UPDATE mans_media_watch
      SET
        relevance_score = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      rel.score,
      nextStatus,
      row.id
    ).run();

    if (scoreChanged) {
      rescored += 1;
    }

    if (
      statusChanged &&
      nextStatus === "irrelevant"
    ) {
      autoIrrelevant += 1;
    }

    if (examples.length < 20) {
      examples.push({
        id: row.id,
        title: row.title,
        old_score: oldScore,
        new_score: rel.score,
        old_status: row.status,
        new_status: nextStatus,
        category: rel.category,
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
  const status =
    url.searchParams.get("status");

  const type =
    url.searchParams.get("type");

  const limit = Math.min(
    200,
    Math.max(
      1,
      Number(
        url.searchParams.get("limit") ||
        100
      )
    )
  );

  const conditions = [];
  const values = [];

  if (status) {
    conditions.push(
      "status = ?"
    );

    values.push(status);
  }

  if (type) {
    conditions.push(
      "source_type = ?"
    );

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

      COALESCE(
        published_at,
        created_at
      ) DESC,

      id DESC

    LIMIT ?
  `);

  const result = values.length
    ? await statement
        .bind(
          ...values,
          limit
        )
        .all()

    : await statement
        .bind(limit)
        .all();

  const summary = await db.prepare(`
    SELECT
      COUNT(*) AS total,

      SUM(
        CASE
          WHEN status = 'new'
          THEN 1
          ELSE 0
        END
      ) AS new_items,

      SUM(
        CASE
          WHEN status = 'approved'
          THEN 1
          ELSE 0
        END
      ) AS approved,

      SUM(
        CASE
          WHEN status = 'irrelevant'
          THEN 1
          ELSE 0
        END
      ) AS irrelevant,

      SUM(
        CASE
          WHEN source_type = 'article'
          THEN 1
          ELSE 0
        END
      ) AS articles,

      SUM(
        CASE
          WHEN source_type = 'social'
          THEN 1
          ELSE 0
        END
      ) AS social,

      SUM(
        CASE
          WHEN source_type = 'video'
          THEN 1
          ELSE 0
        END
      ) AS videos

    FROM mans_media_watch
  `).first();

  return {
    items:
      result.results || [],

    summary: {
      total:
        Number(
          summary?.total || 0
        ),

      newItems:
        Number(
          summary?.new_items || 0
        ),

      approved:
        Number(
          summary?.approved || 0
        ),

      irrelevant:
        Number(
          summary?.irrelevant || 0
        ),

      articles:
        Number(
          summary?.articles || 0
        ),

      social:
        Number(
          summary?.social || 0
        ),

      videos:
        Number(
          summary?.videos || 0
        )
    }
  };
}


async function runSearch(
  db,
  apiKey,
  customQueries,
  includeContent
) {
  /*
   * Vi söker inte längre bara på namnet.
   * Varje Måns-fråga innehåller hockeykontext
   * för att minska sammanblandning med namnar.
   */
  const queries =
    customQueries.length
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

  /*
   * Max 8 Firecrawl-sökningar per körning.
   */
  for (
    const query
    of queries.slice(0, 8)
  ) {
    try {
      const response =
        await firecrawlSearch(
          apiKey,
          query,
          includeContent
        );

      found.push(
        ...response.results
      );

      creditsUsed +=
        response.creditsUsed;

    } catch (error) {
      errors.push({
        query,
        error:
          error.message
      });
    }
  }

  /*
   * Deduplicering per normaliserad URL.
   *
   * Om samma URL hittas flera gånger behåller
   * vi versionen med högst faktisk relevans.
   */
  const unique =
    new Map();

  for (const item of found) {
    if (!item.url) {
      continue;
    }

    const previous =
      unique.get(item.url);

    if (
      !previous ||
      relevance(item) >
      relevance(previous)
    ) {
      unique.set(
        item.url,
        item
      );
    }
  }

  let saved = 0;
  let playerHits = 0;
  let teamHits = 0;
  let leagueHits = 0;
  let rejected = 0;
  let wrongPerson = 0;

  const acceptedExamples = [];
  const rejectedExamples = [];

  for (
    const item
    of unique.values()
  ) {
    const rel =
      relevanceBreakdown(item);

    if (
      rel.category ===
      "wrong_person"
    ) {
      wrongPerson += 1;
      rejected += 1;

      if (
        rejectedExamples.length <
        15
      ) {
        rejectedExamples.push({
          title: item.title,
          url: item.url,
          score: rel.score,
          category:
            rel.category,
          reasons:
            rel.reasons
        });
      }

      continue;
    }

    /*
     * Inga nya poster under 50 lagras.
     */
    if (rel.score < 50) {
      rejected += 1;

      if (
        rejectedExamples.length <
        15
      ) {
        rejectedExamples.push({
          title: item.title,
          url: item.url,
          score: rel.score,
          category:
            rel.category,
          reasons:
            rel.reasons
        });
      }

      continue;
    }

    if (
      rel.category ===
      "player"
    ) {
      playerHits += 1;
    }

    if (
      rel.category ===
      "team"
    ) {
      teamHits += 1;
    }

    if (
      rel.category ===
      "league"
    ) {
      leagueHits += 1;
    }

    if (
      acceptedExamples.length <
      15
    ) {
      acceptedExamples.push({
        title: item.title,
        url: item.url,
        score: rel.score,
        category:
          rel.category,
        reasons:
          rel.reasons
      });
    }

    if (
      await upsertItem(
        db,
        item
      )
    ) {
      saved += 1;
    }
  }

  return {
    version:
      "E30.8.3",

    queries,

    found:
      found.length,

    unique:
      unique.size,

    saved,

    playerHits,

    teamHits,

    leagueHits,

    wrongPerson,

    rejected,

    creditsUsed,

    errors,

    acceptedExamples,

    rejectedExamples
  };
}export async function onRequest(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({
        ok: false,
        module: "MansMediaWatch",
        version: "E30.8.3",
        error: "Ingen databasanslutning."
      }, 500);
    }

    const request = context.request;
    const url = new URL(request.url);

    /*
     * GET
     * Läs Media Watch + summering.
     */
    if (request.method === "GET") {
      return json({
        ok: true,
        module: "MansMediaWatch",
        version: "E30.8.3",
        ...(await listItems(db, url)),
        timestamp: new Date().toISOString()
      });
    }

    /*
     * POST
     */
    if (request.method === "POST") {
      const body = await readBody(request);

      const action =
        body.action || "search";

      /*
       * CLEANUP
       *
       * Räknar om befintliga träffar.
       * Godkända poster lämnas orörda.
       *
       * Denna action använder INTE Firecrawl,
       * så den kostar inga Firecrawl credits.
       */
      if (action === "cleanup") {
        const cleanup =
          await cleanupExisting(db);

        return json({
          ok: true,
          module: "MansMediaWatch",
          version: "E30.8.3",
          action: "cleanup",
          cleanup,
          ...(await listItems(db, url)),
          timestamp: new Date().toISOString()
        });
      }

      /*
       * SEARCH
       */
      if (action === "search") {
        if (
          !context.env
            .FIRECRAWL_API_KEY
        ) {
          return json({
            ok: false,
            module: "MansMediaWatch",
            version: "E30.8.3",
            error:
              "FIRECRAWL_API_KEY saknas i Cloudflare Secrets."
          }, 500);
        }

        const customQueries =
          Array.isArray(
            body.queries
          )
            ? body.queries
                .map(clean)
                .filter(Boolean)
            : [];

        const search =
          await runSearch(
            db,
            context.env
              .FIRECRAWL_API_KEY,
            customQueries,
            Boolean(
              body.include_content
            )
          );

        return json({
          ok: true,
          module:
            "MansMediaWatch",
          version:
            "E30.8.3",
          action:
            "search",
          search,
          ...(await listItems(
            db,
            url
          )),
          timestamp:
            new Date()
              .toISOString()
        });
      }

      /*
       * SCRAPE
       *
       * Läs hela innehållet från en
       * specifik redan sparad träff.
       */
      if (action === "scrape") {
        if (
          !context.env
            .FIRECRAWL_API_KEY
        ) {
          return json({
            ok: false,
            module:
              "MansMediaWatch",
            version:
              "E30.8.3",
            error:
              "FIRECRAWL_API_KEY saknas i Cloudflare Secrets."
          }, 500);
        }

        const id =
          Number(body.id);

        const targetUrl =
          clean(body.url);

        if (
          !id ||
          !targetUrl
        ) {
          return json({
            ok: false,
            error:
              "Id och URL krävs."
          }, 400);
        }

        const scraped =
          await firecrawlScrape(
            context.env
              .FIRECRAWL_API_KEY,
            targetUrl
          );

        const snippet =
          scraped.markdown
            .slice(
              0,
              5000
            );

        /*
         * Uppdatera innehållet först.
         */
        await db.prepare(`
          UPDATE mans_media_watch
          SET
            snippet = ?,
            source_name =
              COALESCE(
                NULLIF(
                  source_name,
                  ''
                ),
                ?
              ),
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          snippet,
          hostname(
            targetUrl
          ),
          id
        ).run();

        /*
         * Läs posten igen och räkna om
         * relevansen på det rikare innehållet.
         */
        const refreshed =
          await db.prepare(`
            SELECT
              id,
              title,
              source_name,
              source_type,
              url,
              snippet,
              search_query,
              relevance_score,
              status
            FROM mans_media_watch
            WHERE id = ?
            LIMIT 1
          `)
            .bind(id)
            .first();

        let relevanceAfterScrape =
          null;

        if (refreshed) {
          const rel =
            relevanceBreakdown(
              refreshed
            );

          relevanceAfterScrape =
            rel;

          /*
           * Skydda manuellt godkända poster.
           */
          if (
            refreshed.status !==
            "approved"
          ) {
            const nextStatus =
              rel.autoIrrelevant
                ? "irrelevant"
                : refreshed.status;

            await db.prepare(`
              UPDATE mans_media_watch
              SET
                relevance_score = ?,
                status = ?,
                updated_at =
                  CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(
              rel.score,
              nextStatus,
              id
            ).run();
          }
        }

        return json({
          ok: true,
          module:
            "MansMediaWatch",
          version:
            "E30.8.3",
          action:
            "scrape",
          id,
          chars:
            scraped.markdown
              .length,
          relevance:
            relevanceAfterScrape,
          content:
            scraped.markdown
        });
      }

      /*
       * STATUS
       *
       * Manuell klassificering:
       * new / approved / irrelevant
       */
      if (action === "status") {
        const id =
          Number(body.id);

        const status =
          clean(body.status);

        if (
          !id ||
          ![
            "new",
            "approved",
            "irrelevant"
          ].includes(status)
        ) {
          return json({
            ok: false,
            error:
              "Ogiltigt id eller status."
          }, 400);
        }

        await db.prepare(`
          UPDATE mans_media_watch
          SET
            status = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          status,
          id
        ).run();

        return json({
          ok: true,
          module:
            "MansMediaWatch",
          version:
            "E30.8.3",
          action:
            "status",
          id,
          status
        });
      }

      return json({
        ok: false,
        module:
          "MansMediaWatch",
        version:
          "E30.8.3",
        error:
          "Okänd action."
      }, 400);
    }

    /*
     * DELETE
     */
    if (
      request.method ===
      "DELETE"
    ) {
      const id =
        Number(
          url.searchParams
            .get("id")
        );

      if (!id) {
        return json({
          ok: false,
          error:
            "Träff-id saknas."
        }, 400);
      }

      await db.prepare(
        `
        DELETE FROM
          mans_media_watch
        WHERE id = ?
        `
      )
        .bind(id)
        .run();

      return json({
        ok: true,
        module:
          "MansMediaWatch",
        version:
          "E30.8.3",
        deleted: true,
        id
      });
    }

    return json({
      ok: false,
      module:
        "MansMediaWatch",
      version:
        "E30.8.3",
      error:
        "Method not allowed"
    }, 405);

  } catch (error) {
    return json({
      ok: false,
      module:
        "MansMediaWatch",
      version:
        "E30.8.3",
      error:
        error.message
    }, 500);
  }
}