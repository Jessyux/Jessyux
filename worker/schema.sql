CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'draw')),
  text TEXT,
  strokes TEXT,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_created ON messages (created DESC);

-- hashed address and salt only; rows are removed after 2 hours
CREATE TABLE IF NOT EXISTS rate (
  hash TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_hash_at ON rate (hash, at);
