# MansHockey Enterprise 30.1 — Schedule Import

Nyheter:
- Brooks Bandits 2026/27-schema med 55 för närvarande kända matcher.
- 3 försäsongsmatcher + 52 publicerade grundseriematcher.
- D1-import i Admin: `Importera / uppdatera schema`.
- Importen använder `external_id` och kan köras igen utan dubletter.
- Dashboard väljer nästa framtida match automatiskt.
- Två BCHL Showcase-matcher kan läggas till senare när BCHL publicerat dem i schemakällan.

## Installation
1. Kopiera filerna till `manshockey`.
2. Kör `schema/schedule_import_migration.sql` i D1 Console en gång.
3. Commit och Push: `MansHockey Enterprise 30.1 Schedule Import`
4. När deployen är grön: logga in → Admin → Importera / uppdatera schema.

Om migrationen säger att en kolumn redan finns, kör bara de ALTER-rader som saknas.
