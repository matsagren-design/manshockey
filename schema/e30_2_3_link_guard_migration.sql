-- MansHockey E30.2.3 Link Guard
-- Kör en gång i Cloudflare D1 Console.

ALTER TABLE matches ADD COLUMN game_center_url TEXT;

CREATE INDEX IF NOT EXISTS idx_matches_game_date_opponent
ON matches(game_date, opponent);
