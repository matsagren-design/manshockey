CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opponent TEXT NOT NULL,
  game_date TEXT NOT NULL,
  home_away TEXT NOT NULL,
  arena TEXT,
  city TEXT,
  tv_link TEXT,
  map_url TEXT,
  weather_note TEXT,
  result TEXT,
  brooks_goals INTEGER,
  opponent_goals INTEGER,
  report_before TEXT,
  report_after TEXT,
  ai_summary TEXT,
  game_status TEXT DEFAULT 'Kommande',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scout_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  note TEXT,
  ai_comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  tag TEXT,
  summary TEXT,
  media_type TEXT DEFAULT 'link',
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_watch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  origin TEXT DEFAULT 'ARN',
  destination TEXT DEFAULT 'YYC',
  airline TEXT,
  max_price_sek INTEGER,
  depart_after TEXT DEFAULT '09:30',
  avoid_usa INTEGER DEFAULT 1,
  note TEXT,
  status TEXT DEFAULT 'Bevakas',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  title TEXT NOT NULL,
  category TEXT,
  note TEXT,
  file_key TEXT,
  url TEXT,
  status TEXT DEFAULT 'Aktiv',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  owner TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'Öppen',
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Kör bara vid behov om befintliga tabeller saknar nya kolumner:
-- ALTER TABLE matches ADD COLUMN map_url TEXT;
-- ALTER TABLE matches ADD COLUMN weather_note TEXT;
-- ALTER TABLE matches ADD COLUMN brooks_goals INTEGER;
-- ALTER TABLE matches ADD COLUMN opponent_goals INTEGER;
-- ALTER TABLE matches ADD COLUMN ai_summary TEXT;
-- ALTER TABLE matches ADD COLUMN game_status TEXT DEFAULT 'Kommande';
-- ALTER TABLE scout_reports ADD COLUMN ai_comment TEXT;
-- ALTER TABLE media_items ADD COLUMN match_id INTEGER;
-- ALTER TABLE media_items ADD COLUMN media_type TEXT DEFAULT 'link';
-- ALTER TABLE travel_watch ADD COLUMN match_id INTEGER;
-- ALTER TABLE travel_watch ADD COLUMN status TEXT DEFAULT 'Bevakas';
-- ALTER TABLE documents ADD COLUMN match_id INTEGER;
-- ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'Aktiv';
