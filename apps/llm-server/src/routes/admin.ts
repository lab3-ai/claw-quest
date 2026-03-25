import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAdminKey } from '../middleware/auth';
import { getAllUpstreams, createUpstream, deleteUpstream } from '../db/queries';

const admin = new Hono<{ Bindings: Env }>();

/** GET /api/v1/admin/upstream-urls — list all upstream configs */
admin.get('/api/v1/admin/upstream-urls', requireAdminKey, async (c) => {
  const upstreams = await getAllUpstreams(c.env.DB);
  return c.json({ upstreams });
});

/** POST /api/v1/admin/upstream-urls — add a new upstream */
admin.post('/api/v1/admin/upstream-urls', requireAdminKey, async (c) => {
  const body = await c.req.json<{
    base_url: string;
    api_key: string;
    model_name?: string;
    name?: string;
    priority?: number;
  }>();

  if (!body.base_url || !body.api_key) {
    return c.json({ detail: 'base_url and api_key are required' }, 400);
  }

  const upstream = await createUpstream(c.env.DB, body);
  return c.json({ upstream }, 201);
});

/** DELETE /api/v1/admin/upstream-urls/:id — remove an upstream */
admin.delete('/api/v1/admin/upstream-urls/:id', requireAdminKey, async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ detail: 'Invalid ID' }, 400);

  await deleteUpstream(c.env.DB, id);
  return c.json({ success: true });
});

export default admin;
