PRAGMA foreign_keys = ON;

ALTER TABLE quote_requests ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN city TEXT;

CREATE INDEX IF NOT EXISTS idx_quote_requests_archived_status_updated
  ON quote_requests(archived, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_type
  ON quote_requests(request_type);

CREATE TABLE IF NOT EXISTS site_media (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_file_id TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (image_file_id) REFERENCES site_media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_works_publish_order
  ON works(published, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS before_after_cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  before_file_id TEXT,
  after_file_id TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (before_file_id) REFERENCES site_media(id) ON DELETE SET NULL,
  FOREIGN KEY (after_file_id) REFERENCES site_media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_before_after_publish_order
  ON before_after_cases(published, sort_order, created_at DESC);

-- Prepared structures for the second content phase. They remain empty and are
-- intentionally not rendered until the FR confirms the real services/capacity.
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_file_id TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  accepts_direct_quote INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (image_file_id) REFERENCES site_media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_services_active_order
  ON services(active, sort_order);

CREATE TABLE IF NOT EXISTS capability_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_capabilities_active_order
  ON capability_entries(active, sort_order);
