-- Whisker Isles shared leaderboard (database: jessyux-whisker, binding WHISKER_DB)
CREATE TABLE IF NOT EXISTS players (
  key TEXT PRIMARY KEY,          -- lower-case name
  name TEXT NOT NULL,            -- as last typed
  points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  last INTEGER NOT NULL,
  cat TEXT                       -- JSON {b: breed id, t: {coat, mark, iris, collar}} of the cat last played
);
-- for a database made before the cat column: ALTER TABLE players ADD COLUMN cat TEXT;
CREATE INDEX IF NOT EXISTS players_rank ON players (points DESC, wins DESC, games ASC);

-- each finished game counts once
CREATE TABLE IF NOT EXISTS games (
  gid TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);

-- hashed address and salt only; rows are removed after 2 hours
CREATE TABLE IF NOT EXISTS rate (
  hash TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_hash_at ON rate (hash, at);

-- who played each game and where they finished (kept from when this table was added)
CREATE TABLE IF NOT EXISTS game_players (
  gid TEXT NOT NULL,
  key TEXT NOT NULL,             -- lower-case name
  name TEXT NOT NULL,
  place INTEGER NOT NULL,
  points INTEGER NOT NULL,       -- leaderboard points from this game
  vp INTEGER,                    -- in-game score
  cat TEXT,
  PRIMARY KEY (gid, key)
);
CREATE INDEX IF NOT EXISTS games_at ON games (at DESC);

-- the finished island of each game, as JSON of numbers and tile names
CREATE TABLE IF NOT EXISTS game_boards (
  gid TEXT PRIMARY KEY,
  board TEXT NOT NULL
);

-- game feedback and bug reports sent from the game
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  type TEXT NOT NULL,            -- 'game' or 'bug'
  name TEXT,                     -- optional
  message TEXT NOT NULL,
  info TEXT,                     -- build, screen size and browser
  done INTEGER NOT NULL DEFAULT 0  -- ticked off on the admin page
);
