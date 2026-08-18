function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const [runs, totals, today] = await Promise.all([
      db.prepare(`
        SELECT *
        FROM ai_runs
        ORDER BY id DESC
        LIMIT 50
      `).all(),

      db.prepare(`
        SELECT
          COUNT(*) AS total_runs,
          SUM(CASE WHEN ok = 1 THEN 1 ELSE 0 END) AS successful_runs,
          SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS failed_runs,
          SUM(CASE WHEN provider = 'openai' THEN 1 ELSE 0 END) AS openai_runs,
          SUM(CASE WHEN provider = 'cache' THEN 1 ELSE 0 END) AS cache_runs,
          SUM(CASE WHEN provider = 'local' THEN 1 ELSE 0 END) AS local_runs,
          AVG(duration_ms) AS average_duration_ms
        FROM ai_runs
      `).first(),

      db.prepare(`
        SELECT
          COUNT(*) AS total_runs,
          SUM(CASE WHEN provider = 'openai' THEN 1 ELSE 0 END) AS openai_runs,
          SUM(CASE WHEN provider = 'cache' THEN 1 ELSE 0 END) AS cache_runs,
          SUM(CASE WHEN provider = 'local' THEN 1 ELSE 0 END) AS local_runs
        FROM ai_runs
        WHERE date(created_at) = date('now')
      `).first()
    ]);

    return json({
      ok: true,
      module: "AIMonitor",
      summary: {
        totalRuns: Number(totals?.total_runs || 0),
        successfulRuns: Number(totals?.successful_runs || 0),
        failedRuns: Number(totals?.failed_runs || 0),
        openaiRuns: Number(totals?.openai_runs || 0),
        cacheRuns: Number(totals?.cache_runs || 0),
        localRuns: Number(totals?.local_runs || 0),
        averageDurationMs: Math.round(Number(totals?.average_duration_ms || 0))
      },
      today: {
        totalRuns: Number(today?.total_runs || 0),
        openaiRuns: Number(today?.openai_runs || 0),
        cacheRuns: Number(today?.cache_runs || 0),
        localRuns: Number(today?.local_runs || 0)
      },
      runs: runs.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return json({
      ok: false,
      module: "AIMonitor",
      error: err.message,
      runs: []
    }, 500);
  }
}