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

async function callInternal(request, path) {
  const url = new URL(request.url);
  const target = `${url.origin}${path}`;

  const startedAt = Date.now();

  const res = await fetch(target, {
    method: "GET",
    headers: request.headers
  });

  const data = await res.json();

  return {
    data,
    durationMs: Date.now() - startedAt
  };
}

async function saveRun(db, run) {
  try {
    await db.prepare(`
      INSERT INTO ai_runs (
        module,
        action,
        match_id,
        provider,
        ok,
        details,
        duration_ms
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      run.module,
      run.action || "",
      run.matchId || "",
      run.provider || "",
      run.ok ? 1 : 0,
      JSON.stringify(run.details || {}),
      run.durationMs || 0
    ).run();
  } catch {
    // Monitor-loggning får inte stoppa AI-flödet.
  }
}

export async function onRequest(context) {
  const flowStartedAt = Date.now();

  try {
    const body = await readBody(context.request);
    const url = new URL(context.request.url);

    const action = body.action || url.searchParams.get("action") || "match";
    const matchId = body.match_id || url.searchParams.get("match_id") || "1";
    const results = [];

    if (action === "match" || action === "all") {
      const response = await callInternal(
        context.request,
        `/api/ai-match-report?match_id=${matchId}&v=${Date.now()}`
      );

      const item = {
        step: "ai-match-report",
        ok: Boolean(response.data.ok),
        provider: response.data.provider || "unknown",
        saved: Boolean(response.data.saved),
        durationMs: response.durationMs
      };

      results.push(item);

      await saveRun(context.env.DB, {
        module: item.step,
        action,
        matchId,
        provider: item.provider,
        ok: item.ok,
        details: item,
        durationMs: item.durationMs
      });
    }

    if (action === "scout" || action === "all") {
      const response = await callInternal(
        context.request,
        `/api/ai-scout?match_id=${matchId}&v=${Date.now()}`
      );

      const item = {
        step: "ai-scout",
        ok: Boolean(response.data.ok),
        provider: response.data.provider || "unknown",
        reports: response.data.summary?.reports ?? 0,
        durationMs: response.durationMs
      };

      results.push(item);

      await saveRun(context.env.DB, {
        module: item.step,
        action,
        matchId,
        provider: item.provider,
        ok: item.ok,
        details: item,
        durationMs: item.durationMs
      });
    }

    if (action === "insights" || action === "all") {
      const response = await callInternal(
        context.request,
        `/api/ai-insights?v=${Date.now()}`
      );

      const item = {
        step: "ai-insights",
        ok: Boolean(response.data.ok),
        provider: response.data.provider || "local",
        insights: response.data.insights?.length ?? 0,
        durationMs: response.durationMs
      };

      results.push(item);

      await saveRun(context.env.DB, {
        module: item.step,
        action,
        matchId,
        provider: item.provider,
        ok: item.ok,
        details: item,
        durationMs: item.durationMs
      });
    }

    return json({
      ok: true,
      module: "AIOrchestrator",
      action,
      matchId,
      durationMs: Date.now() - flowStartedAt,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    await saveRun(context.env.DB, {
      module: "AIOrchestrator",
      action: "error",
      matchId: "",
      provider: "none",
      ok: false,
      details: { error: err.message },
      durationMs: Date.now() - flowStartedAt
    });

    return json({
      ok: false,
      module: "AIOrchestrator",
      error: err.message
    }, 500);
  }
}