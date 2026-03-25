# Phase 03 — API: Multi-Deposit Funding

**Priority:** P1
**Effort:** 4h
**Status:** completed
**Depends on:** Phase 01

## Context Links

- Escrow service: `apps/api/src/modules/escrow/escrow.service.ts`
- Event handlers: `apps/api/src/modules/escrow/escrow-event-handlers.ts`
- Poller: `apps/api/src/modules/escrow/escrow.poller.ts`
- Shared utils: `packages/shared/src/escrow-utils.ts`

## Overview

Modify `getDepositParams()` to return sub-questId for non-owner depositors. Update `handleQuestFunded()` to create `QuestDeposit` records and recalculate `totalFunded`. Update `executeDistribute()` and `executeRefund()` to operate across all sub-escrows. Update poller to resolve sub-questIds back to logical quests.

## Key Algorithm: Sub-QuestId Generation

```typescript
// In packages/shared/src/escrow-utils.ts
import { keccak256, concat, pad } from 'viem';

export function generateSubQuestId(questId: string, userId: string): `0x${string}` {
  const questIdBytes32 = uuidToBytes32(questId);      // existing util
  const userIdBytes32 = uuidToBytes32(userId);         // existing util
  return keccak256(concat([questIdBytes32, userIdBytes32]));
}
```

Owner uses `uuidToBytes32(questId)` (original). Sponsor uses `generateSubQuestId(questId, sponsorUserId)`.

## Related Code Files

**Modify:**
- `packages/shared/src/escrow-utils.ts`
- `apps/api/src/modules/escrow/escrow.service.ts`
- `apps/api/src/modules/escrow/escrow-event-handlers.ts`
- `apps/api/src/modules/escrow/escrow.poller.ts`
- `apps/api/src/modules/quests/quests.routes.ts` (fund endpoint)

## Implementation Steps

### 1. Add generateSubQuestId to Shared

**File:** `packages/shared/src/escrow-utils.ts`

```typescript
import { keccak256, concat } from 'viem';

export function generateSubQuestId(questId: string, userId: string): `0x${string}` {
  const questIdBytes32 = uuidToBytes32(questId);
  const userIdBytes32 = uuidToBytes32(userId);
  return keccak256(concat([questIdBytes32, userIdBytes32]));
}
```

Export from `packages/shared/src/index.ts`:
```typescript
export { generateSubQuestId } from './escrow-utils';
```

Rebuild shared: `pnpm --filter @clawquest/shared build`

### 2. Modify getDepositParams()

**File:** `apps/api/src/modules/escrow/escrow.service.ts`

Add `depositorUserId` param and `isOwner` flag. Owner gets original questId bytes32; sponsor gets sub-questId. Also create a pending `QuestDeposit` record.

