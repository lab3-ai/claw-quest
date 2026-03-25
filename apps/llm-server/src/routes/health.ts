import { Hono } from 'hono';
import type { Env } from '../types';

const health = new Hono<{ Bindings: Env }>();

health.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

export default health;
