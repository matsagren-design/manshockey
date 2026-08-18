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

function localScoutSummary(reports, match) {
  if (!reports.length) {
    return `AI Scout saknar scoutrapporter för ${match?.opponent || "vald match"}.

Rekommenderad första scoutning:
• Gap Control
• First Pass
• Defensive Zone
• Physical Play
• Skating
• Decision Making

Efter första rapporten kan AI Scout skapa styrkor, utvecklingsområden och trend.`;
  }

  const avg = Math.round(
    reports.reduce((a, r) => a + Number(r.score || 0), 0) / reports.length
  );

  const best = [...reports].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const low = [...reports].sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0];

  return `AI Scout – automatisk rapport

Match:
Brooks ${match?.home_away === "Hemma" ? "vs" : "@"} ${match?.opponent || "okänd motståndare"}

Scout score:
${avg}

Styrka:
${best?.category || "saknas"} (${best?.score || "—"})

Utvecklingsområde:
${low?.category || "saknas"} (${low?.score || "—"})

Sammanfattning:
Måns bör fortsätta bygga sitt defensiva spel kring gap control, förstapass och enkelt spel ur egen zon. Nästa steg är att följa samma kategorier match för match för att se trend över tid.`;
}

async function callOpenAI(apiKey, match, reports) {
  const system = `
Du är AI Scout för MansHockey Enterprise 30.
Spelaren är Måns Ågren, back, left, född 2006, Brooks Bandits BCHL.

Svara på svenska.
Analysera endast utifrån given data.
Hitta inte på statistik.
Om underlag saknas, säg det tydligt.
Ge konkret scoutanalys med:
1. Sammanfattning
2. Styrkor
3. Utvecklingsområden
4. Rekommendation inför nästa match
`;

  const payload = {
    match,
    scoutReports: reports
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
            "Skapa en automatisk AI Scout-rapport utifrån denna data:\n\n" +
            JSON.stringify(payload, null, 2)
        }
      ]
    })
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return data.output_text || data.output?.[0]?.content?.[0]?.text || "AI-svar saknar text.";
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
      return json({
        ok: false,
        module: "AIScout",
        error: "No match found"
      }, 404);
    }

    const reports = await safeAll(
      db,
      "SELECT * FROM scout_reports WHERE match_id = ? ORDER BY id DESC LIMIT 50",
      [match.id]
    );

    let answer = "";
    let provider = "local";

    try {
      if (!context.env.OPENAI_API_KEY || !reports.length) {
        throw new Error("OpenAI används inte utan scoutdata.");
      }

      answer = await callOpenAI(context.env.OPENAI_API_KEY, match, reports);
      provider = "openai";
    } catch {
      answer = localScoutSummary(reports, match);
      provider = "local";
    }

    return json({
      ok: true,
      module: "AIScout",
      provider,
      match,
      summary: {
        matchId: match.id,
        opponent: match.opponent,
        reports: reports.length
      },
      answer,
      reports,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return json({
      ok: false,
      module: "AIScout",
      error: err.message
    }, 500);
  }
}