import type { MiddlewareHandler } from 'hono';
import type { Env, ApiKey } from '../types';
import { findApiKeyByHash } from '../db/queries';

type AuthEnv = { Bindings: Env; Variables: { apiKey: ApiKey } };

/** SHA-256 hash using Web Crypto API (available in CF Workers) */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Middleware: verify Bearer sk-xxx API key. Sets c.var.apiKey on success. */
export const requireApiKey: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ detail: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const hash = await sha256(token);
  const apiKey = await findApiKeyByHash(c.env.DB, hash);

  if (!apiKey) {
    return c.json({ detail: 'Invalid API key' }, 401);
  }

  c.set('apiKey', apiKey);
  await next();
};

/** Middleware: verify X-Admin-Secret-Key header for admin routes */
export const requireAdminKey: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const adminKey = c.req.header('X-Admin-Secret-Key');
  if (!adminKey || adminKey !== c.env.ADMIN_SECRET_KEY) {
    return c.json({ detail: 'Invalid admin secret key' }, 401);
  }
  await next();
};
