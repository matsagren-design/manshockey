function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function getTitle(module) {
  const titles = {
    "ai-match-report": "Matchrapport skapad",
    "ai-scout": "AI Scout analyserade matchen",
    "ai-insights": "AI Insights uppdaterades",
    "AIOrchestrator": "AI-flöde genomfört",
    "AICoachPro": "AI Coach svarade"
  };

  return titles[module] || module || "AI-händelse";
}

function getDescription(run) {
  let details = {};

  try {
    details = JSON.parse(run.details || "{}");
  } catch {
    details = {};
  }

  if (run.module === "ai-match-report") {
    return run.ok
      ? `Matchrapporten bearbetades och ${details.saved ? "sparades" : "kördes"}.`
      : "Matchrapporten kunde inte skapas.";
  }

  if (run.module === "ai-scout") {
    return run.ok
      ? `AI Scout bearbetade ${details.reports ?? 0} scoutrapporter.`
      : "AI Scout kunde inte genomföra analysen.";
  }

  if (run.module === "ai-insights") {
    return run.ok
      ? `${details.insights ?? 0} AI-insikter uppdaterades.`
      : "AI Insights kunde inte uppdateras.";
  }

  return run.ok
    ? "AI-processen genomfördes."
    : "AI-processen misslyckades.";
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({
        ok: false,
        module: "AITimeline",
        error: "Database not connected",
        items: []
      }, 500);
    }

    const url = new URL(context.request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || 30);
    const limit = Math.min(100, Math.max(1, requestedLimit));

    const { results } = await db.prepare(`
      SELECT
        id,
        module,
        action,
        match_id,
        provider,
        ok,
        details,
        duration_ms,
        created_at
      FROM ai_runs
      ORDER BY id DESC
      LIMIT ?
    `).bind(limit).all();

    const items = (results || []).map(run => ({
      id: run.id,
      module: run.module,
      title: getTitle(run.module),
      description: getDescription(run),
      action: run.action,
      matchId: run.match_id,
      provider: run.provider || "local",
      ok: Boolean(run.ok),
      durationMs: Number(run.duration_ms || 0),
      createdAt: run.created_at
    }));

    const successful = items.filter(item => item.ok).length;
    const failed = items.filter(item => !item.ok).length;
    const openai = items.filter(item => item.provider === "openai").length;
    const cache = items.filter(item => item.provider === "cache").length;
    const local = items.filter(item => item.provider === "local").length;

    return json({
      ok: true,
      module: "AITimeline",

      summary: {
        events: items.length,
        successful,
        failed,
        openai,
        cache,
        local
      },

      items,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return json({
      ok: false,
      module: "AITimeline",
      error: err.message,
      items: []
    }, 500);
  }
}