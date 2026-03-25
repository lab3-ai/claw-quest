# Runbooks & Operations

## 🚨 Incident Response

### Bot Not Responding
1. Check **API Logs**: Is the webhook endpoint throwing 500s?
2. Check **Telegram Status**: Is Telegram down?
3. Check **Webhook Info**:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```
   If `pending_update_count` is high, we are processing too slowly or erroring out.

### Database Connection Failures
1. Check **Pool Status**: Are we hitting connection limits?
2. **Action**: Restart API service to flush pool.
3. **Escalation**: upgrade Supabase compute.

## 🔄 Routine Operations

### Database Migrations
1. Create migration locally:
   ```bash
   npx prisma migrate dev --name <descriptive-name>
   ```
2. Commit `prisma/migrations` folder.
3. CI/CD runs `prisma migrate deploy`.

### Rotating Secrets
1. Update `JWT_SECRET` in Railway variables.
2. Redeploy API.
3. Users will be logged out.

### Backups
- Supabase performs daily backups automatically.
- **Manual**: Use Supabase dashboard to trigger PITR if needed.
