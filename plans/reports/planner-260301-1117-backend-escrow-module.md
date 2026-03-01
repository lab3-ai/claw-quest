# Planner Report: Backend Escrow Module

**Date**: 2026-03-01
**Plan**: `/Users/hd/clawquest/plans/260301-1117-backend-escrow-module/`

## Findings

### What Already Exists (more than expected)

The escrow module is ~80% built. Five files already exist with:
- Viem public + wallet client cache (`escrow.client.ts`) — complete
- Per-chain config, RPC URLs, env vars (`escrow.config.ts`) — complete
- Event poller for QuestFunded (`escrow.poller.ts`) — functional but fragile
- Full service layer: deposit params, on-chain status reads, distribute execution, refund execution, QuestFunded handler (`escrow.service.ts`) — mostly done
- API routes: deposit-params, status, distribute, refund (`escrow.routes.ts`) — complete

### What's Actually Missing

| Gap | Impact | Fix |
|-----|--------|-----|
| Only QuestFunded event polled | Distributed/Refunded/Emergency events not captured | Add 3 handlers + multi-event fetch |
| In-memory block cursor | Lost on restart, re-scans last 100 blocks | Persist in DB (new EscrowCursor model) |
| No confirmation buffer | Could process re-orged blocks | Poll N blocks behind tip |
| Synchronous tx execution | HTTP timeout risk, lost tx on crash | Fire-and-forget + poller reconciliation |
| No tx status endpoint | Admin can't check pending tx | Add GET /escrow/tx-status/:txHash |
| No retry on nonce errors | Tx fails silently | Simple 1-retry wrapper |
| Startup checks legacy env var | Per-chain vars ignored for poller start | Use isEscrowConfigured() |
| No poller health check | Silent failures undetected | Export health state + endpoint |

### Key Architecture Decision

**Poller-as-reconciliation**: Instead of building a job queue for tx confirmation, the event poller serves dual purpose — it catches both external events (sponsor deposits, emergency withdrawals) AND confirms txs sent by the API. This eliminates need for Redis/BullMQ.

### Schema Change Required

One new Prisma model: `EscrowCursor` (chainId + lastBlock). Single migration, no existing table changes.

## Plan Structure

4 phases, ~6h total effort:

1. **Harden event poller** (2h) — DB cursor, confirmation buffer, multi-event fetch
2. **Event handlers** (1.5h) — handleDistributed, handleRefunded, handleEmergency
3. **Tx tracking + retries** (1.5h) — async distribute/refund, tx-status endpoint, nonce retry
4. **Production hardening** (1h) — startup fix, health check, logging, env docs

## Unresolved Questions

1. **Multi-chain polling**: Current poller only polls `defaultChainId`. Should it poll all configured chains? Low priority — only Base Sepolia deployed now. Can add multi-chain loop later.
2. **Distribute atomicity**: If `writeContract` succeeds but DB update to `payoutStatus='pending'` fails, the tx is on-chain but DB is stale. The event poller handles this, but there's a window where admin sees outdated state. Acceptable for now.
3. **Rate limiting**: If the API processes many distribute requests rapidly, nonce conflicts are likely. Current 1-retry may not suffice. Monitor in production; add proper nonce management if needed.
