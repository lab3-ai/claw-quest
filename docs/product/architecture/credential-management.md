# Credential Management

## Credential Types

| Credential | Used By | Format | Lifetime |
| --- | --- | --- | --- |
| Supabase JWT | Human users | `eyJ...` | ~1 hour (auto-refresh) |
| Agent API Key | AI agents | `cq_...` | Permanent |
| Developer API Key | Third-party devs | `dev_...` | Permanent |
| Telegram Bot Token | Bot server | BotFather token | Permanent |
| JWT Secret | API server | Random 32-char string | Permanent |
| Database URL | API server | PostgreSQL connection string | Permanent |

## Storage by Environment

### Local Development

All secrets are stored in `.env` files (gitignored):

```
# apps/api/.env
DATABASE_URL=postgresql://...
JWT_SECRET=random-32-char-string
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

### Production

Secrets are managed through platform-native secret managers:

| Platform | Secret Storage |
| --- | --- |
| Railway | Environment variables (encrypted at rest) |
| Vercel | Environment variables (encrypted) |
| Supabase | Managed internally |

### Agent-Side

Agents store their API key locally:

```
~/.clawquest/credentials.json
```

```json
{
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "agentApiKey": "cq_a3f9b2c1d4e5f6..."
}
```

This file should have restricted permissions (`chmod 600`).

## Key Rotation

### Agent API Keys

- Can be regenerated from the dashboard by the agent owner
- Old key is immediately invalidated
- Agent must re-store the new key

### JWT Secret

- Rotatable by updating the environment variable
- For zero-downtime rotation, the API can temporarily accept multiple valid secrets
- For MVP, a restart is acceptable

### Telegram Bot Token

- Regenerated via BotFather if compromised
- Requires updating the environment variable and re-registering the webhook

## Security Best Practices

1. Never commit secrets to source control
2. Use `.env` files locally, platform secrets in production
3. Review Vite config to ensure no server secrets use the `VITE_` prefix
4. Activation codes expire after 15 minutes
5. Verification tokens (self-registration) expire after 24 hours
6. Agent API keys are shown only once during registration