```typescript
export async function getDepositParams(
  prisma: PrismaClient,
  questId: string,
  depositorUserId: string,   // NEW
  chainId?: number,
): Promise<DepositParams & { escrowQuestId: string }> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) throw new Error('Quest not found');

  // Determine if depositor is owner
  const isOwner = quest.creatorUserId === depositorUserId;
  const escrowQuestId = isOwner
    ? uuidToBytes32(questId)
    : generateSubQuestId(questId, depositorUserId);

  let targetChainId = chainId ?? quest.cryptoChainId
    ?? resolveChainIdFromNetwork(quest.network)
    ?? escrowConfig.defaultChainId;
  if (!isChainAllowed(targetChainId)) targetChainId = escrowConfig.defaultChainId;

  const chain = getChainById(targetChainId);
  if (!chain) throw new Error(`Unsupported chain: ${targetChainId}`);

  const rewardType = quest.rewardType.toUpperCase();
  const tokenInfo = getTokenInfo(targetChainId, rewardType);
  if (!tokenInfo) throw new Error(`Token ${rewardType} not available on chain ${targetChainId}`);

  // For sponsors: use rewardAmount as the suggested deposit amount
  // (no enforcement — they can deposit any amount; poller records actual amount)
  // For owner: keep existing top-up logic
  let depositAmount = Number(quest.rewardAmount);
  if (isOwner && quest.fundingStatus === 'confirmed' && quest.cryptoChainId) {
    const onChain = await getEscrowStatus(questId, targetChainId);
    const alreadyDeposited = onChain?.depositedHuman ?? 0;
    const diff = depositAmount - alreadyDeposited;
    if (diff <= 0) throw new Error('Quest already fully funded by owner');
    depositAmount = diff;
  }

  const amountSmallestUnit = toSmallestUnit(depositAmount, tokenInfo.decimals);
  const expiresAt = quest.expiresAt ? Math.floor(quest.expiresAt.getTime() / 1000) : 0;

  // Create or find pending QuestDeposit record
  const existingDeposit = await prisma.questDeposit.findFirst({
    where: { questId, userId: depositorUserId, status: 'pending' },
  });
  if (!existingDeposit) {
    await prisma.questDeposit.create({
      data: {
        questId,
        escrowQuestId,
        userId: depositorUserId,
        amount: depositAmount,
        tokenAddress: tokenInfo.address,
        chainId: targetChainId,
        walletAddress: '',       // filled by frontend / poller from event
        status: 'pending',
      },
    });
  }

  return {
    contractAddress: getContractAddress(targetChainId),
    questIdBytes32: escrowQuestId,    // return sub-questId to frontend
    escrowQuestId,
    tokenAddress: tokenInfo.address,
    tokenSymbol: tokenInfo.symbol,
    tokenDecimals: tokenInfo.decimals,
    amount: depositAmount,
    amountSmallestUnit: amountSmallestUnit.toString(),
    chainId: targetChainId,
    chainName: chain.name,
    expiresAt,
    isNative: isNativeToken(tokenInfo.address),
  };
}
```

Update the `GET /quests/:id/fund` route to pass `depositorUserId`:
```typescript
// In quests.routes.ts, fund params handler:
const params = await getDepositParams(server.prisma, id, req.user.id, chainId);
```

### 3. Update handleQuestFunded() — Sub-QuestId Support

**File:** `apps/api/src/modules/escrow/escrow-event-handlers.ts`

The poller emits `QuestFunded` with `questIdBytes32` which could be:
- Main questId → owner deposit
- Sub-questId → sponsor deposit

Handler must resolve logical questId from either case.

