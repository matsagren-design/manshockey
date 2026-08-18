# Spelschema

Källa i paketet: `public/data/brooks_schedule_2026_27.json`.

Import:
- Admin → Brooks 2026/27 → Importera / uppdatera schema.
- Endpoint: POST `/api/schedule-import`
- Förhandsvisning: GET `/api/schedule-import`

Importen matchar på `external_id`, vilket gör den idempotent.
