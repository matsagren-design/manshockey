# MansHockey Enterprise 2026.1

Nyheter:
- GameCenter-flik
- Live-scoreboard
- Period, klocka och skott
- Matchhändelser/tidslinje
- Måns spelarstatistik per match
- Utökad AI-kontext
- D1-tabeller: game_events och player_stats

Viktigt:
Kör `schema/d1_schema.sql` i D1 Console om tabellerna saknas.
Om befintliga matches-tabellen saknar nya kolumner, kör ALTER TABLE-raderna i schema-filen.