```typescript
export async function handleQuestFunded(
  prisma: PrismaClient,
  questIdBytes32: string,
  sponsor: string,        // depositor wallet
  token: string,
  amount: bigint,
  expiresAt: bigint,
  txHash: string,
  chainId: number,
): Promise<void> {
  // Try direct UUID decode first (owner deposit)
  let questId: string | null = null;
  let isSubQuestId = false;

  try {
    questId = bytes32ToUuid(questIdBytes32);
    const directQuest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!directQuest) {
      questId = null; // not a direct match — must be a sub-questId
    }
  } catch { questId = null; }

  if (!questId) {
    // Look up by escrowQuestId in QuestDeposit table
    const depositRecord = await prisma.questDeposit.findFirst({
      where: { escrowQuestId: questIdBytes32 },
    });
    if (!depositRecord) {
      console.warn(`[escrow:funded] Unknown escrowQuestId: ${questIdBytes32}`);
      return;
    }
    questId = depositRecord.questId;
    isSubQuestId = true;
  }

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) { console.warn(`[escrow:funded] Quest ${questId} not found`); return; }

  const tokenInfo = Object.values(TOKEN_REGISTRY[chainId] || {}).find(
    t => t.address.toLowerCase() === token.toLowerCase()
  );
  const decimals = tokenInfo?.decimals ?? 6;
  const humanAmount = fromSmallestUnit(amount, decimals);

  // Update or create QuestDeposit record
  const depositRecord = await prisma.questDeposit.findFirst({
    where: { questId, escrowQuestId: questIdBytes32 },
  });
  if (depositRecord) {
    await prisma.questDeposit.update({
      where: { id: depositRecord.id },
      data: { status: 'confirmed', txHash, walletAddress: sponsor, amount: humanAmount },
    });
  } else {
    // Deposit arrived without prior pending record (e.g. direct on-chain deposit)
    await prisma.questDeposit.create({
      data: {
        questId, escrowQuestId: questIdBytes32,
        userId: quest.creatorUserId ?? '',   // best guess for owner
        amount: humanAmount, tokenAddress: token,
        chainId, txHash, walletAddress: sponsor, status: 'confirmed',
      },
    });
  }

  // Recalculate totalFunded from confirmed deposits
  const { _sum } = await prisma.questDeposit.aggregate({
    where: { questId, status: 'confirmed' },
    _sum: { amount: true },
  });
  const newTotalFunded = Number(_sum.amount ?? 0);
  const rewardAmount = Number(quest.rewardAmount);
  const newFundingStatus = newTotalFunded >= rewardAmount ? 'confirmed' : 'partial';

  // Status transition: draft → live/scheduled when fully funded
  let newStatus = quest.status;
  if (newFundingStatus === 'confirmed' && quest.status === 'draft') {
    newStatus = (quest.startAt && quest.startAt > new Date()) ? 'scheduled' : 'live';
  }

  await prisma.quest.update({
    where: { id: questId },
    data: {
      totalFunded: newTotalFunded,
      fundingStatus: newFundingStatus,
      fundingMethod: 'crypto',
      cryptoChainId: chainId,
      fundedAt: newFundingStatus === 'confirmed' ? new Date() : quest.fundedAt,
      tokenAddress: quest.tokenAddress ?? token,
      tokenDecimals: quest.tokenDecimals ?? decimals,
      // Only set sponsorWallet + escrowQuestId for owner (main) deposit
      ...(!isSubQuestId ? { sponsorWallet: sponsor, escrowQuestId: questIdBytes32, cryptoTxHash: txHash } : {}),
      status: newStatus,
    },
  });

  console.log(`[escrow:funded] Quest ${questId}: +${humanAmount} (total: ${newTotalFunded}/${rewardAmount}) ${newFundingStatus}`);
}
```

### 4. Update executeDistribute() — Multi-Escrow

**File:** `apps/api/src/modules/escrow/escrow.service.ts`

Distribute proportionally from each sub-escrow. Use `totalFunded` instead of `rewardAmount`.

```typescript
export async function executeDistribute(
  prisma: PrismaClient,
  questId: string,
  chainId: number,
): Promise<string[]> {  // returns array of tx hashes (one per sub-escrow)
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) throw new Error('Quest not found');

  const totalFunded = Number(quest.totalFunded ?? quest.rewardAmount);
  const tokenInfo = getTokenInfo(chainId, quest.rewardType.toUpperCase());
  if (!tokenInfo) throw new Error(`Token not found for chain ${chainId}`);

  // Get all confirmed deposits for this quest
  const deposits = await prisma.questDeposit.findMany({
    where: { questId, status: 'confirmed' },
  });
  if (deposits.length === 0) throw new Error('No confirmed deposits found');

  // Calculate payouts using totalFunded (not rewardAmount)
  const payouts = await calculateDistribution(prisma, questId, totalFunded);
  if (payouts.length === 0) throw new Error('No eligible participants');

  const walletClient = getOperatorWalletClient(chainId);
  const publicClient = getPublicClient(chainId);
  const contractAddr = getContractAddress(chainId);
  const txHashes: string[] = [];

  for (const deposit of deposits) {
    const depositShare = Number(deposit.amount) / totalFunded;

    // Scale each winner's payout by this deposit's share
    const recipients = payouts.map(p => p.wallet as `0x${string}`);
    const amounts = payouts.map(p => BigInt(Math.floor(Number(p.amount) * depositShare)));

    // Simulate
    await publicClient.simulateContract({
      address: contractAddr, abi: ESCROW_ABI,
      functionName: 'distribute',
      args: [deposit.escrowQuestId as `0x${string}`, recipients, amounts],
      account: walletClient.account!,
    });

    const txHash = await writeContractWithRetry(walletClient, {
      address: contractAddr, abi: ESCROW_ABI,
      functionName: 'distribute',
      args: [deposit.escrowQuestId as `0x${string}`, recipients, amounts],
    });
    txHashes.push(txHash);
    console.log(`[escrow:distribute] deposit ${deposit.id} tx: ${txHash}`);
  }

  // Mark participations as pending payout (poller upgrades to 'paid')
  const decimals = tokenInfo.decimals;
  for (const payout of payouts) {
    await prisma.questParticipation.update({
      where: { id: payout.participationId },
      data: { payoutAmount: fromSmallestUnit(payout.amount, decimals), payoutStatus: 'pending', payoutTxHash: txHashes[0] },
    });
  }

  return txHashes;
}
```

