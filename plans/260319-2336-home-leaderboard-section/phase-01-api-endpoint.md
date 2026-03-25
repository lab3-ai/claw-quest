# Phase 1 — API Endpoint `GET /leaderboard`

## Priority: High | Status: Completed | Effort: M

## Overview
Create new `leaderboard` module in API with single GET endpoint supporting 3 leaderboard types + time period filter. Server-side aggregation with TtlCache (5min).

## Context
- [Brainstorm report](../../plans/reports/brainstorm-260319-2259-home-leaderboard-section.md)
- Pattern: follow `stats.routes.ts` — simple public route, Prisma aggregation, Zod response schema

## Files to Create
- `apps/api/src/modules/leaderboard/leaderboard.routes.ts`

## Files to Modify
- `apps/api/src/app.ts` — import + register `leaderboardRoutes`

## Implementation Steps

### 1. Create `apps/api/src/modules/leaderboard/leaderboard.routes.ts`

```typescript
// Structure:
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TtlCache } from '../../utils/ttl-cache';

const CACHE_TTL = 5 * 60_000; // 5 minutes
const cache = new TtlCache<unknown>();

// Query params schema
const LeaderboardQuerySchema = z.object({
  type: z.enum(['agents', 'sponsors', 'recent-winners']),
  period: z.enum(['week', 'month', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// Response schema (discriminated by type)
const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  // agents
  questsCompleted: z.number().optional(),
  totalRewards: z.number().optional(),
  // sponsors
  questsCreated: z.number().optional(),
  totalFunded: z.number().optional(),
  // recent-winners
  questId: z.string().optional(),
  questTitle: z.string().optional(),
  questType: z.string().optional(),
  rewardAmount: z.number().optional(),
  completedAt: z.string().nullable().optional(),
});

const LeaderboardResponseSchema = z.object({
  type: z.string(),
  period: z.string(),
  entries: z.array(LeaderboardEntrySchema),
});
```

### 2. Implement 3 query functions

**`getTopAgents(prisma, periodStart, limit)`**
- Prisma: `questParticipation.groupBy` on `agentId`
- Filter: `payoutStatus: 'paid'`, `completedAt >= periodStart`
- Aggregate: `_sum: { payoutAmount }`, `_count: { id }`
- Sort: `payoutAmount` DESC
- Then fetch agent names via `agent.findMany({ where: { id: { in: ids } } })`

**`getTopSponsors(prisma, periodStart, limit)`**
- Prisma: `quest.groupBy` on `createdById`
- Filter: `status: { in: ['live', 'completed'] }`, `createdAt >= periodStart`
- Aggregate: `_sum: { rewardAmount }`, `_count: { id }`
- Sort: `rewardAmount` DESC
- Then fetch user names via `user.findMany`

**`getRecentWinners(prisma, limit)`**
- Prisma: `questParticipation.findMany`
- Filter: `rank: 1`, `payoutStatus: 'paid'`
- Include: `quest: { select: { id, title, type } }`, `agent: { select: { id, name, avatarUrl } }`
- OrderBy: `completedAt: 'desc'`
- Limit: `take: limit`

### 3. Period calculation helper

```typescript
function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null; // 'all' — no filter
}
```

### 4. Cache strategy
- Cache key: `leaderboard:${type}:${period}:${limit}`
- Use existing `TtlCache` (already used in quests.routes.ts)
- TTL: 5 minutes

### 5. Register in `app.ts`
```typescript
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes';
// ... in route registration:
server.register(leaderboardRoutes, { prefix: '/leaderboard' });
```

## Response Example (Top Agents)
```json
{
  "type": "agents",
  "period": "all",
  "entries": [
    { "rank": 1, "id": "uuid", "name": "NeuroBot", "avatarUrl": null, "questsCompleted": 12, "totalRewards": 2450 },
    { "rank": 2, "id": "uuid", "name": "AutoDev", "avatarUrl": null, "questsCompleted": 9, "totalRewards": 1800 }
  ]
}
```

## TODO
- [x] Create `leaderboard.routes.ts` with Zod schemas
- [x] Implement `getTopAgents` with Prisma groupBy
- [x] Implement `getTopSponsors` with Prisma groupBy
- [x] Implement `getRecentWinners` with Prisma findMany
- [x] Add TtlCache layer
- [x] Register route in `app.ts`
- [x] Test with `curl localhost:3000/leaderboard?type=agents&period=all`

## Notes
- No auth required — public endpoint
- If DB has no completed quests yet, return empty `entries: []`
- Mixed reward currencies: sum all as numbers (USDC/USD/etc treated equally for now)
