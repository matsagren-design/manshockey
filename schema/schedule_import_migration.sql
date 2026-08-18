-- MansHockey Enterprise 30.1 schedule-import migration
-- Run each ALTER only if the column does not already exist in your matches table.

ALTER TABLE matches ADD COLUMN external_id TEXT;
ALTER TABLE matches ADD COLUMN season_type TEXT DEFAULT 'regular';
ALTER TABLE matches ADD COLUMN source TEXT;
ALTER TABLE matches ADD COLUMN source_url TEXT;
ALTER TABLE matches ADD COLUMN scout_priority TEXT;
ALTER TABLE matches ADD COLUMN note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
