# MansHockey 10.0 Auth

Innehåller:
- D1-tabeller för users och sessions
- Login/logout/me API
- Adminåtgärder kräver inloggad admin
- CMS CRUD finns kvar för matcher, scout, media, resor och dokument

## Cloudflare Pages
- Framework preset: None
- Build command: npm install && npm run build
- Build output directory: dist

## Publicering
1. Packa upp.
2. Kopiera innehållet till GitHub-mappen `manshockey`.
3. Commit: `MansHockey 10 Auth`
4. Push origin.

## Viktigt
Kör SQL i `schema/d1_schema.sql`.
Lägg sedan in första admin enligt `docs/AUTH_SETUP.md`.
