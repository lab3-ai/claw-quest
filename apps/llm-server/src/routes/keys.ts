import { Hono } from 'hono';
import type { Env, ApiKey } from '../types';
import { sha256, requireApiKey } from '../middleware/auth';
import { createApiKey, getTokenUsage } from '../db/queries';

const keys = new Hono<{ Bindings: Env; Variables: { apiKey: ApiKey } }>();

/** POST /api/v1/keys — create a new API key (authenticated with SECRET_KEY) */
keys.post('/api/v1/keys', async (c) => {
  const body = await c.req.json<{ secret_key: string; name?: string; max_token_usage?: number }>();

  if (!body.secret_key || body.secret_key !== c.env.SECRET_KEY) {
    return c.json({ detail: 'Invalid secret key' }, 401);
  }

  // Generate sk-{64 random chars}
  const raw = `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const apiKeyValue = `sk-${raw}`;
  const apiKeyHash = await sha256(apiKeyValue);

  const record = await createApiKey(c.env.DB, apiKeyValue, apiKeyHash, body.name ?? null, body.max_token_usage);

  return c.json({
    api_key: record.api_key,
    name: record.name,
    max_token_usage: record.max_token_usage,
    created_at: record.created_at,
    message: 'API key created successfully. Save this key as it won\'t be shown again.',
  });
});

/** GET /api/v1/keys/usage — get token usage for the authenticated key */
keys.get('/api/v1/keys/usage', requireApiKey, async (c) => {
  const apiKey = c.var.apiKey;
  const usage = await getTokenUsage(c.env.DB, apiKey.id);

  return c.json({
    api_key_id: apiKey.id,
    name: apiKey.name,
    is_active: apiKey.is_active === 1,
    max_token_usage: apiKey.max_token_usage,
    tokens_in: usage?.tokens_in ?? 0,
    tokens_out: usage?.tokens_out ?? 0,
    total_tokens: (usage?.tokens_in ?? 0) + (usage?.tokens_out ?? 0),
    request_count: usage?.request_count ?? 0,
    last_used_at: usage?.last_used_at ?? null,
  });
});

export default keys;