Update `calculateDistribution()` to accept optional `overrideTotalAmount`:
```typescript
export async function calculateDistribution(
  prisma: PrismaClient,
  questId: string,
  overrideTotalFunded?: number,   // NEW — uses totalFunded instead of rewardAmount
): Promise<PayoutEntry[]> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  // ...existing checks...
  const totalAmountHuman = overrideTotalFunded ?? Number(quest.rewardAmount);
  const totalAmount = toSmallestUnit(totalAmountHuman, tokenInfo.decimals);
  // ...rest unchanged...
}
```

### 5. Update executeRefund() — Multi-Escrow

```typescript
export async function executeRefund(
  prisma: PrismaClient,
  questId: string,
  chainId: number,
): Promise<string[]> {
  const deposits = await prisma.questDeposit.findMany({
    where: { questId, status: 'confirmed' },
  });
  if (deposits.length === 0) throw new Error('No confirmed deposits to refund');

  const walletClient = getOperatorWalletClient(chainId);
  const publicClient = getPublicClient(chainId);
  const contractAddr = getContractAddress(chainId);
  const txHashes: string[] = [];

  for (const deposit of deposits) {
    await publicClient.simulateContract({
      address: contractAddr, abi: ESCROW_ABI,
      functionName: 'refund',
      args: [deposit.escrowQuestId as `0x${string}`],
      account: walletClient.account!,
    });
    const txHash = await writeContractWithRetry(walletClient, {
      address: contractAddr, abi: ESCROW_ABI,
      functionName: 'refund',
      args: [deposit.escrowQuestId as `0x${string}`],
    });
    txHashes.push(txHash);
    console.log(`[escrow:refund] deposit ${deposit.id} tx: ${txHash}`);
  }

  await prisma.quest.update({
    where: { id: questId },
    data: { refundStatus: 'pending', refundTxHash: txHashes[0] },
  });

  return txHashes;
}
```

### 6. Update handleQuestRefunded() — Per Sub-Escrow

**File:** `apps/api/src/modules/escrow/escrow-event-handlers.ts`

On refund event, update the matching `QuestDeposit` record to `refunded`. When all deposits are refunded, set `quest.refundStatus = 'completed'`.

