# MansHockey Enterprise 13

Ny version där Matchcenter är egen huvudflik.

Viktigt om D1-tabellerna redan fanns:
- CREATE TABLE ändrar inte befintliga tabeller.
- Om API:t ger fel om saknade kolumner, kör ALTER TABLE-raderna längst ned i `schema/d1_schema.sql`.
