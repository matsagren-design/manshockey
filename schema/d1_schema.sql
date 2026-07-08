-- MansHockey 6.0 Cloudflare D1 schema

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opponent TEXT NOT NULL,
  game_date TEXT NOT NULL,
  home_away TEXT NOT NULL,
  arena TEXT,
  scout_level TEXT,
  tv_link TEXT,
  result TEXT,
  report_before TEXT,
  report_after TEXT,
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

CREATE TABLE IF NOT EXISTS family_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  note TEXT,
  url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  tag TEXT,
  published_at TEXT,
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

INSERT INTO matches (opponent, game_date, home_away, arena, scout_level, tv_link)
VALUES
('Spruce Grove Saints','2026-09-09T03:00:00+02:00','Hemma','Centennial Regional Arena','Försäsong','https://www.flohockey.tv/'),
('Okotoks Oilers','2026-09-12T03:05:00+02:00','Borta','Viking Rentals Centre','Försäsong','https://www.flohockey.tv/'),
('Okotoks Oilers','2026-09-13T03:00:00+02:00','Hemma','Centennial Regional Arena','Försäsong','https://www.flohockey.tv/');
