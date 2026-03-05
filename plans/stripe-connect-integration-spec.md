# Stripe Connect Integration Spec for ClawQuest

> **Status**: Implemented (v0.13.0)
> **Purpose**: Fiat payment support alongside existing crypto escrow. Sponsors fund quests with credit card, winners receive fiat payouts, sponsors can get refunds — all via Stripe Connect.

---

## Context

ClawQuest has 3 payment use cases, originally crypto-only:

1. **Fund Quest** — Sponsor deposits funds into escrow
2. **Distribute Rewards** — Escrow distributes to winners (FCFS/Leaderboard/Lucky Draw)
3. **Refund** — Remaining funds returned to sponsor

The schema already had `fundingMethod: "stripe" | "crypto"` and related fields. The Stripe module mirrors all 3 flows for fiat, keeping crypto flow untouched.

---

## Architecture Decision

### Why Stripe Connect (not basic Stripe, not Polar.sh)

**Polar.sh** was initially considered but only supports payouts to the account owner — cannot distribute to third-party users (winners). Covers only 1 of 3 required flows.

**Basic Stripe** can collect payments and issue refunds but cannot transfer funds to other users. Covers 2 of 3 flows.

**Stripe Connect** with **Separate Charges and Transfers** model covers all 3:
- Collect payment from sponsors via Checkout Session
- Hold funds on platform account
- Transfer to connected accounts (winners) with full control over timing and splits
- Refund original payment (full or partial)

### Account Type: Express

Stripe Express connected accounts for winners. Stripe handles all KYC/compliance via hosted onboarding UI. ClawQuest controls payout timing and amounts.

### Charge Model: Separate Charges and Transfers

Sponsor pays ClawQuest platform → ClawQuest holds funds → transfers to winner connected accounts after quest completes. This gives full control over timing, multi-party splits, and partial refunds.

---

## Payment Flows

### Flow 1 — Fund Quest (Fiat)

1. Sponsor selects "Pay with Card" on fund page
2. API creates Stripe Checkout Session with quest metadata
3. Sponsor redirected to Stripe-hosted checkout page
4. Sponsor completes payment
5. Stripe fires `checkout.session.completed` webhook
6. API verifies signature, updates quest: `fundingStatus = confirmed`, `fundingMethod = stripe`, sets quest live (or scheduled if `startAt` is future)

### Flow 2 — Distribute Rewards (Fiat)

1. Creator/admin triggers distribution via dashboard
2. API checks `fundingMethod === 'stripe'` and routes to Stripe distribute handler
3. Fetches eligible participants (completed/submitted/verified, not yet paid)
4. Filters to participants with connected Stripe accounts
5. Calls same distribution calculator as crypto (FCFS/Leaderboard/Lucky Draw) with amount in cents
6. For each winner: creates Stripe Transfer to their Express connected account
7. Updates `payoutTxHash` with Stripe transfer ID, `payoutStatus = paid`

### Flow 3 — Refund (Fiat)

1. Creator/admin triggers refund via dashboard
2. API calculates remaining amount: `rewardAmount - sum(already distributed)`
3. Issues partial Stripe refund against original `payment_intent`
4. Webhook `charge.refunded` confirms refund completion
5. Quest updated: `refundStatus = completed`, `status = cancelled`

### Winner Onboarding (Stripe Connect)

1. Winner visits `/stripe-connect` page in dashboard
2. Clicks "Connect Stripe Account"
3. API creates Express account (or resumes existing onboarding) via `stripe.accounts.create()`
4. Winner redirected to Stripe-hosted onboarding URL for KYC
5. After completion, `account.updated` webhook fires → `stripeConnectedOnboarded = true`
6. Winner can view Express dashboard via login link

---

## Module Structure

```
apps/api/src/modules/stripe/
├── stripe.config.ts            # Stripe client singleton, env-based config, isStripeConfigured() guard
├── stripe.service.ts           # Core logic: createFundCheckout(), distributeFiat(), refundFiat()
├── stripe-connect.service.ts   # Express onboarding: createConnectedAccount(), getConnectedAccountStatus(), createDashboardLink()
├── stripe.webhook.ts           # Webhook route: signature verification + 3 event handlers
└── stripe.routes.ts            # 7 endpoints: checkout, distribute, refund, connect/onboard, connect/status, connect/dashboard, webhook
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/stripe/checkout/:questId` | JWT | Create Stripe Checkout Session for quest funding |
| POST | `/stripe/distribute/:questId` | JWT | Distribute fiat rewards to winners |
| POST | `/stripe/refund/:questId` | JWT | Refund fiat quest funding to sponsor |
| POST | `/stripe/connect/onboard` | JWT | Start/resume Stripe Express onboarding |
| GET | `/stripe/connect/status` | JWT | Check connected account onboarding status |
| GET | `/stripe/connect/dashboard` | JWT | Get Stripe Express dashboard login link |
| POST | `/stripe/webhook` | None (Stripe sig) | Handle Stripe webhook events |

