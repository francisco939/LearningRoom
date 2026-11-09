-- LearningRoom D1 schema, version 1.
--
-- D1 enforces foreign keys for application queries. The PRAGMA is kept here so
-- a local SQLite shell that applies this file manually also gets cascades.
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (email)
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_auth_sessions_token_hash ON auth_sessions (token_hash);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_email_tokens_token_hash ON email_tokens (token_hash);
CREATE INDEX idx_email_tokens_user_purpose ON email_tokens (user_id, purpose);
CREATE INDEX idx_email_tokens_expires_at ON email_tokens (expires_at);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK (json_valid(data)),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE user_progress (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK (json_valid(data)),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  mode TEXT,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE (user_id, client_id)
);

CREATE INDEX idx_study_sessions_user_started
  ON study_sessions (user_id, started_at DESC);
CREATE INDEX idx_study_sessions_user_updated
  ON study_sessions (user_id, updated_at DESC);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX idx_rate_limits_window_start ON rate_limits (window_start);
