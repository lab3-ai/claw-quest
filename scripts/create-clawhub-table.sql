CREATE TABLE IF NOT EXISTS clawhub_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clawhub_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  summary TEXT,
  downloads INTEGER DEFAULT 0,
  installs_all_time INTEGER DEFAULT 0,
  installs_current INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  versions INTEGER DEFAULT 0,
  owner_handle TEXT,
  owner_display_name TEXT,
  owner_image TEXT,
  latest_version TEXT,
  latest_version_id TEXT,
  badges JSONB DEFAULT '{}',
  tags JSONB DEFAULT '{}',
  parsed_clawdis JSONB,
  clawhub_created_at TIMESTAMPTZ,
  clawhub_updated_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clawhub_skills_downloads ON clawhub_skills(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_clawhub_skills_stars ON clawhub_skills(stars DESC);
CREATE INDEX IF NOT EXISTS idx_clawhub_skills_owner ON clawhub_skills(owner_handle);
CREATE INDEX IF NOT EXISTS idx_clawhub_skills_crawled ON clawhub_skills(crawled_at);
