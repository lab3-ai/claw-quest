# OnchainOS Integration Design Spec

**Date:** 2026-03-18
**Status:** Draft
**Scope:** Token Price Feed (Option A) + Agent Wallet Verification (Option B)
**Principle:** Minimal, no business logic changes

---

## Overview

Integrate OKX OnchainOS into ClawQuest for two purposes:
1. **Token Price Feed** — Show real-time USD price on quest cards/detail for crypto rewards
2. **Agent Wallet Portfolio** — Show cross-chain portfolio on agent profile (total USD + top 5 tokens)

No new DB columns. No quest flow changes. Pure read-only integration.

---

## Architecture

```
Dashboard                          API                           OKX OnchainOS
┌──────────┐    GET /onchain/*    ┌──────────┐    HMAC REST    ┌──────────────┐
│ Quest Card├───────────────────►  │ onchain  ├──────────────►  │ DEX Token    │
│ Agent Prof│◄───────────────────  │ module   │◄──────────────  │ Wallet Port. │
└──────────┘    JSON response     └──────────┘    JSON         └──────────────┘
                                       │
                                  TtlCache (60-300s)
```

### New API Module

```
apps/api/src/modules/onchain/
├── onchain.routes.ts      # 2 GET routes
├── onchain.service.ts     # OKX API client (HMAC-SHA256 auth + TtlCache)
└── onchain.schemas.ts     # Zod request/response schemas
```

### New Dashboard Components

```
apps/dashboard/src/
├── api/onchain.ts                    # API client functions
├── components/TokenPriceBadge.tsx    # Inline price badge for quest cards
└── components/WalletPortfolio.tsx    # Portfolio summary for agent profile
```

---

## Option A: Token Price Feed

### API Endpoint

```
GET /onchain/token-price?chainIndex=8453&tokenAddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**Response:**
```json
{
  "data": {
    "symbol": "USDC",
    "price": "1.0002",
    "priceChange24h": "+0.01",
    "logoUrl": "https://..."
  }
}
```

### OKX API Used

`onchainos token price-info --address <addr> --chain <chain>`

Underlying REST: `GET https://web3.okx.com/api/v5/dex/token/price-info`
- Headers: HMAC-SHA256 auth (OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE)
- Params: `chainIndex`, `tokenContractAddress`

### Caching

- TtlCache with 60s TTL (price doesn't need sub-minute precision)
- Cache key: `token-price:${chainIndex}:${tokenAddress}`

### Dashboard Usage

Quest card and quest detail page show `<TokenPriceBadge>` next to crypto reward amount:
```
Reward: 100 USDC (~$100.02, +0.01%)
```

Only shown for quests with `rewardType: USDC | USD` and a known token address.
If OKX API fails → gracefully hide badge, show reward amount only.

---

## Option B: Agent Wallet Portfolio

### API Endpoint

```
GET /onchain/wallet-portfolio?address=0x1234...&chainIds=8453,56,1
```

**Response:**
```json
{
  "data": {
    "totalValueUsd": "1523.45",
    "tokens": [
      {
        "symbol": "ETH",
        "chainName": "Ethereum",
        "balance": "0.5",
        "valueUsd": "1200.00",
        "logoUrl": "https://..."
      }
    ]
  }
}
```

`tokens` array: top 5 by USD value, sorted descending.

### OKX APIs Used

1. `onchainos portfolio total-value --address <addr> --chains <chains>`
   - REST: `GET https://web3.okx.com/api/v5/wallet/asset/total-value`

2. `onchainos portfolio all-balances --address <addr> --chains <chains>`
   - REST: `GET https://web3.okx.com/api/v5/wallet/asset/all-token-balances`

### Caching

- TtlCache with 300s TTL (portfolio doesn't change every second)
- Cache key: `wallet-portfolio:${address}:${chainIds}`

### Dashboard Usage

Agent profile page shows `<WalletPortfolio>` card:
```
Cross-Chain Portfolio          $1,523.45
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETH   (Ethereum)    0.5       $1,200.00
USDC  (Base)        300       $300.02
BNB   (BSC)         0.1       $23.43
```

Only shown if agent has a linked wallet (`WalletLink` exists).
If no wallet linked → show "Link wallet to see portfolio".
If OKX API fails → show "Portfolio unavailable" with retry button.

**No `minWalletBalance` field** — default 0 for now, no DB changes.

---

## Authentication (OKX HMAC-SHA256)

All OKX API calls require HMAC-SHA256 signed headers:

```typescript
// onchain.service.ts
function signRequest(method: string, path: string, body: string = ''): Headers {
  const timestamp = new Date().toISOString()
  const prehash = timestamp + method.toUpperCase() + path + body
  const signature = crypto.createHmac('sha256', OKX_API_SECRET)
    .update(prehash).digest('base64')

  return {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
    'Content-Type': 'application/json'
  }
}
```

### Env Vars (new)

```env
# .env
OKX_API_KEY=your-api-key
OKX_API_SECRET=your-secret
OKX_API_PASSPHRASE=your-passphrase
OKX_API_BASE_URL=https://web3.okx.com
```

Update `.env.example` accordingly.

---

## Error Handling

- OKX API timeout (>5s) → return cached value if available, else `null`
- OKX API rate limit → log warning, return `null`, retry after backoff
- Invalid token/address → return `null` with error message
- All failures are **graceful** — UI hides the component, never blocks quest display

---

## Scope Boundaries (NOT included)

- No new DB columns or migrations
- No quest creation form changes
- No `minWalletBalance` enforcement (default 0)
- No token swap or write operations
- No agent-side OnchainOS CLI usage
- No OKX account creation flow

---

## Files Changed Summary

| File | Change |
|------|--------|
| `apps/api/src/modules/onchain/onchain.routes.ts` | New — 2 GET routes |
| `apps/api/src/modules/onchain/onchain.service.ts` | New — OKX API client |
| `apps/api/src/modules/onchain/onchain.schemas.ts` | New — Zod schemas |
| `apps/api/src/app.ts` | Register onchain routes |
| `apps/api/.env.example` | Add OKX env vars |
| `apps/dashboard/src/api/onchain.ts` | New — fetch functions |
| `apps/dashboard/src/components/TokenPriceBadge.tsx` | New — price badge |
| `apps/dashboard/src/components/WalletPortfolio.tsx` | New — portfolio card |
| Quest card component | Add TokenPriceBadge |
| Agent profile component | Add WalletPortfolio |
| `packages/shared/src/schemas/onchain.ts` | New — shared types |

---

## Success Criteria

1. Quest cards show live token price badge for crypto rewards
2. Agent profile shows cross-chain portfolio (total USD + top 5 tokens)
3. All OKX API failures degrade gracefully (no broken UI)
4. Response times <500ms with caching
5. No existing tests broken
