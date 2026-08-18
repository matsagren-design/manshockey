-- E30.2 Auto Matchdata
CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT,
  games_found INTEGER DEFAULT 0,
  games_matched INTEGER DEFAULT 0,
  games_updated INTEGER DEFAULT 0,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source_started
ON sync_runs(source, started_at);
