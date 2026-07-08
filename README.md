# MansHockey 6.0

Innehåller de tre stora stegen:
1. Adminpanel/inloggningsläge.
2. Cloudflare D1-förberedelse med schema och API-functions.
3. Importläge för matchschema och datadrivet matchcenter.

## Cloudflare Pages-inställningar
- Framework preset: None
- Build command: npm install && npm run build
- Build output directory: dist

## Publicering
1. Packa upp zippen.
2. Kopiera innehållet till GitHub-mappen `manshockey`.
3. Ersätt gamla filer.
4. Commit: `MansHockey 6.0`
5. Push origin.

## D1 senare
När du vill aktivera riktig databas:
1. Skapa D1 i Cloudflare.
2. Kör `schema/d1_schema.sql`.
3. Lägg till D1-bindning i `wrangler.toml` med korrekt database_id.
