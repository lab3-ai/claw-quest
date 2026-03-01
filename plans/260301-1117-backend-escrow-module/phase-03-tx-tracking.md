# Phase 3: Transaction Status Tracking + Retries

## Context Links
- Execute distribute: `apps/api/src/modules/escrow/escrow.service.ts` (lines 253-314)
- Execute refund: `apps/api/src/modules/escrow/escrow.service.ts` (lines 321-366)
- Routes: `apps/api/src/modules/escrow/escrow.routes.ts` (lines 158-283)

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 1.5h
- **Depends on**: Phase 2

Current `executeDistribute` and `executeRefund` are synchronous — they send tx, `waitForTransactionReceipt`, then update DB. Problems: (1) HTTP request can timeout before receipt arrives, (2) if server crashes mid-wait the tx is lost, (3) no retry on nonce/gas errors.

## Key Insights

1. **KISS approach**: Don't build a full job queue (YAGNI). Instead: record pending tx in DB immediately after `writeContract`, then let the event poller reconcile state. If tx confirmed, poller picks up the event. If tx failed, admin can retry.
2. **The poller IS the reconciliation**: Phase 2's event handlers already update DB from on-chain events. We just need to track the "in-flight" tx so the admin knows something is pending.
3. **What's actually needed**: A `pendingTxHash` field + status enum on Quest, and a `/escrow/tx-status/:txHash` endpoint to check receipt status.

## Requirements

### Functional
- Record tx hash in DB immediately after `writeContract` (before waiting for receipt)
- Add `distributeTxHash` field to Quest model for tracking pending distributions
- Non-blocking distribute/refund: return tx hash immediately, let poller confirm
- Add `GET /escrow/tx-status/:txHash` endpoint — reads receipt from chain
- Retry logic: if `writeContract` fails with nonce error, retry once with refreshed nonce

### Non-functional
- No external queue dependency (Redis, BullMQ, etc.)
- Admin can poll tx status via API
- Failed txs logged with full error context

## Architecture

### Flow Change

**Before (synchronous)**:
```
POST /escrow/distribute → writeContract → waitForReceipt → updateDB → respond
```

**After (async with poller reconciliation)**:
```
POST /escrow/distribute → writeContract → save txHash to DB → respond { txHash, status: "pending" }
                                                                  |
Event poller detects QuestDistributed event → updateDB (payouts, status)
                                                                  |
GET /escrow/tx-status/:txHash → returns receipt status from chain
```

### Schema Change

Add to Quest model:
```prisma
distributeTxHash    String?   // pending distribute tx (cleared when event confirms)
distributeStatus    String?   // "pending" | "confirmed" | "failed"
```

**Decision**: Actually YAGNI. We already have `cryptoTxHash` for deposit. The refund fields exist (`refundTxHash`, `refundStatus`). For distribute we can use the event poller to confirm + the participation-level `payoutTxHash`. We only need a quest-level field to track the pending distribute tx.

Simpler: add just `distributeTxHash` to Quest. Status derived from: if `distributeTxHash` exists but no participations have `payoutStatus=paid` -> pending. If paid -> confirmed.

**Even simpler**: Don't add schema fields. Just change the response to return txHash immediately. The event poller (Phase 2) handles confirmation. Admin checks `GET /escrow/tx-status/:txHash` for receipt. No migration needed.

## Implementation Steps

### 1. Refactor `executeDistribute` — fire-and-forget pattern

Split into:
- `executeDistribute()` — simulate + write tx + return hash immediately
- Remove `waitForTransactionReceipt` from distribute (poller handles confirmation)
- Still update participations to `payoutStatus='pending'` with txHash immediately
- Event handler (Phase 2) upgrades to `payoutStatus='paid'` when confirmed

```typescript
// Before: blocks until receipt
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

// After: return immediately, mark pending
for (const payout of payouts) {
    await prisma.questParticipation.update({
        where: { id: payout.participationId },
        data: { payoutStatus: 'pending', payoutTxHash: txHash },
    });
}
return txHash; // caller gets hash right away
```

### 2. Refactor `executeRefund` — same pattern

- Write tx, save txHash + `refundStatus='pending'` immediately
- Remove `waitForTransactionReceipt`
- Event handler (Phase 2) upgrades to `refundStatus='completed'`

### 3. Add `GET /escrow/tx-status/:txHash` endpoint

```typescript
server.get('/tx-status/:txHash', {
    schema: { params: z.object({ txHash: z.string() }),
              querystring: z.object({ chainId: z.coerce.number().optional() }) },
    onRequest: [server.authenticate],
}, async (request) => {
    const { txHash } = request.params;
    const chainId = request.query.chainId || escrowConfig.defaultChainId;
    const client = getPublicClient(chainId);

    try {
        const receipt = await client.getTransactionReceipt({ hash: txHash });
        return {
            txHash,
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            blockNumber: Number(receipt.blockNumber),
            gasUsed: receipt.gasUsed.toString(),
        };
    } catch {
        return { txHash, status: 'pending' }; // not mined yet
    }
});
```

### 4. Add simple retry for nonce errors

Wrap `writeContract` in a helper:

```typescript
async function writeContractWithRetry(
    walletClient, publicClient, params, maxRetries = 1
): Promise<`0x${string}`> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await walletClient.writeContract(params);
        } catch (err: any) {
            const isNonceError = err.message?.includes('nonce')
                || err.message?.includes('replacement');
            if (isNonceError && attempt < maxRetries) {
                // Wait a bit for nonce to settle
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw err;
        }
    }
    throw new Error('Unreachable');
}
```

## Related Code Files

### Modify
- `apps/api/src/modules/escrow/escrow.service.ts` — refactor executeDistribute + executeRefund to async pattern, add writeContractWithRetry
- `apps/api/src/modules/escrow/escrow.routes.ts` — add tx-status endpoint, update distribute/refund responses

## Todo

- [ ] Refactor executeDistribute: remove waitForReceipt, mark pending immediately
- [ ] Refactor executeRefund: same pattern
- [ ] Add writeContractWithRetry helper
- [ ] Add GET /escrow/tx-status/:txHash route
- [ ] Update route responses to include { txHash, status: "pending" }
- [ ] Test: distribute returns immediately, poller confirms later
- [ ] Test: nonce error triggers retry

## Success Criteria
- Distribute/refund endpoints respond in <3s (no blocking on receipt)
- Participations marked `pending` immediately, upgraded to `paid` by event poller
- tx-status endpoint returns receipt info
- Nonce errors retried once automatically

## Risk Assessment
- **Race condition**: Admin triggers distribute, poller hasn't run yet. Admin checks tx-status, sees pending. This is expected behavior — not a bug.
- **Double-distribute**: Prevented by contract (`InsufficientFunds` if already distributed). Also prevented by `payoutStatus` check in Phase 2 handler.
- **Lost tx hash**: If server crashes between writeContract and DB update — tx is on-chain but DB doesn't know hash. Event poller (Phase 2) catches the event and reconciles. This is the safety net.