```typescript
export async function handleQuestRefunded(
  prisma: PrismaClient,
  questIdBytes32: string,
  sponsor: string,
  amount: bigint,
  txHash: string,
  chainId: number,
): Promise<void> {
  // Resolve logical questId (same logic as handleQuestFunded)
  let questId = resolveLogicalQuestId(prisma, questIdBytes32); // extract helper

  const tokenInfo = resolveTokenInfo(chainId, /* from deposit record */);
  const humanAmount = fromSmallestUnit(amount, tokenInfo?.decimals ?? 6);

  // Mark this specific deposit as refunded
  await prisma.questDeposit.updateMany({
    where: { escrowQuestId: questIdBytes32 },
    data: { status: 'refunded', txHash },
  });

  // Check if all confirmed deposits are now refunded
  const remaining = await prisma.questDeposit.count({
    where: { questId, status: 'confirmed' },
  });
  if (remaining === 0) {
    await prisma.quest.update({
      where: { id: questId },
      data: {
        refundStatus: 'completed', refundTxHash: txHash,
        refundedAt: new Date(), totalFunded: 0,
        fundingStatus: 'refunded',
        status: 'cancelled',
      },
    });
  }
}
```

Extract helper `resolveLogicalQuestId(prisma, questIdBytes32)` to avoid duplication between `handleQuestFunded` and `handleQuestRefunded`.

### 7. Poller: Sub-QuestId Awareness

**File:** `apps/api/src/modules/escrow/escrow.poller.ts`

The poller calls `handleQuestFunded` with raw `questIdBytes32`. No change needed in poller itself — the handler resolves the logical quest. Verify that `bytes32ToUuid` does NOT throw on sub-questIds (keccak256 output won't decode to a valid UUID — must catch the exception in handler).

Ensure the poller notification for `QuestFunded` uses the logical questId (not the raw bytes32):

```typescript
// In pollChain() after handleQuestFunded:
// notifyQuestFunded already receives questId from handler return value
// Update handleQuestFunded to return the logical questId so poller can notify
```

Update `handleQuestFunded` signature to return `string | null` (logical questId), allowing the poller to call `notifyQuestFunded(questId)` correctly.

## Todo Checklist

- [ ] Add `generateSubQuestId()` to `packages/shared/src/escrow-utils.ts`
- [ ] Export `generateSubQuestId` from `packages/shared/src/index.ts`
- [ ] Rebuild shared package
- [ ] Update `getDepositParams()` — add `depositorUserId`, return `escrowQuestId`, create pending `QuestDeposit`
- [ ] Update `GET /quests/:id/fund` route to pass `req.user.id` to `getDepositParams()`
- [ ] Update `handleQuestFunded()` — sub-questId lookup, `QuestDeposit` upsert, recalculate `totalFunded`, set `partial`/`confirmed`
- [ ] Extract `resolveLogicalQuestId()` helper in `escrow-event-handlers.ts`
- [ ] Update `calculateDistribution()` — accept `overrideTotalFunded` param
- [ ] Update `executeDistribute()` — iterate confirmed deposits, proportional distribution per sub-escrow
- [ ] Update `executeRefund()` — iterate confirmed deposits, refund each sub-escrow
- [ ] Update `handleQuestRefunded()` — per-deposit status, check all-refunded gate
- [ ] Verify poller notifies with logical questId after sub-questId resolution
- [ ] Test: owner-only deposit → same behavior as before
- [ ] Test: two-sponsor scenario → two sub-escrows, proportional distribute

## Success Criteria

- Owner deposit: `questIdBytes32 = uuidToBytes32(questId)`, backward-compatible
- Sponsor deposit: `questIdBytes32 = keccak256(...)`, resolves back to logical quest via `QuestDeposit` table
- After two deposits: `totalFunded = deposit1 + deposit2`, `fundingStatus = 'partial'` or `'confirmed'`
- Distribute: N tx submissions, each proportional to deposit share
- Refund: each sponsor gets own sub-escrow refunded separately

## Risks

- `bytes32ToUuid` on keccak256 output will throw or return garbage — must `try/catch` and fall back to DB lookup
- Proportional distribution rounding: use integer division, remainder goes to first winner
- Concurrent poller ticks: `questDeposit.updateMany` on same `escrowQuestId` is idempotent (status already 'confirmed')
