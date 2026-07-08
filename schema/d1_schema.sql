-- MansHockey X / Version 8 schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'family',
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
  result TEXT,
  brooks_goals INTEGER,
  opponent_goals INTEGER,
  report_before TEXT,
  report_after TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scout_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  tag TEXT,
  summary TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  file_key TEXT,
  url TEXT,
  match_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt TEXT,
  answer TEXT,
  source_context TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
