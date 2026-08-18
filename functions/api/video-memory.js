function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeQuestion(value) {
  return String(value || "").trim().toLowerCase();
}

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(hash)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function splitSentences(value) {
  return String(value || "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function buildLocalMemory(rows) {
  const analyzed = rows.filter(row => row.analysis_id);
  const scored = analyzed.filter(row => row.score !== null && row.score !== "");

  const categoriesMap = new Map();

  for (const row of rows) {
    const category = row.category || "Other";

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, {
        category,
        clips: 0,
        analyzed: 0,
        totalScore: 0,
        scored: 0,
        bestScore: null,
        latestScore: null,
        latestAt: null
      });
    }

    const item = categoriesMap.get(category);
    item.clips += 1;

    if (row.analysis_id) {
      item.analyzed += 1;
    }

    if (row.score !== null && row.score !== "") {
      const score = Number(row.score);

      item.totalScore += score;
      item.scored += 1;
      item.bestScore =
        item.bestScore === null ? score : Math.max(item.bestScore, score);

      if (!item.latestAt || String(row.analysis_created_at) > String(item.latestAt)) {
        item.latestAt = row.analysis_created_at;
        item.latestScore = score;
      }
    }
  }

  const categories = [...categoriesMap.values()]
    .map(item => ({
      category: item.category,
      clips: item.clips,
      analyzed: item.analyzed,
      averageScore: item.scored
        ? round(item.totalScore / item.scored)
        : null,
      bestScore: item.bestScore,
      latestScore: item.latestScore
    }))
    .sort((a, b) => {
      if (b.averageScore === null) return -1;
      if (a.averageScore === null) return 1;
      return b.averageScore - a.averageScore;
    });

  const chronological = scored
    .slice()
    .sort((a, b) => String(a.analysis_created_at).localeCompare(String(b.analysis_created_at)));

  const midpoint = Math.max(1, Math.floor(chronological.length / 2));
  const previous = chronological.slice(0, midpoint);
  const recent = chronological.slice(midpoint);

  const average = list =>
    list.length
      ? list.reduce((sum, row) => sum + Number(row.score || 0), 0) / list.length
      : null;

  const previousAverage = average(previous);
  const recentAverage = average(recent);
  const trend =
    previousAverage !== null && recentAverage !== null
      ? round(recentAverage - previousAverage)
      : null;

  const strongest = categories.find(item => item.averageScore !== null) || null;
  const develop = [...categories]
    .reverse()
    .find(item => item.averageScore !== null) || null;

  const recurringStrengths = analyzed
    .flatMap(row => splitSentences(row.strengths))
    .slice(0, 8);

  const recurringImprovements = analyzed
    .flatMap(row => splitSentences(row.improvements))
    .slice(0, 8);

  const recentAnalyses = analyzed
    .slice()
    .sort((a, b) => String(b.analysis_created_at).localeCompare(String(a.analysis_created_at)))
    .slice(0, 12)
    .map(row => ({
      clipId: row.id,
      title: row.title,
      category: row.category,
      opponent: row.opponent,
      gameDate: row.game_date,
      score: row.score,
      provider: row.analysis_provider,
      analysis: row.analysis,
      strengths: row.strengths,
      improvements: row.improvements,
      coachingPoints: row.coaching_points,
      createdAt: row.analysis_created_at
    }));

  const localRecommendation = !analyzed.length
    ? "Analysera fler klipp för att aktivera utvecklingsminnet."
    : develop
      ? `Prioritera ${develop.category}. Nuvarande snitt är ${develop.averageScore}/10.`
      : "Fortsätt analysera samma kategorier över tid.";

  return {
    summary: {
      clips: rows.length,
      analyzed: analyzed.length,
      scored: scored.length,
      averageScore: scored.length
        ? round(scored.reduce((sum, row) => sum + Number(row.score || 0), 0) / scored.length)
        : null,
      trend
    },
    categories,
    strongest,
    develop,
    recurringStrengths,
    recurringImprovements,
    recentAnalyses,
    localRecommendation
  };
}

async function loadRows(db) {
  const result = await db.prepare(`
    SELECT
      vc.id,
      vc.match_id,
      vc.title,
      vc.category,
      vc.note,
      vc.created_at,
      vc.updated_at,
      m.opponent,
      m.game_date,
      va.id AS analysis_id,
      va.provider AS analysis_provider,
      va.analysis,
      va.strengths,
      va.improvements,
      va.coaching_points,
      va.score,
      va.created_at AS analysis_created_at
    FROM video_clips vc
    LEFT JOIN matches m ON m.id = vc.match_id
    LEFT JOIN video_analyses va ON va.id = (
      SELECT va2.id
      FROM video_analyses va2
      WHERE va2.clip_id = vc.id
      ORDER BY va2.id DESC
      LIMIT 1
    )
    ORDER BY vc.id DESC
    LIMIT 500
  `).all();

  return result.results || [];
}

