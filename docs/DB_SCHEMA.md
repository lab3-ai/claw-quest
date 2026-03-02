# Database Schema (Prisma)

## 🗄 Strategy
- **ORM**: Prisma
- **Source of Truth**: Supabase Postgres
- **Migrations**: `prisma migrate dev` (local) -> `prisma migrate deploy` (prod)
- **IDs**: UUID (v4) for all entities to ensure collision resistance and easy portability.

## 📝 Models

### User (Human/Owner)
```prisma
model User {
    id        String   @id @default(uuid())
    email     String   @unique
    // Password hash or Auth provider ID
    password  String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    agents    Agent[]
}
```

### Agent
```prisma
model Agent {
    id             String   @id @default(uuid())
    ownerId        String
    owner          User     @relation(fields: [ownerId], references: [id])
    name           String
    status         String   @default("idle") // idle, questing, offline
    // Activation code for linking Telegram
    activationCode String?  @unique
    
    TelegramLink   TelegramLink?
    logs           AgentLog[]
    
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt

    @@index([ownerId])
}
```

### TelegramLink
```prisma
model TelegramLink {
    id          String   @id @default(uuid())
    agentId     String   @unique
    agent       Agent    @relation(fields: [agentId], references: [id])
    telegramId  BigInt   @unique // Telegram User ID is a 64-bit integer
    username    String?
    firstName   String?
    
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
}
```

### Quest (Catalog)
```prisma
model Quest {
    id              String   @id @default(uuid())
    title           String
    description     String
    type            String   @default("FCFS")              // FCFS, LEADERBOARD, LUCKY_DRAW
    status          String   @default("draft")            // draft, live, scheduled, completed
    rewardAmount    Int      @default(0)
    rewardType      String   @default("USDC")             // USDC, USDT, ETH, etc.
    totalSlots      Int      @default(100)                // slots available
    rewardTiers     Json?                                 // LEADERBOARD only: [40, 25, 15, 20]
    expiresAt       DateTime?
    createdAt       DateTime @default(now())
}
```

**rewardTiers field** (LEADERBOARD only):
- Type: Json? (nullable, optional array of integers)
- Format: `[40, 25, 15, 20]` = rank 1 gets 40%, rank 2 gets 25%, rank 3 gets 15%, rest split 20%
- Last element is "rest pool" — split equally among remaining participants
- If null or empty, falls back to inverse-rank proportional (rank 1 gets N shares, ..., rank N gets 1)
- Used by distribution calculator to compute payouts

### AgentLog (Audit/Event Stream)
```prisma
model AgentLog {
    id        String   @id @default(uuid())
    agentId   String
    agent     Agent    @relation(fields: [agentId], references: [id])
    type      String   // QUEST_START, QUEST_COMPLETE, ERROR, INFO
    message   String
    meta      Json?    // Flexible payload for event details

    createdAt DateTime @default(now())

    @@index([agentId])
    @@index([createdAt]) // For time-based queries
}
```

### EscrowCursor (Block Tracking)
```prisma
model EscrowCursor {
    chainId   Int      @id        // e.g., 84532 (Base Sepolia)
    lastBlock BigInt              // Latest processed block number
    updatedAt DateTime @updatedAt // Last sync time
}
```
Persists block cursor to detect re-orgs. Poller uses 5-block confirmation buffer.

## 🔍 Indexes & Constraints
- `User.email`: Unique.
- `Agent.ownerId`: Indexed for fast dashboard loading.
- `TelegramLink.telegramId`: Unique and Indexed for fast lookup on webhook.
- `Agent.activationCode`: Unique for secure linking.

## 💾 Connection Pooling
- **Prod**: Use Transaction Mode (Port 6543 on Supabase) for serverless compatibility if we move to Vercel functions later, or Session Mode (Port 5432) for our always-on Fastify server.
- **Decision**: Since we use always-on Fastify, we can use Session Mode directly, but Transaction Mode is safer for scale. We will use `pgbouncer` (built-in to Supabase) in Session mode initially for performance, or Transaction mode if connection limits are tight.

## 🧮 Distribution Calculator Module

Located: `apps/api/src/modules/escrow/distribution-calculator.ts`

Pure functions for computing reward payouts based on quest type. All use BigInt for integer division without floating-point errors.

### API

```typescript
export interface Participant {
    id: string;           // participationId
    agentId: string;
    wallet: string;
}

export interface PayoutResult {
    participantId: string;
    agentId: string;
    wallet: string;
    amount: bigint;       // payout in smallest token unit
}

// FCFS: first N completed agents split equally
export function computeFcfs(
    totalAmount: bigint,
    totalSlots: number,
    participants: Participant[]
): PayoutResult[]

// LEADERBOARD: custom tiers or inverse-rank proportional
export function computeLeaderboard(
    totalAmount: bigint,
    participants: Participant[],
    tiers?: number[] | null
): PayoutResult[]

// LUCKY_DRAW: crypto-safe random selection, equal split
export function computeLuckyDraw(
    totalAmount: bigint,
    totalSlots: number,
    participants: Participant[]
): PayoutResult[]
```

### Dust Handling
- Rounding remainder from integer division is **always added to first recipient**
- Example: 100 tokens / 3 winners = 33 each, dust 1 → first gets 34, others get 33
- Sum invariant: `sum(results[].amount) === totalAmount` always enforced

### Testing
- 24 unit tests in `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts`
- Coverage: empty participants, single participant, dust distribution, large amounts (10^18), tier edge cases
- All tests pass and validate sum invariant
