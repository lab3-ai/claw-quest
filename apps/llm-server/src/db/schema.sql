-- LLM Server tables for Cloudflare D1 (SQLite)
-- Run: wrangler d1 execute clawquest-llm --file src/db/schema.sql
-- Local:  wrangler d1 execute clawquest-llm --local --file src/db/schema.sql

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key TEXT UNIQUE NOT NULL,
  api_key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  max_token_usage INTEGER DEFAULT 1000000
);

CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id),
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  endpoint TEXT,
  model TEXT
);

CREATE TABLE IF NOT EXISTS upstream_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model_name TEXT,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0
);
