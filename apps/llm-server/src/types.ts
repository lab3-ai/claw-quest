export interface Env {
  DB: D1Database;
  SECRET_KEY: string;
  ADMIN_SECRET_KEY: string;
  UPSTREAM_BASE_URL: string;
  UPSTREAM_API_KEY: string;
  DEFAULT_MODEL?: string;
}

export interface ApiKey {
  id: number;
  api_key: string;
  api_key_hash: string;
  name: string | null;
  created_at: string;
  is_active: number;
  max_token_usage: number;
}

export interface TokenUsage {
  id: number;
  api_key_id: number;
  tokens_in: number;
  tokens_out: number;
  request_count: number;
  last_used_at: string;
  created_at: string;
  endpoint: string | null;
  model: string | null;
}

export interface UpstreamUrl {
  id: number;
  base_url: string;
  api_key: string;
  model_name: string | null;
  name: string | null;
  is_active: number;
  priority: number;
  created_at: string;
  last_used_at: string | null;
  error_count: number;
  success_count: number;
}
