-- MansHockey Enterprise 2026.1 schema

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
  brooks_shots INTEGER,
  opponent_shots INTEGER,
  period TEXT DEFAULT 'Ej startad',
  game_clock TEXT,
  report_before TEXT,
  report_after TEXT,
  ai_summary TEXT,
  game_status TEXT DEFAULT 'Kommande',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  period TEXT,
  game_time TEXT,
  event_type TEXT,
  team TEXT,
  player TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  plus_minus INTEGER DEFAULT 0,
  pim INTEGER DEFAULT 0,
  shots INTEGER DEFAULT 0,
  toi TEXT,
  hits INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  note TEXT,
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

-- ALTER TABLE matches ADD COLUMN brooks_shots INTEGER;
-- ALTER TABLE matches ADD COLUMN opponent_shots INTEGER;
-- ALTER TABLE matches ADD COLUMN period TEXT DEFAULT 'Ej startad';
-- ALTER TABLE matches ADD COLUMN game_clock TEXT;
