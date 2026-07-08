# MansHockey X Architecture

## Frontend
React/Vite på Cloudflare Pages.

## Backend
Cloudflare Pages Functions:
- /api/health
- /api/matches
- /api/analytics
- /api/media
- /api/travel
- /api/ai-coach
- /api/upload-url

## Data
Cloudflare D1:
- users
- matches
- player_stats
- scout_reports
- media_items
- files
- travel_watch
- ai_notes

## Files
Cloudflare R2 för bilder, video och dokument.

## Auth
Rekommendation: Cloudflare Access för admin-delar.
