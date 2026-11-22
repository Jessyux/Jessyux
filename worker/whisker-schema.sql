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
