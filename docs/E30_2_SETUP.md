# E30.2 – Auto Matchdata

## Vad patchen gör
- Läser officiell BCHL-schedule för Brooks.
- Uppdaterar endast `result`, `brooks_goals`, `opponent_goals` och `game_status`.
- Skriver inte över FloHockey-länk, rapporter, scoutdata, AI-data eller manuella anteckningar.
- Avbryter utan D1-ändringar om BCHL-sidan inte går att tolka med tillräcklig säkerhet.
- Loggar varje körning i `sync_runs`.

## Installation
1. Kopiera patchens filer in i lokala `manshockey`.
2. Kör `schema/e30_2_auto_sync_migration.sql` i D1 Console.
3. Commit: `E30.2 Auto Matchdata`
4. Push origin.
5. Kontrollera grön Cloudflare deploy.
6. Admin → `Synka BCHL nu`.

## Automatisk körning
Patchen innehåller `.github/workflows/bchl-auto-sync.yml`.
För att aktivera schemalagd körning behöver samma hemliga token finnas på två ställen:

Cloudflare Pages:
- Variable/Secret: `SYNC_TOKEN`

GitHub repository:
- Actions secret: `MANSHOCKEY_SYNC_TOKEN`

Värdena ska vara identiska och slumpmässiga/långa.

Workflow kör två gånger per dygn och kan även startas manuellt från GitHub Actions.

## Säkerhet
Endpointen accepterar:
- aktiv adminsession från manshockey.com, eller
- `Authorization: Bearer <SYNC_TOKEN>` för automation.

## Viktigt
BCHL kan ändra HTML-strukturen. Därför kräver parsern minst 20 Brooks-rader.
Om den inte når tröskeln loggas `parser_guard` och ingen match ändras.
