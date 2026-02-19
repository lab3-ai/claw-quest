# Security & Reliability

## 🛡 Threat Model

### 1. Telegram Spoofing
- **Risk**: Attacker mimics Telegram webhook calls.
- **Mitigation**: Verify `X-Telegram-Bot-Api-Secret-Token` header on every request matching the secret set during `setWebhook`.

### 2. Session Hijacking
- **Risk**: Stolen JWT allows impersonation.
- **Mitigation**: Short-lived access tokens (15m), HttpOnly cookies (best) or LocalStorage with XSS protection practices (content security policy).

### 3. Database Leaks
- **Risk**: `DATABASE_URL` exposed in client bundle.
- **Mitigation**: Review `Vite` config to ensure no secrets prefixed with `VITE_` unless public. Use server-side env vars only for DB.

## 🔐 Credentials Management
- **Local**: `.env` file (gitignored).
- **Production**: Platform-native secrets manager (Railway/Vercel).
- **Rotation**: Bot Token and JWT Secret should be rotatable with zero downtime (via supporting multiple valid keys temporarily, though for MVP a restart is acceptable).

## 🚦 Reliability Controls

### 1. Rate Limiting
- **API**: `fastify-rate-limit`. Limit 100 req/min per IP generally.
- **Bot**: Telegram has built-in limits (~30 msg/sec). We must queue outgoing messages to respect this if volume is high. `bottleneck` library is useful here.

### 2. Validation
- **Input**: Zod schemas for EVERY endpoint.
- **Type Safety**: End-to-end type sharing via Monorepo.

### 3. Audit Logs
- Critical actions (Quest Start, Agent Creation, Telegram Link) are logged to `AgentLog` table immutable.