All JWT-protected endpoints also verify quest ownership (creator or admin). All endpoints return 503 if Stripe is not configured.

---

## Webhook Events Handled

| Event | Handler | Action |
|-------|---------|--------|
| `checkout.session.completed` | Fund confirmation | Set `fundingStatus = confirmed`, transition quest to live/scheduled |
| `charge.refunded` | Refund confirmation | Set `refundStatus = completed`, record refund amount |
| `account.updated` | Onboarding complete | Set `stripeConnectedOnboarded = true` for user |

All handlers are idempotent (check existing status before updating).

---

## Database Changes

3 new fields on `User` model:

| Field | Type | Purpose |
|-------|------|---------|
| `stripeConnectedAccountId` | String? @unique | Stripe Express account ID (acct_xxx) for receiving payouts |
| `stripeConnectedOnboarded` | Boolean @default(false) | Whether KYC is complete and account can receive transfers |
| `stripeCustomerId` | String? @unique | Stripe customer ID (cus_xxx) for sponsors |

No changes to Quest model — existing fields reused: `stripeSessionId`, `stripePaymentId`, `fundingMethod`, `fundingStatus`, `fundedAt`, `fundedAmount`, `refundStatus`, `refundAmount`, `refundedAt`.

---

## Frontend Changes

| Page | Change |
|------|--------|
| Fund Quest (`fund.tsx`) | Added Crypto/Card payment method toggle. Card flow calls checkout API → redirects to Stripe |
| Create Quest (`create.tsx`) | Added "Save & Pay with Card" button for fiat rail |
| Manage Quest (`manage.tsx`) | Distribute/refund routes to Stripe or Escrow based on `fundingMethod` |
| Stripe Connect (`stripe-connect.tsx`) | New page: onboarding status, connect button, dashboard link |

---

## Key Decisions & Trade-offs

1. **Express over Custom accounts**: Less dev work, Stripe handles KYC. Trade-off: winners see Stripe branding during onboarding.

2. **Separate Charges and Transfers over Destination Charges**: More control over multi-party splits and timing. Essential for FCFS/Leaderboard/Lucky Draw distribution patterns.

3. **Reusing `payoutTxHash` field**: Stores both on-chain tx hashes and Stripe transfer IDs. Differentiated by `fundingMethod`. Avoids schema bloat.

4. **Reusing distribution calculator**: Same FCFS/Leaderboard/Lucky Draw algorithms for both crypto and fiat. Just different unit (cents vs token smallest unit). BigInt math works for both.

5. **Graceful degradation**: Stripe is fully optional. If env vars are not set, server starts normally, all Stripe endpoints return 503. No crash, no error on startup.

6. **@fastify/raw-body for webhooks**: Stripe signature verification requires the raw request body. Added `@fastify/raw-body` plugin with `global: false` to avoid impacting other routes.

---

## Environment Variables

```
STRIPE_SECRET_KEY=""                    # sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=""               # whsec_... (from Stripe Dashboard or CLI)
# STRIPE_PLATFORM_FEE_PERCENT="0"      # Platform fee on distributions (0 = no fee)
VITE_STRIPE_PUBLISHABLE_KEY=""         # pk_test_... or pk_live_... (frontend)
```

---

## Setup Instructions

1. **Install packages**: `pnpm --filter api add stripe @fastify/raw-body`
2. **Run migration**: `cd apps/api && pnpm prisma migrate dev --name add_stripe_connect_fields`
3. **Create Stripe account**: Register at stripe.com, enable Connect
4. **Configure env vars**: Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
5. **Set up webhook**: In Stripe Dashboard → Webhooks → add endpoint `https://your-api.com/stripe/webhook` → select events: `checkout.session.completed`, `charge.refunded`, `account.updated`
6. **Local testing**: `stripe listen --forward-to localhost:3000/stripe/webhook` (Stripe CLI)
7. **Test card**: `4242 4242 4242 4242` (any future date, any CVC)

---

## Testing Checklist

- [ ] Sponsor creates quest → selects "Fiat" → completes Stripe checkout → quest goes live
- [ ] Webhook receives `checkout.session.completed` → `fundingStatus = confirmed`
- [ ] Winner onboards Stripe Express account → `isOnboarded = true`
- [ ] Creator triggers distribute → funds transferred to winners' accounts
- [ ] Creator triggers refund → sponsor's card refunded
- [ ] Partial refund works (some winners already paid, rest refunded)
- [ ] Quest with no Stripe-connected winners → distribute fails gracefully
- [ ] Wrong funding method errors (e.g., trying fiat distribute on crypto quest)
- [ ] Server starts without Stripe config → no crash, endpoints return 503
