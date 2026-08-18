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

export async function onRequest(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({ ok: false, error: "Ingen databasanslutning." }, 500);
    }

    const method = context.request.method;
    const url = new URL(context.request.url);

    if (method === "GET") {
      const matchId = url.searchParams.get("match_id");
      const category = url.searchParams.get("category");

      const conditions = [];
      const values = [];

      if (matchId) {
        conditions.push("vc.match_id = ?");
        values.push(matchId);
      }

      if (category) {
        conditions.push("vc.category = ?");
        values.push(category);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const statement = db.prepare(`
        SELECT
          vc.*,
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
        ${where}
        ORDER BY vc.id DESC
        LIMIT 200
      `);

      const result = values.length
        ? await statement.bind(...values).all()
        : await statement.all();

      const items = (result.results || []).map(row => ({
        ...row,
        analysis: row.analysis_id
          ? {
              id: row.analysis_id,
              provider: row.analysis_provider,
              analysis: row.analysis,
              strengths: row.strengths,
              improvements: row.improvements,
              coaching_points: row.coaching_points,
              score: row.score,
              created_at: row.analysis_created_at
            }
          : null
      }));

      return json({ ok: true, items });
    }

    if (method === "POST") {
      const body = await readBody(context.request);

      if (!body.title?.trim() || !body.video_url?.trim()) {
        return json({
          ok: false,
          error: "Titel och videolänk måste anges."
        }, 400);
      }

      const result = await db.prepare(`
        INSERT INTO video_clips (
          match_id,
          title,
          video_url,
          start_seconds,
          end_seconds,
          period,
          game_clock,
          category,
          note,
          player_involved,
          status,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        body.match_id || null,
        body.title.trim(),
        body.video_url.trim(),
        Number(body.start_seconds || 0),
        Number(body.end_seconds || 0),
        body.period || "",
        body.game_clock || "",
        body.category || "Other",
        body.note || "",
        body.player_involved === 0 ? 0 : 1,
        "pending"
      ).run();

      return json({
        ok: true,
        saved: true,
        id: result.meta?.last_row_id || null
      });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");

      if (!id) {
        return json({ ok: false, error: "Klipp-id saknas." }, 400);
      }

      await db.batch([
        db.prepare("DELETE FROM video_analyses WHERE clip_id = ?").bind(id),
        db.prepare("DELETE FROM video_clips WHERE id = ?").bind(id)
      ]);

      return json({ ok: true, deleted: true, id });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (err) {
    return json({
      ok: false,
      module: "VideoClips",
      error: err.message
    }, 500);
  }
}
