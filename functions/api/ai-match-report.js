function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function safeAll(db, sql, bind = []) {
  try {
    const stmt = db.prepare(sql);
    const r = bind.length ? await stmt.bind(...bind).all() : await stmt.all();
    return r.results || [];
  } catch {
    return [];
  }
}

function localReport(match, events, scout, stats) {
  return `Automatisk matchrapport

Match:
Brooks ${match.home_away === "Hemma" ? "vs" : "@"} ${match.opponent}

Datum:
${match.game_date || "saknas"}

Arena:
${match.arena || "saknas"}

Resultat:
${match.result || "Matchen är ännu inte rapporterad som färdig."}

Underlag:
• Game events: ${events.length}
• Scout-rapporter: ${scout.length}
• Statistikposter: ${stats.length}

Sammanfattning:
Det finns ännu begränsat matchunderlag. När game events, scoutdata och spelarstatistik registreras kan AI Matchrapport skapa en mer detaljerad rapport med nyckelhändelser, Måns prestation och förbättringsområden.

Preliminär rekommendation:
Fortsätt följa förstapass, gap control, boxplay och enkelt spel ur egen zon.`;
}

async function callOpenAI(apiKey, match, events, scout, stats, media) {
  const system = `
Du är AI Match Reporter för MansHockey Enterprise 30.

Du skriver svenska matchrapporter om Brooks Bandits och Måns Ågren.
Måns är back, left, född 2006.

Regler:
- Svara på svenska.
- Använd endast den data du får.
- Hitta inte på statistik.
- Om data saknas, säg det tydligt.
- Skriv som en professionell hockeyrapport.
- Fokusera både på matchbilden och Måns utveckling.
- Dela upp svaret i rubriker.
`;

  const payload = {
    match,
    gameEvents: events,
    scoutReports: scout,
    playerStats: stats,
    media
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            "Skapa en automatisk matchrapport utifrån denna data:\n\n" +
            JSON.stringify(payload, null, 2)
        }
      ]
    })
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return data.output_text || data.output?.[0]?.content?.[0]?.text || "AI-svar saknar text.";
}

async function saveReport(db, matchId, answer, provider) {
  try {
    await db.prepare(`
      UPDATE matches
      SET report_after = ?,
          ai_summary = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      answer,
      answer.slice(0, 800),
      matchId
    ).run();
  } catch {}
}

export async function onRequest(context) {
  try {
    const db = context.env.DB;
    if (!db) return json({ ok: false, error: "Database not connected" }, 500);

    const body = await readBody(context.request);
    const url = new URL(context.request.url);
    const matchId = body.match_id || url.searchParams.get("match_id");

    let match = null;

    if (matchId) {
      match = await db.prepare("SELECT * FROM matches WHERE id = ? LIMIT 1").bind(matchId).first();
    } else {
      match = await db.prepare("SELECT * FROM matches ORDER BY game_date ASC LIMIT 1").first();
    }

    if (!match) {
      return json({ ok: false, module: "AIMatchReport", error: "No match found" }, 404);
    }

    const [events, scout, stats, media] = await Promise.all([
      safeAll(db, "SELECT * FROM game_events WHERE match_id = ? ORDER BY id ASC LIMIT 300", [match.id]),
      safeAll(db, "SELECT * FROM scout_reports WHERE match_id = ? ORDER BY id DESC LIMIT 100", [match.id]),
      safeAll(db, "SELECT * FROM player_stats WHERE match_id = ? ORDER BY id DESC LIMIT 100", [match.id]),
      safeAll(db, "SELECT * FROM media_items WHERE match_id = ? ORDER BY id DESC LIMIT 50", [match.id])
    ]);

    let answer = "";
    let provider = "local";

    try {
      if (!context.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY saknas");

      if (!events.length && !scout.length && !stats.length) {
        throw new Error("För lite matchdata för OpenAI-rapport.");
      }

      answer = await callOpenAI(context.env.OPENAI_API_KEY, match, events, scout, stats, media);
      provider = "openai";
    } catch {
      answer = localReport(match, events, scout, stats);
      provider = "local";
    }

    await saveReport(db, match.id, answer, provider);

    return json({
      ok: true,
      module: "AIMatchReport",
      provider,
      matchId: match.id,
      opponent: match.opponent,
      saved: true,
      summary: {
        events: events.length,
        scout: scout.length,
        stats: stats.length,
        media: media.length
      },
      report: answer,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return json({
      ok: false,
      module: "AIMatchReport",
      error: err.message
    }, 500);
  }
}