async function getDataVersion(db) {
  const version = await db.prepare(`
    SELECT
      COUNT(*) AS clip_count,
      COALESCE(MAX(id), 0) AS max_clip_id,
      COALESCE(MAX(updated_at), '') AS max_clip_update
    FROM video_clips
  `).first();

  const analyses = await db.prepare(`
    SELECT
      COUNT(*) AS analysis_count,
      COALESCE(MAX(id), 0) AS max_analysis_id,
      COALESCE(MAX(created_at), '') AS max_analysis_update
    FROM video_analyses
  `).first();

  return [
    version?.clip_count || 0,
    version?.max_clip_id || 0,
    version?.max_clip_update || "",
    analyses?.analysis_count || 0,
    analyses?.max_analysis_id || 0,
    analyses?.max_analysis_update || ""
  ].join("|");
}

async function getCache(db, cacheKey, dataVersion) {
  try {
    return await db.prepare(`
      SELECT answer
      FROM ai_cache
      WHERE cache_key = ?
        AND data_version = ?
      LIMIT 1
    `).bind(cacheKey, dataVersion).first();
  } catch {
    return null;
  }
}

async function saveCache(db, cacheKey, question, answer, dataVersion) {
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO ai_cache (
        cache_key,
        question,
        answer,
        provider,
        data_version
      )
      VALUES (?, ?, ?, 'openai', ?)
    `).bind(cacheKey, question, answer, dataVersion).run();
  } catch {
    // Cachefel ska inte stoppa Video Memory.
  }
}

async function callOpenAI(apiKey, question, memory) {
  const system = `
Du är AI Video Memory Coach för MansHockey Enterprise.

Spelaren är Måns Ågren, back i Brooks Bandits.

Du analyserar utveckling över tid utifrån tidigare videoklippsanalyser.
Regler:
- Svara på svenska.
- Använd endast informationen i underlaget.
- Hitta inte på videohändelser eller statistik.
- Var tydlig när datamängden är liten.
- Skilj på observerade fakta och din tolkning.
- Ge högst tre konkreta rekommendationer.
`;

  const compactContext = {
    question,
    summary: memory.summary,
    categories: memory.categories,
    strongest: memory.strongest,
    develop: memory.develop,
    recentAnalyses: memory.recentAnalyses.slice(0, 12)
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify(compactContext)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();

  return (
    data.output_text ||
    data.output?.flatMap(item => item.content || [])
      ?.find(content => content.type === "output_text")?.text ||
    "AI returnerade inget textsvar."
  );
}

export async function onRequest(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({ ok: false, error: "Ingen databasanslutning." }, 500);
    }

    const rows = await loadRows(db);
    const memory = buildLocalMemory(rows);

    if (context.request.method === "GET") {
      return json({
        ok: true,
        module: "AIVideoMemory",
        provider: "local",
        ...memory,
        timestamp: new Date().toISOString()
      });
    }

    if (context.request.method === "POST") {
      const body = await readBody(context.request);
      const question = String(body.question || "").trim();

      if (!question) {
        return json({ ok: false, error: "Frågan saknas." }, 400);
      }

      if (!context.env.OPENAI_API_KEY) {
        return json({
          ok: true,
          module: "AIVideoMemory",
          provider: "local",
          cached: false,
          question,
          answer: memory.localRecommendation,
          ...memory
        });
      }

      const dataVersion = await getDataVersion(db);
      const cacheKey = await hashText(
        `video-memory|${normalizeQuestion(question)}`
      );

      const cached = await getCache(db, cacheKey, dataVersion);

      if (cached?.answer) {
        return json({
          ok: true,
          module: "AIVideoMemory",
          provider: "cache",
          cached: true,
          question,
          answer: cached.answer,
          dataVersion,
          ...memory
        });
      }

      const answer = await callOpenAI(
        context.env.OPENAI_API_KEY,
        question,
        memory
      );

      await saveCache(db, cacheKey, question, answer, dataVersion);

      return json({
        ok: true,
        module: "AIVideoMemory",
        provider: "openai",
        cached: false,
        question,
        answer,
        dataVersion,
        ...memory,
        timestamp: new Date().toISOString()
      });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (err) {
    return json({
      ok: false,
      module: "AIVideoMemory",
      error: err.message
    }, 500);
  }
}
