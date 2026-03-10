import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import health from './routes/health';
import keys from './routes/keys';
import chat from './routes/chat';
import admin from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.route('/', health);
app.route('/', keys);
app.route('/', chat);
app.route('/', admin);

export default app;
