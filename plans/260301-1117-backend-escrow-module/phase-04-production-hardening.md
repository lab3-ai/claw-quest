# Phase 4: Production Hardening + Env Updates

## Context Links
- App entry: `apps/api/src/app.ts` (line 180 — poller start condition)
- Env example: `.env.example`
- Escrow config: `apps/api/src/modules/escrow/escrow.config.ts`

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 1h
- **Depends on**: Phase 3

Final polish: fix poller startup condition, update env docs, add health check, structured logging, graceful shutdown.

## Key Insights

1. **Startup condition bug**: `app.ts` line 180 checks `process.env.ESCROW_CONTRACT` (legacy single var). Should check `isEscrowConfigured()` which supports per-chain vars.
2. **No health indicator**: If poller silently stops (RPC down, rate limited), no one knows. Need a simple health check.
3. **Logging**: Current poller uses `server.log.info/warn/error` inconsistently + `console.log` in service. Standardize.

## Implementation Steps

### 1. Fix poller startup condition in `app.ts`

```typescript
// Before:
if (process.env.ESCROW_CONTRACT) {

// After:
import { isEscrowConfigured } from './modules/escrow/escrow.config';
if (isEscrowConfigured()) {
```

### 2. Add poller health state

In `escrow.poller.ts`, export a health object:

```typescript
export const escrowPollerHealth = {
    running: false,
    lastPollAt: null as Date | null,
    lastError: null as string | null,
    eventsProcessed: 0,
};
```

Update in `pollChain()` after each successful poll. Expose via existing `/escrow/supported-chains` or a new `/escrow/health` endpoint (admin only).

### 3. Update `.env.example`

Add new vars from Phase 1:
```
ESCROW_CONFIRMATION_BLOCKS=5    # blocks behind tip for safety (default 5)
ESCROW_POLL_INTERVAL=15000      # ms between polls (already documented)
```

### 4. Standardize logging

Replace all `console.log/warn` in escrow.service.ts with `server.log` or a passed logger. Since service functions don't have access to `server`, accept a logger parameter or use a module-level logger.

**KISS decision**: Service functions already receive `prisma` as first arg. Add optional `logger` param would complicate signatures. Instead: use a simple module-level `console` wrapper that can be replaced later. Not worth over-engineering.

Keep `console.log` but prefix all messages consistently:
- `[escrow:funded]`, `[escrow:distributed]`, `[escrow:refunded]`, `[escrow:emergency]`
- `[escrow:poller]` (already used)

### 5. Graceful shutdown

Already exists (line 111-114 in poller). Verify it clears interval on `onClose` hook. No changes needed.

### 6. Escrow health endpoint

```typescript
// In escrow.routes.ts
server.get('/health', {
    schema: { tags: ['Escrow'], summary: 'Escrow poller health' },
    onRequest: [server.authenticate],
}, async () => {
    return {
        configured: isEscrowConfigured(),
        poller: escrowPollerHealth,
        defaultChainId: escrowConfig.defaultChainId,
    };
});
```

## Related Code Files

### Modify
- `apps/api/src/app.ts` — fix poller startup condition
- `apps/api/src/modules/escrow/escrow.poller.ts` — add health state export
- `apps/api/src/modules/escrow/escrow.routes.ts` — add /escrow/health endpoint
- `apps/api/src/modules/escrow/escrow.service.ts` — standardize log prefixes
- `.env.example` — add ESCROW_CONFIRMATION_BLOCKS
- `apps/api/src/modules/escrow/escrow.config.ts` — add confirmationBlocks

## Todo

- [ ] Fix poller startup condition in app.ts
- [ ] Add escrowPollerHealth export to poller
- [ ] Add /escrow/health endpoint
- [ ] Standardize log prefixes in escrow.service.ts
- [ ] Update .env.example with new vars
- [ ] Add confirmationBlocks to escrow.config.ts
- [ ] Verify graceful shutdown works

## Success Criteria
- Poller starts with per-chain env vars (not just legacy ESCROW_CONTRACT)
- /escrow/health returns poller status
- Consistent log format across all escrow files
- .env.example documents all escrow env vars

## Security Considerations
- /escrow/health requires auth (no leak of config to public)
- Health endpoint does not expose private keys or RPC URLs
