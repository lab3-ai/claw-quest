# Planner Agent Memory

## Escrow Module (v0.7.0+)
- Module path: `apps/api/src/modules/escrow/` (5 files: config, client, service, poller, routes)
- Shared ABI + utils: `packages/shared/src/escrow-abi.ts`, `escrow-utils.ts`
- Contract: `contracts/src/ClawQuestEscrow.sol` (UUPS proxy, singleton per chain)
- 4 on-chain events: QuestFunded, QuestDistributed, QuestRefunded, EmergencyWithdrawal
- Viem clients cached per-chain in `escrow.client.ts`
- Poller started in `app.ts` line 180 (currently checks legacy env var — needs fix)
- DB fields for funding: fundingStatus, cryptoTxHash, cryptoChainId, fundedAt, sponsorWallet, tokenAddress, tokenDecimals, escrowQuestId
- DB fields for refund: refundStatus, refundAmount, refundTxHash, refundedAt
- DB fields for payout: payoutAmount, payoutStatus, payoutTxHash, payoutWallet (on QuestParticipation)
- No new Prisma migration needed for existing fields; only EscrowCursor model is new

## Project Patterns
- Escrow config reads env vars per-chain: `ESCROW_CONTRACT_{chainId}`
- Service functions take `prisma: PrismaClient` as first arg (no server/logger access)
- Poller uses `server.addHook('onClose', ...)` for cleanup
- Routes at `/escrow/*` prefix, registered in app.ts
- Admin escrow routes at `/admin/escrow/*` (separate module)
