# Local Setup Guide — ClawQuest

This guide helps team members set up the local development environment.

## 1. System Requirements
- **Node.js**: >= 20.0.0
- **pnpm**: (recommended) `npm install -g pnpm`

## 2. Environment Variables (.env)
To run the project, you need `.env` files containing database connection strings and API keys.

### API (Backend)
Create `apps/api/.env` with the following (get values from the team lead):
- `DATABASE_URL`: Supabase connection string (pooling).
- `DIRECT_URL`: Direct connection string (used for migrations).
- `JWT_SECRET`: Token encryption key.
- `TELEGRAM_BOT_TOKEN`: Test bot token.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase admin key.

#### Stripe (optional — server runs fine without it)
- `STRIPE_SECRET_KEY`: Secret key from Stripe Dashboard (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (`whsec_...`).
- `STRIPE_PLATFORM_FEE_PERCENT`: Platform fee on distribution (default `0`).

### Dashboard (Frontend)
Create `.env.local` in the **root directory** and in `apps/dashboard/` with:
```bash
VITE_API_URL="http://localhost:3000"
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_ANON_KEY="..." # Get from team lead
VITE_STRIPE_PUBLISHABLE_KEY="..." # Publishable key from Stripe (pk_test_...), optional
```

## 3. Installation & Running
Open a terminal at the project root:

```bash
# Install dependencies
pnpm install

# Build shared package (required on first run)
pnpm --filter @clawquest/shared build

# Run Prisma migration (if schema changed)
cd apps/api && source .env && pnpm prisma migrate dev && cd ../..

# Run both Backend and Frontend simultaneously
pnpm dev
```

After startup:
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs (if available)

## 4. Database Notes
The team currently shares a test database on **Supabase**. You don't need to install PostgreSQL locally unless you want to test independently.
- Database URL format: `postgresql://postgres.[ID]:[PASS]@aws-1-...`

## 5. Stripe (Fiat Payments — optional)
If you need to test card payment features:

1. Create an account at [stripe.com](https://stripe.com), enable **Connect**
2. Add env vars to `apps/api/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Add `VITE_STRIPE_PUBLISHABLE_KEY` to `apps/dashboard/.env.local`
4. Test webhooks locally: install [Stripe CLI](https://stripe.com/docs/stripe-cli), then run:
```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```
5. Test card: `4242 4242 4242 4242` (any expiry date, any CVC)

> **Note**: The server runs normally without Stripe config. The `/stripe/*` endpoints will return 503 if not configured.

## 6. Troubleshooting
- **pnpm errors**: Make sure you're using Node 20+.
- **Cannot connect to API**: Check if `apps/api` started successfully (check terminal logs).
- **Auth errors**: Ensure `VITE_SUPABASE_URL` and `ANON_KEY` in the env file are correct.
- **Prisma migration errors**: Ensure `DATABASE_URL` and `DIRECT_URL` are set in `apps/api/.env`.
- **`source .env` errors**: The `.env` file is in `apps/api/`, not the root. Run `cd apps/api` first.
