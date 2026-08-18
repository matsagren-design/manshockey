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

function localAnalysis(clip) {
  const note = clip.note?.trim();

  return {
    provider: "local",
    score: null,
    analysis: note
      ? `Klippet "${clip.title}" är registrerat som ${clip.category || "videosekvens"}. Observationen är: ${note}`
      : `Klippet "${clip.title}" är sparat, men det saknas en observation att analysera.`,
    strengths: "Lägg in en tydlig observation om scanning, positionering, puckhantering och beslut.",
    improvements: "Komplettera klippet med vad som hände före, under och efter situationen.",
    coaching_points: "AI-analys med språkmodell används först när klippet har tillräcklig text- och matchkontext."
  };
}

async function callOpenAI(apiKey, clip, match) {
  const system = `
Du är AI Video Coach för MansHockey Enterprise.
Spelaren är Måns Ågren, back i Brooks Bandits.

Du får metadata och en mänsklig observation om ett videoklipp.
Du ser INTE själva videon i denna version.

Regler:
- Svara på svenska.
- Hitta inte på vad som syns i videon.
- Analysera endast observationen och matchkontexten.
- Sätt score 1-10 endast om underlaget räcker, annars null.
- Returnera strikt JSON med nycklarna:
  analysis, strengths, improvements, coaching_points, score.
`;

  const payload = {
    clip: {
      title: clip.title,
      category: clip.category,
      period: clip.period,
      gameClock: clip.game_clock,
      startSeconds: clip.start_seconds,
      endSeconds: clip.end_seconds,
      note: clip.note
    },
    match: match || null
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
          content: JSON.stringify(payload)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "video_coach_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              analysis: { type: "string" },
              strengths: { type: "string" },
              improvements: { type: "string" },
              coaching_points: { type: "string" },
              score: { type: ["integer", "null"], minimum: 1, maximum: 10 }
            },
            required: [
              "analysis",
              "strengths",
              "improvements",
              "coaching_points",
              "score"
            ]
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  const outputText =
    data.output_text ||
    data.output?.flatMap(item => item.content || [])
      ?.find(content => content.type === "output_text")?.text;

  if (!outputText) {
    throw new Error("OpenAI returnerade ingen analystext.");
  }

  return JSON.parse(outputText);
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;

    if (!db) {
      return json({ ok: false, error: "Ingen databasanslutning." }, 500);
    }

    const body = await readBody(context.request);
    const clipId = body.clip_id;

    if (!clipId) {
      return json({ ok: false, error: "clip_id saknas." }, 400);
    }

    const clip = await db.prepare(`
      SELECT *
      FROM video_clips
      WHERE id = ?
      LIMIT 1
    `).bind(clipId).first();

    if (!clip) {
      return json({ ok: false, error: "Videoklippet hittades inte." }, 404);
    }

    const match = clip.match_id
      ? await db.prepare("SELECT * FROM matches WHERE id = ? LIMIT 1")
          .bind(clip.match_id)
          .first()
      : null;

    let result = localAnalysis(clip);
    let provider = "local";

    const hasEnoughContext =
      Boolean(clip.note?.trim()) &&
      clip.note.trim().length >= 20 &&
      Boolean(context.env.OPENAI_API_KEY);

    if (hasEnoughContext) {
      try {
        result = await callOpenAI(context.env.OPENAI_API_KEY, clip, match);
        provider = "openai";
      } catch (err) {
        result = {
          ...localAnalysis(clip),
          analysis: `${localAnalysis(clip).analysis}\n\nOpenAI kunde inte användas: ${err.message}`
        };
        provider = "fallback";
      }
    }

    await db.prepare(`
      INSERT INTO video_analyses (
        clip_id,
        match_id,
        provider,
        analysis,
        strengths,
        improvements,
        coaching_points,
        score,
        data_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clip.id,
      clip.match_id || null,
      provider,
      result.analysis || "",
      result.strengths || "",
      result.improvements || "",
      result.coaching_points || "",
      result.score ?? null,
      `${clip.updated_at || clip.created_at || ""}|${clip.note?.length || 0}`
    ).run();

    await db.prepare(`
      UPDATE video_clips
      SET status = 'analyzed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(clip.id).run();

    return json({
      ok: true,
      module: "AIVideoCoach",
      provider,
      clipId: clip.id,
      analysis: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return json({
      ok: false,
      module: "AIVideoCoach",
      error: err.message
    }, 500);
  }
}
