-- MansHockey Cloud CMS schema

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opponent TEXT NOT NULL,
  game_date TEXT NOT NULL,
  home_away TEXT NOT NULL,
  arena TEXT,
  city TEXT,
  tv_link TEXT,
  result TEXT,
  report_before TEXT,
  report_after TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scout_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  tag TEXT,
  summary TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_watch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT DEFAULT 'ARN',
  destination TEXT DEFAULT 'YYC',
  airline TEXT,
  max_price_sek INTEGER,
  depart_after TEXT DEFAULT '09:30',
  avoid_usa INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  note TEXT,
  file_key TEXT,
  url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
