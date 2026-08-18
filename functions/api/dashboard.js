export async function onRequest(context) {
  try {
    const db = context.env.DB;
    if (!db) throw new Error("Database not connected");

    const [matches, media, scout, travel, documents] = await Promise.all([
      db.prepare("SELECT * FROM matches ORDER BY game_date ASC LIMIT 500").all(),
      db.prepare("SELECT * FROM media_items ORDER BY id DESC LIMIT 5").all(),
      db.prepare("SELECT * FROM scout_reports ORDER BY id DESC LIMIT 5").all(),
      db.prepare("SELECT * FROM travel_watch ORDER BY id DESC LIMIT 5").all(),
      db.prepare("SELECT * FROM documents ORDER BY id DESC LIMIT 5").all()
    ]);

    const now = new Date();

    const upcoming = matches.results.filter(m => new Date(m.game_date) >= now);
    const completed = matches.results.filter(m =>
      m.result ||
      String(m.game_status || "").toLowerCase().includes("klar") ||
      String(m.game_status || "").toLowerCase().includes("completed") ||
      String(m.period || "").toLowerCase().includes("final")
    );

    return Response.json({
      ok: true,
      app: "MansHockey Enterprise 30",
      module: "Dashboard",
      dashboard: {
        nextMatch: upcoming[0] || null,
        latestResult: completed[completed.length - 1] || null,
        counters: {
          matches: matches.results.length,
          media: media.results.length,
          scouts: scout.results.length,
          travel: travel.results.length,
          documents: documents.results.length
        },
        media: media.results,
        scoutReports: scout.results,
        travelWatch: travel.results,
        documents: documents.results
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return Response.json({ ok: false, module: "Dashboard", error: err.message }, { status: 500 });
  }
}