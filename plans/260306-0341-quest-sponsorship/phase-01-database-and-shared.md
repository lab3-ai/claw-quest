# Phase 01 — Database & Shared Types

**Priority:** P0 (blocks all other phases)
**Effort:** 2h
**Status:** completed

## Context Links

- Schema: `apps/api/prisma/schema.prisma`
- Shared: `packages/shared/src/index.ts`
- Brainstorm: `plans/reports/brainstormer-260306-0218-quest-collaboration.md`

## Overview

Add two new Prisma models (`QuestCollaborator`, `QuestDeposit`), extend `Quest` with `totalFunded` + relation fields, add `FUNDING_STATUS.PARTIAL` to shared constants, and add Zod schemas for collaboration API responses.

## Related Code Files

**Modify:**
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/index.ts`

## Implementation Steps

### 1. Update Prisma Schema

**File:** `apps/api/prisma/schema.prisma`

Add to `User` model (relations):
```prisma
collaborations    QuestCollaborator[]
questDeposits     QuestDeposit[]
```

Add to `Quest` model:
```prisma
// Collaboration
totalFunded       Decimal  @default(0) @db.Decimal(36, 18)
collaborators     QuestCollaborator[]
deposits          QuestDeposit[]
```

Add new models after `Quest`:
```prisma
model QuestCollaborator {
  id          String    @id @default(uuid())
  questId     String
  quest       Quest     @relation(fields: [questId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  inviteToken String    @unique  // "collab_<hex>"
  invitedBy   String?            // userId of inviter
  acceptedAt  DateTime?
  expiresAt   DateTime           // 7-day expiry from creation
  createdAt   DateTime  @default(now())

  @@unique([questId, userId])
  @@index([questId])
  @@index([inviteToken])
}

model QuestDeposit {
  id            String   @id @default(uuid())
  questId       String                        // logical quest UUID
  quest         Quest    @relation(fields: [questId], references: [id], onDelete: Cascade)
  escrowQuestId String                        // on-chain questId bytes32 (main or sub)
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  amount        Decimal  @db.Decimal(36, 18)  // human-readable (e.g. 200.00)
  tokenAddress  String
  chainId       Int
  txHash        String?                       // filled when poller confirms
  walletAddress String                        // depositor's wallet
  status        String   @default("pending")  // pending | confirmed | refunded
  createdAt     DateTime @default(now())

  @@index([questId])
  @@index([escrowQuestId])
  @@index([userId])
}
```

### 2. Create & Run Migration

```bash
pnpm db:migrate
# Name: add_quest_collaboration
```

### 3. Backfill Migration Script

Create `apps/api/prisma/migrations/{timestamp}_add_quest_collaboration/migration.sql` will be auto-generated. After migration, run a one-off backfill for existing funded quests:

```sql
-- Backfill totalFunded for existing funded quests
UPDATE "Quest"
SET "totalFunded" = "rewardAmount"
WHERE "fundingStatus" = 'confirmed'
  AND "totalFunded" = 0;
```

Add this SQL to the migration file manually before applying to production. The migration step creates the backfill so existing quests work without code changes.

### 4. Update Shared Package

**File:** `packages/shared/src/index.ts`

Add `PARTIAL` to `FUNDING_STATUS`:
```typescript
export const FUNDING_STATUS = {
  UNFUNDED: 'unfunded',
  PENDING: 'pending',
  PARTIAL: 'partial',      // NEW
  CONFIRMED: 'confirmed',
  REFUNDED: 'refunded',
} as const;
```

Add collaboration schemas after `QuestSchema`:
```typescript
export const QuestCollaboratorSchema = z.object({
  id: z.string().uuid(),
  questId: z.string().uuid(),
  userId: z.string().uuid(),
  invitedBy: z.string().uuid().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  // Joined user fields for display
  displayName: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
});
export type QuestCollaborator = z.infer<typeof QuestCollaboratorSchema>;

export const QuestDepositSchema = z.object({
  id: z.string().uuid(),
  questId: z.string().uuid(),
  userId: z.string().uuid(),
  escrowQuestId: z.string(),
  amount: z.number(),
  tokenAddress: z.string(),
  chainId: z.number(),
  txHash: z.string().nullable(),
  walletAddress: z.string(),
  status: z.enum(['pending', 'confirmed', 'refunded']),
  createdAt: z.string().datetime(),
});
export type QuestDeposit = z.infer<typeof QuestDepositSchema>;

export const CollaboratorsResponseSchema = z.object({
  collaborators: z.array(QuestCollaboratorSchema),
  deposits: z.array(QuestDepositSchema),
  totalFunded: z.number(),
  rewardAmount: z.number(),
});
```

Extend `QuestSchema` with optional collaboration fields:
```typescript
// Add inside QuestSchema:
totalFunded: z.number().nullable().optional(),
collaboratorCount: z.number().nullable().optional(),
sponsorNames: z.array(z.string()).default([]),   // for public "Sponsored by" display
```

### 5. Rebuild Shared Package

```bash
pnpm --filter @clawquest/shared build
```

## Todo Checklist

- [ ] Add `collaborations` + `questDeposits` relations to `User` model
- [ ] Add `totalFunded`, `collaborators`, `deposits` to `Quest` model
- [ ] Add `QuestCollaborator` model
- [ ] Add `QuestDeposit` model
- [ ] Run `pnpm db:migrate` and name it `add_quest_collaboration`
- [ ] Add backfill SQL to migration for existing funded quests
- [ ] Add `FUNDING_STATUS.PARTIAL` to `packages/shared/src/index.ts`
- [ ] Add `QuestCollaboratorSchema`, `QuestDepositSchema`, `CollaboratorsResponseSchema`
- [ ] Extend `QuestSchema` with `totalFunded`, `collaboratorCount`, `sponsorNames`
- [ ] Run `pnpm --filter @clawquest/shared build`
- [ ] Verify Prisma client generates without errors: `pnpm --filter api build`

## Success Criteria

- Migration applies cleanly to dev DB
- Existing quests with `fundingStatus = 'confirmed'` have `totalFunded` backfilled
- `FUNDING_STATUS.PARTIAL` importable from `@clawquest/shared`
- All new Zod schemas export without TypeScript errors

## Risk

- Backfill SQL must run within migration — if omitted, publish gate breaks for existing quests
- `Decimal` type on `totalFunded` defaults to `0`, not `null` — aligns with existing `rewardAmount` type
