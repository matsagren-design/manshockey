function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
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

async function safeAll(db, sql, binds = []) {
  try {
    const statement = db.prepare(sql);

    const result = binds.length
      ? await statement.bind(...binds).all()
      : await statement.all();

    return result.results || [];
  } catch {
    return [];
  }
}

function clean(value) {
  return String(value || "").trim();
}

function localReport(match, scout) {
  const known = [
    scout.recent_form && `Form: ${scout.recent_form}`,
    scout.playing_style && `Spelstil: ${scout.playing_style}`,
    scout.forecheck && `Forecheck: ${scout.forecheck}`,
    scout.breakout && `Breakout: ${scout.breakout}`,
    scout.special_teams &&
      `Special teams: ${scout.special_teams}`,
    scout.key_players &&
      `Nyckelspelare: ${scout.key_players}`,
    scout.strengths && `Styrkor: ${scout.strengths}`,
    scout.weaknesses && `Svagheter: ${scout.weaknesses}`
  ].filter(Boolean);

  const location =
    match.home_away === "Hemma" ? "vs" : "@";

  return `AI Opponent Scout

Match:
Brooks ${location} ${match.opponent}

Tillgängligt underlag:
${
  known.length
    ? known.map(item => `• ${item}`).join("\n")
    : "• Begränsat underlag"
}

Preliminär matchplan:
• Spela enkelt ur egen zon.
• Sätt förstapasset tidigt under press.
• Håll tajt gap genom neutral zon.
• Kommunicera tydligt mellan backarna.

Måns fokus:
${
  scout.mans_focus ||
  "Förstapass, gap control, boxplay-positionering och enkla beslut under press."
}

Kommentar:
Komplettera motståndardata för en mer specifik AI-rapport.`;
}

async function getMatch(db, matchId) {
  if (matchId) {
    return await db
      .prepare(`
        SELECT *
        FROM matches
        WHERE id = ?
        LIMIT 1
      `)
      .bind(matchId)
      .first();
  }

  return await db
    .prepare(`
      SELECT *
      FROM matches
      WHERE game_date >= datetime('now')
      ORDER BY game_date ASC
      LIMIT 1
    `)
    .first();
}

async function getScout(db, match) {
  const existing = await db
    .prepare(`
      SELECT *
      FROM opponent_scouts
      WHERE match_id = ?
      LIMIT 1
    `)
    .bind(match.id)
    .first();

  return (
    existing || {
      match_id: match.id,
      opponent: match.opponent,
      recent_form: "",
      playing_style: "",
      forecheck: "",
      breakout: "",
      special_teams: "",
      key_players: "",
      strengths: "",
      weaknesses: "",
      mans_focus: "",
      coach_notes: "",
      ai_report: "",
      provider: "local",
      data_version: ""
    }
  );
}

async function callOpenAI(apiKey, match, scout, media, history) {
  const system = `
Du är AI Opponent Scout för MansHockey Enterprise.

Spelaren är Måns Ågren, back i Brooks Bandits.
Du skriver på svenska.

Regler:
- Använd endast angivet underlag.
- Hitta inte på statistik, spelare, skador eller taktik.
- Markera tydligt när uppgifter saknas.
- Ge praktiska rekommendationer för Brooks och Måns.
- Var konkret och hockeynära.
- Strukturera svaret med rubrikerna:
  1. Lägesbild
  2. Motståndarens styrkor
  3. Sårbarheter
  4. Rekommenderad matchplan
  5. Måns fokus
  6. Tre coachpunkter
`;

  const payload = {
    match,
    manualScout: scout,
    relatedMedia: media,
    previousMeetings: history
  };

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content:
              "Skapa en opponent-scoutingrapport utifrån följande underlag:\n\n" +
              JSON.stringify(payload, null, 2)
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenAI svarade med ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  const outputText =
    data.output_text ||
    data.output
      ?.flatMap(item => item.content || [])
      ?.find(content => content.type === "output_text")
      ?.text;

  if (!outputText) {
    throw new Error(
      "OpenAI returnerade ingen opponent-rapport."
    );
  }

  return outputText;
}

async function saveRun(
  db,
  matchId,
  provider,
  ok,
  details,
  durationMs
) {
  try {
    await db
      .prepare(`
        INSERT INTO ai_runs (
          module,
          action,
          match_id,
          provider,
          ok,
          details,
          duration_ms
        )
        VALUES (
          'ai-opponent-scout',
          'generate',
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `)
      .bind(
        String(matchId),
        provider || "local",
        ok ? 1 : 0,
        JSON.stringify(details || {}),
        Number(durationMs || 0)
      )
      .run();
  } catch {
    // Loggning får aldrig stoppa huvudfunktionen.
  }
}

