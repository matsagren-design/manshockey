# E30.2.3 Link Guard

## Viktig ändring
`tv_link` får bara uppdateras med en verifierad direkt FloHockey-eventlänk:

- host: `flohockey.tv`
- path börjar med `/events/`

BCHL redirect-/partnerlänkar och generiska FloHockey-länkar avvisas.

## BCHL Game Center
Separat kolumn:

`game_center_url`

Godkänd URL måste vara:

`https://bchl.ca/stats/game-center/<nummer>`

## Databas
Kör `schema/e30_2_3_link_guard_migration.sql` en gång innan ny endpoint deployas.

## Ingen ändring
- GitHub Action
- SYNC_TOKEN
- FIRECRAWL_API_KEY
- schemaimport E30.1.1
- rapporter/scout/AI
