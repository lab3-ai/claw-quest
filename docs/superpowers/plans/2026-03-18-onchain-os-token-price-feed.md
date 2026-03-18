# OnchainOS Token Price Feed — Deferred Plan (Option A)

> **Status:** DEFERRED — implement after Option B (Wallet Portfolio) is complete.

**Goal:** Show real-time token price badge on quest cards/detail for crypto rewards via OKX OnchainOS `okx-dex-token` API.

**Spec:** `docs/superpowers/specs/2026-03-18-onchain-os-integration-design.md` — see "Option A" section.

**Depends on:** Option B's `onchain.service.ts` (reuse HMAC auth + TtlCache pattern)

---

## Scope

- API: `GET /onchain/token-price?chainIndex=8453&tokenAddress=0x...`
- OKX API: `okx-dex-token` → `price-info` command
- Dashboard: `<TokenPriceBadge>` component on quest card + quest detail
- Cache: 60s TTL
- Display: `100 USDC (~$100.02, +0.01%)`
- Graceful degradation: hide badge if API fails

## Files to Create/Modify

- `apps/api/src/modules/onchain/onchain.schemas.ts` — add token price schemas
- `apps/api/src/modules/onchain/onchain.service.ts` — add `getTokenPrice()` function
- `apps/api/src/modules/onchain/onchain.routes.ts` — add GET /token-price route
- `apps/dashboard/src/components/TokenPriceBadge.tsx` — new component
- Quest card + quest detail components — add TokenPriceBadge

## Notes

- Reuses the same HMAC auth from Option B's service
- Only shown for quests with crypto reward types (USDC, USDT, etc.)
- No DB changes needed
