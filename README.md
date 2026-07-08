# Måns Hockey – Cloudflare Pages

Publiceringsklar PWA för manshockey.com.

## Publicera på Cloudflare Pages

1. Logga in på Cloudflare.
2. Gå till **Workers & Pages**.
3. Klicka **Create** → **Pages** → **Upload assets**.
4. Ladda upp ZIP-filen `manshockey_cloudflare_pages_upload.zip`.
5. När projektet är live: gå till **Custom domains**.
6. Lägg till `manshockey.com`.
7. Öppna `https://manshockey.com` i Safari och välj **Dela → Lägg till på hemskärmen**.

## Ingår

- PWA/installerbar app
- Manifest och appikon
- Service worker/offline-cache
- Brooks Bandits-schema i svensk tid
- Nästa match/nedräkning
- Måns statistik, sparad lokalt i telefonen
- Familjeanteckningar, sparade lokalt i telefonen
- Scouttracker
- Resevy med kartlänkar
- ICS-kalenderfil

## Uppdatera schema

Byt ut `data/schedule.json` och ladda upp projektet igen till Cloudflare Pages.


## Mediabevakning

Appen har nu en flik **Media** som söker efter:

- "Måns Ågren"
- "Mans Agren"
- "Måns Agren"
- "Brooks Bandits" + "Måns"
- "BCHL" + "Måns Ågren"

### Direkt i Cloudflare Pages

Mappen `functions/api/media.js` gör att appen kan hämta Google News RSS via `/api/media` när appen är publicerad på Cloudflare Pages.

### Regelbunden kontroll

Filen `cloudflare-worker-media-watch.js` är en valfri Worker för daglig bakgrundskontroll. Skapa en Cloudflare Worker, bind ett KV namespace som `MANS_MEDIA_KV`, och lägg till en Cron Trigger, t.ex. `0 7 * * *` för kontroll varje morgon.


## Nytt: Matchrapporter
Appen har nu fliken **Matchrapporter**. Där kan familjen skapa och spara:
- inför-rapport per match,
- efter-rapport per match,
- Måns-noteringar, resultat, länkar, highlights och egna sammanfattningar.

Rapporterna sparas lokalt i telefonens/webbläsarens lagring. För delning mellan flera familjemedlemmar krävs senare en liten backend/databas, exempelvis Cloudflare D1 eller Supabase.

## Flygresor
Appen innehåller nu fliken **Flygresor** för ARN–YYC med Air Canada, KLM och Finnair.

Funktioner:
- Söklänkar till Google Flights, Kayak och Skyscanner.
- Direktlänkar till Air Canada, KLM och Finnair.
- Lokalt sparade bevakningar med maxpris, tidigaste avgång, enkel/tur-retur, inga USA-mellanlandningar och kort restid.
- Förberedd Cloudflare Pages Function: `/api/flights` för framtida koppling mot flyg-API.

För levande priser och automatiska notiser behöver `/api/flights` kopplas till en extern flygdatakälla, exempelvis Amadeus, Skyscanner eller Kiwi/Tequila.

## Version 2.0 – professionell struktur

Det här paketet kan publiceras med ett kommando från mappen:

```cmd
npx wrangler pages deploy . --project-name=manshockey
```

Alternativt:

```cmd
npm run deploy
```

Innehåller även `package.json`, `wrangler.toml`, `_headers` och `_redirects` för en renare Cloudflare Pages-publicering.

### Viktigt om live-data
- Media-API finns som Cloudflare Pages Function: `/api/media`.
- Flyg-API finns som förberedd endpoint: `/api/flights`, men riktiga priser kräver API-nyckel från extern leverantör.
- Matchresultat/matchrapporter sparas lokalt tills vi kopplar D1/Supabase eller liknande.
