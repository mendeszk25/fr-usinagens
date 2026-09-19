PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  public_code TEXT NOT NULL UNIQUE,
  tracking_token_hash TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  request_type TEXT NOT NULL,
  quantity INTEGER,
  material TEXT,
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'received',
  public_note TEXT,
  internal_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status_created
  ON quote_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created
  ON quote_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS quote_files (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quote_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quote_files_quote ON quote_files(quote_id);

CREATE TABLE IF NOT EXISTS quote_status_history (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  status TEXT NOT NULL,
  public_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quote_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote
  ON quote_status_history(quote_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
