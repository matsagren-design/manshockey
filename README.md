# MansHockey 3.0

React + TypeScript + Vite + Cloudflare Pages/Functions + D1-förberedd app.

## Lokal test
```bash
npm install
npm run dev
```

## Cloudflare Pages
Framework preset: Vite
Build command: `npm run build`
Build output directory: `dist`

## D1
Skapa databas i Cloudflare och kör `schema/d1.sql`. Lägg databas-ID i `wrangler.toml`.

## Deploy via GitHub
Kopiera filerna till GitHub-repot `manshockey`, commit och push. Cloudflare bygger automatiskt.
