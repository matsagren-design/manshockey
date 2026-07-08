# MansHockey Pro v5

Ny design ovanpå den fungerande Cloudflare/GitHub-grunden.

## Viktigt innan du ersätter filer
Din nuvarande `.gitignore` verkar ha skapats som Word-fil. Skapa en riktig textfil som heter exakt `.gitignore` och innehåller:

```
.wrangler/
node_modules/
dist/
.env
.DS_Store
Thumbs.db
```

## Installera v5 i GitHub-mappen
1. Packa upp ZIP-filen i en tillfällig mapp.
2. Öppna GitHub Desktop → Repository → Show in Explorer.
3. Kopiera innehållet från den uppackade v5-mappen till GitHub-mappen.
4. Ersätt befintliga filer när Windows frågar.
5. Kontrollera att `.wrangler` inte commitas.
6. I GitHub Desktop: Summary: `MansHockey Pro v5`
7. Klicka `Commit to main` och sedan `Push origin`.
8. Cloudflare deployar automatiskt till manshockey.com.

## Cloudflare-inställningar
För denna version:
- Framework preset: None
- Build command: tomt
- Build output directory: `/`

## Innehåll i v5
- Ny appdesign
- Dashboard
- Matchcenter
- Matchrapporter inför/efter match
- Måns statistik
- Flygresor ARN–YYC
- Mediaflik
- Familjeflik
- PWA-stöd
- Cloudflare Functions-grund