async function saveScout(db, match, body, report, provider) {
  const fields = {
    recent_form: clean(body.recent_form),
    playing_style: clean(body.playing_style),
    forecheck: clean(body.forecheck),
    breakout: clean(body.breakout),
    special_teams: clean(body.special_teams),
    key_players: clean(body.key_players),
    strengths: clean(body.strengths),
    weaknesses: clean(body.weaknesses),
    mans_focus: clean(body.mans_focus),
    coach_notes: clean(body.coach_notes)
  };

  const dataVersion = [
    fields.recent_form,
    fields.playing_style,
    fields.forecheck,
    fields.breakout,
    fields.special_teams,
    fields.key_players,
    fields.strengths,
    fields.weaknesses,
    fields.mans_focus,
    fields.coach_notes
  ].join("|");

  await db
    .prepare(`
      INSERT INTO opponent_scouts (
        match_id,
        opponent,
        recent_form,
        playing_style,
        forecheck,
        breakout,
        special_teams,
        key_players,
        strengths,
        weaknesses,
        mans_focus,
        coach_notes,
        ai_report,
        provider,
        data_version,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(match_id) DO UPDATE SET
        opponent = excluded.opponent,
        recent_form = excluded.recent_form,
        playing_style = excluded.playing_style,
        forecheck = excluded.forecheck,
        breakout = excluded.breakout,
        special_teams = excluded.special_teams,
        key_players = excluded.key_players,
        strengths = excluded.strengths,
        weaknesses = excluded.weaknesses,
        mans_focus = excluded.mans_focus,
        coach_notes = excluded.coach_notes,
        ai_report = excluded.ai_report,
        provider = excluded.provider,
        data_version = excluded.data_version,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(
      match.id,
      match.opponent,
      fields.recent_form,
      fields.playing_style,
      fields.forecheck,
      fields.breakout,
      fields.special_teams,
      fields.key_players,
      fields.strengths,
      fields.weaknesses,
      fields.mans_focus,
      fields.coach_notes,
      report || "",
      provider || "local",
      dataVersion
    )
    .run();
}

export async function onRequest(context) {
  const startedAt = Date.now();

  try {
    const db = context.env.DB;

    if (!db) {
      return json({
        ok: false,
        error: "Ingen databasanslutning."
      }, 500);
    }

    const url = new URL(context.request.url);

    const body =
      context.request.method === "POST"
        ? await readBody(context.request)
        : {};

    const matchId =
      body.match_id ||
      url.searchParams.get("match_id");

    const match = await getMatch(db, matchId);

    if (!match) {
      return json({
        ok: false,
        module: "AIOpponentScout",
        error: "Ingen match hittades."
      }, 404);
    }

    if (context.request.method === "GET") {
      const scout = await getScout(db, match);

      return json({
        ok: true,
        module: "AIOpponentScout",
        match,
        scout,
        timestamp: new Date().toISOString()
      });
    }

    const action = body.action || "save";

    const current = {
      ...(await getScout(db, match)),
      ...body
    };

    if (action === "save") {
      await saveScout(
        db,
        match,
        current,
        current.ai_report || "",
        current.provider || "local"
      );

      return json({
        ok: true,
        module: "AIOpponentScout",
        action: "save",
        saved: true,
        matchId: match.id
      });
    }

    if (action === "generate") {
      const media = await safeAll(
        db,
        `
        SELECT *
        FROM media_items
        WHERE
          match_id = ?
          OR lower(title) LIKE lower(?)
          OR lower(summary) LIKE lower(?)
        ORDER BY id DESC
        LIMIT 20
        `,
        [
          match.id,
          `%${match.opponent}%`,
          `%${match.opponent}%`
        ]
      );

      const history = await safeAll(
        db,
        `
        SELECT *
        FROM matches
        WHERE opponent = ?
          AND id <> ?
          AND result IS NOT NULL
        ORDER BY game_date DESC
        LIMIT 10
        `,
        [
          match.opponent,
          match.id
        ]
      );

      const sourceText = [
        current.recent_form,
        current.playing_style,
        current.forecheck,
        current.breakout,
        current.special_teams,
        current.key_players,
        current.strengths,
        current.weaknesses,
        current.mans_focus,
        current.coach_notes,
        ...media.map(
          item =>
            `${item.title || ""} ${item.summary || ""}`
        ),
        ...history.map(
          item => item.result || ""
        )
      ]
        .join(" ")
        .trim();

      let report = "";
      let provider = "local";

      if (
        context.env.OPENAI_API_KEY &&
        sourceText.length >= 60
      ) {
        try {
          report = await callOpenAI(
            context.env.OPENAI_API_KEY,
            match,
            current,
            media,
            history
          );

          provider = "openai";
        } catch {
          report = localReport(match, current);
          provider = "fallback";
        }
      } else {
        report = localReport(match, current);
        provider = "local";
      }
          await saveScout(
        db,
        match,
        current,
        report,
        provider
      );

      await saveRun(
        db,
        match.id,
        provider,
        true,
        {
          opponent: match.opponent,
          media: media.length,
          history: history.length
        },
        Date.now() - startedAt
      );

      return json({
        ok: true,
        module: "AIOpponentScout",
        action: "generate",
        provider,
        saved: true,
        match,
        report,
        summary: {
          media: media.length,
          previousMeetings: history.length
        },
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      });
    }

    return json({
      ok: false,
      module: "AIOpponentScout",
      error: "Okänd action."
    }, 400);

  } catch (err) {
    return json({
      ok: false,
      module: "AIOpponentScout",
      error: err.message
    }, 500);
  }
}