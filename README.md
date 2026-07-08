# MansHockey 7.0

Innehåller:
- Inloggningsgrund/adminläge
- D1-schema och API-lager
- R2-filuppladdningsförberedelse
- Matcharkiv
- Scoutmodul
- Media- och reseintegrationer
- PWA-manifest och service worker
- Cloudflare Functions med fallback om D1/R2 ännu inte är kopplat

## Cloudflare Pages
- Framework preset: None
- Build command: npm install && npm run build
- Build output directory: dist

## Publicering
1. Packa upp zippen.
2. Kopiera innehållet till GitHub-mappen `manshockey`.
3. Ersätt gamla filer.
4. Commit: `MansHockey 7.0`
5. Push origin.

## Nästa steg
Se `docs/CLOUDFLARE_SETUP.md` för D1, R2 och Access.
