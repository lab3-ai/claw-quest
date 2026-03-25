import type { ApiKey, TokenUsage, UpstreamUrl } from '../types';

// --- API Keys ---

export async function findApiKeyByHash(db: D1Database, hash: string): Promise<ApiKey | null> {
  return db
    .prepare('SELECT * FROM api_keys WHERE api_key_hash = ? AND is_active = 1')
    .bind(hash)
    .first<ApiKey>();
}

export async function createApiKey(
  db: D1Database,
  apiKey: string,
  apiKeyHash: string,
  name: string | null,
  maxTokenUsage?: number,
): Promise<ApiKey> {
  const result = await db
    .prepare('INSERT INTO api_keys (api_key, api_key_hash, name, max_token_usage) VALUES (?, ?, ?, ?) RETURNING *')
    .bind(apiKey, apiKeyHash, name, maxTokenUsage ?? 1000000)
    .first<ApiKey>();
  if (!result) throw new Error('Failed to create API key');

  // Initialize token_usage row
  await db
    .prepare('INSERT INTO token_usage (api_key_id) VALUES (?)')
    .bind(result.id)
    .run();

  return result;
}

// --- Token Usage ---

export async function getTokenUsage(db: D1Database, apiKeyId: number): Promise<TokenUsage | null> {
  return db
    .prepare('SELECT * FROM token_usage WHERE api_key_id = ?')
    .bind(apiKeyId)
    .first<TokenUsage>();
}

export async function incrementTokenUsage(
  db: D1Database,
  apiKeyId: number,
  tokensIn: number,
  tokensOut: number,
  endpoint: string,
  model: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE token_usage
       SET tokens_in = tokens_in + ?,
           tokens_out = tokens_out + ?,
           request_count = request_count + 1,
           last_used_at = CURRENT_TIMESTAMP,
           endpoint = ?,
           model = ?
       WHERE api_key_id = ?`,
    )
    .bind(tokensIn, tokensOut, endpoint, model, apiKeyId)
    .run();
}

// --- Upstream URLs ---

export async function getActiveUpstreams(db: D1Database): Promise<UpstreamUrl[]> {
  const result = await db
    .prepare('SELECT * FROM upstream_urls WHERE is_active = 1 ORDER BY priority DESC, id ASC')
    .all<UpstreamUrl>();

  return result.results;
}

export async function getAllUpstreams(db: D1Database): Promise<UpstreamUrl[]> {
  const result = await db
    .prepare('SELECT * FROM upstream_urls ORDER BY priority DESC, id ASC')
    .all<UpstreamUrl>();
  return result.results;
}

export async function createUpstream(
  db: D1Database,
  data: { base_url: string; api_key: string; model_name?: string; name?: string; priority?: number },
): Promise<UpstreamUrl> {
  const result = await db
    .prepare(
      `INSERT INTO upstream_urls (base_url, api_key, model_name, name, priority)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
    )
    .bind(data.base_url, data.api_key, data.model_name ?? null, data.name ?? null, data.priority ?? 0)
    .first<UpstreamUrl>();
  if (!result) throw new Error('Failed to create upstream URL');
  return result;
}

export async function updateUpstreamStats(
  db: D1Database,
  id: number,
  success: boolean,
): Promise<void> {
  const col = success ? 'success_count = success_count + 1' : 'error_count = error_count + 1';
  await db
    .prepare(`UPDATE upstream_urls SET ${col}, last_used_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(id)
    .run();
}

export async function deleteUpstream(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM upstream_urls WHERE id = ?').bind(id).run();
}
