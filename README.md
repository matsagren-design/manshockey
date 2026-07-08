# MansHockey Pro X

Stor appversion med:

- Dashboard
- Matchcenter med inför/efterrapporter
- Livecenter
- Scout Center
- Resecenter/flygbevakning
- Media Watch
- Familjeportal
- Pushnotis-demo
- AI-assistent-demo
- Adminläge
- Cloudflare Functions: `/api/media`, `/api/flights`, `/api/match-report`

## Så uppdaterar du GitHub

1. Packa upp ZIP-filen.
2. Kopiera innehållet till din GitHub-mapp `manshockey`.
3. Ersätt befintliga filer.
4. GitHub Desktop visar ändringar.
5. Commit-meddelande: `MansHockey Pro X`.
6. Klicka `Commit to main` och sedan `Push origin`.
7. Cloudflare bygger automatiskt och uppdaterar manshockey.com.

## Cloudflare-inställningar

Nuvarande statiska inställning fungerar:
- Framework preset: None
- Build command: tomt
- Build output directory: `/`

## Viktigt

Flygpriser, live-resultat och riktiga pushnotiser kräver externa API:er/nycklar och Workers-konfiguration. Appen har färdiga platser/API-stubbar för detta.
