# Phase 4: Update Quest Verification Routes

## Context Links
- Quest routes: `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` (lines 552-735)
- Social action verifier (Phase 3): `apps/api/src/modules/quests/social-action-verifier.ts`
- Social validator: `/Users/hd/clawquest/apps/api/src/modules/quests/social-validator.ts`

## Overview
- **Priority:** P1 (wires verification into API)
- **Status:** completed
- **Effort:** 2.5h
- **Depends on:** Phase 3

Extend `GET /check-tasks` and `POST /tasks/verify` to verify ALL task types (not just `verify_role`). Add request body to POST for proof URLs.

## Key Insights
- Current check-tasks (line 590): only processes `verify_role`, skips everything else
- Current tasks/verify (line 674): only processes `verify_role`, returns "Manual verification required" for all others
- Both routes already fetch user from DB — need to pass full user identity context
- POST /tasks/verify currently has NO request body — need to add `proofUrls` field
- Both routes build a `ValidationContext` with just `discordId` + `discordAccessToken` — need full `VerificationContext`

## Requirements

### Functional
- check-tasks: return verification results for ALL task types (not just verify_role)
- tasks/verify: verify ALL task types and persist progress
- tasks/verify accepts optional `proofUrls` body: `{ proofUrls?: Record<string, string> }` (taskIndex → URL)
- Build full VerificationContext from User model (X, Discord, Telegram tokens/IDs)
- Pass telegramBotToken from env

### Non-functional
- Backward compatible — existing verify_role flow unchanged
- Response schema stays the same (results array with valid/error per task)

## Architecture

```
GET /check-tasks
  ├─ Fetch user (full model with tokens)
  ├─ For EACH task:
  │   └─ verifySocialAction(platform, actionType, taskIndex, ctx)
  └─ Return results[]

POST /tasks/verify
  ├─ Parse body { proofUrls?: { "2": "https://x.com/.../status/123" } }
  ├─ Fetch user (full model with tokens)
  ├─ For EACH unverified task:
  │   └─ verifySocialAction(platform, actionType, taskIndex, ctx)
  ├─ Persist verifiedIndices to participation.proof
  └─ Return results[] + progress
```

## Related Code Files

### Modify
- `apps/api/src/modules/quests/quests.routes.ts` — lines 552-735

## Implementation Steps

### 1. Add body schema for POST /tasks/verify

At the top of the file (near other Zod schemas), add:

```typescript
const VerifyTasksBody = z.object({
  proofUrls: z.record(z.string(), z.string().url()).optional(),
}).optional()
```

Update the POST schema to include body:
```typescript
schema: {
    // ... existing fields
    body: VerifyTasksBody,
}
```

### 2. Build VerificationContext helper

Add a helper function (near the routes, or inline):

```typescript
import { verifySocialAction, VerificationContext } from './social-action-verifier'

function buildVerificationContext(
  user: any,
  prisma: PrismaClient,
  proofUrls?: Record<string, string>,
  taskParams?: Record<string, string>,
): VerificationContext {
  return {
    userId: user.id,
    prisma,
    xId: user.xId,
    xAccessToken: user.xAccessToken,
    xRefreshToken: user.xRefreshToken,
    xTokenExpiry: user.xTokenExpiry,
    discordId: user.discordId,
    discordAccessToken: user.discordAccessToken,
    telegramId: user.telegramId,
    proofUrls: proofUrls
      ? Object.fromEntries(Object.entries(proofUrls).map(([k, v]) => [Number(k), v]))
      : undefined,
    params: taskParams,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  }
}
```

### 3. Rewrite GET /check-tasks handler (lines 575-603)

Replace the loop at lines 587-599:

```typescript
// OLD: only checked verify_role
// NEW: check all task types
const results: Array<{
  taskIndex: number; actionType: string;
  valid: boolean; error?: string; meta?: Record<string, string>
}> = []

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]
  const ctx = buildVerificationContext(
    user, server.prisma, undefined,
    task.params as Record<string, string>,
  )
  const result = await verifySocialAction(task.platform, task.actionType, i, ctx)
  results.push({ taskIndex: i, actionType: task.actionType, ...result })
}
```

### 4. Rewrite POST /tasks/verify handler (lines 658-701)

Parse body and replace the verification loop:

```typescript
// Parse proof URLs from body
const body = request.body as { proofUrls?: Record<string, string> } | undefined
const proofUrls = body?.proofUrls

const user = await server.prisma.user.findUnique({ where: { id: userId } })
const proof = (participation.proof as any) || {}
const verifiedIndices = new Set<number>(proof.verifiedIndices || [])

const results: any[] = []
let newVerification = false

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]
  if (verifiedIndices.has(i)) {
    results.push({ taskIndex: i, actionType: task.actionType, valid: true })
    continue
  }

  const ctx = buildVerificationContext(
    user, server.prisma, proofUrls,
    task.params as Record<string, string>,
  )
  const validationResult = await verifySocialAction(
    task.platform, task.actionType, i, ctx,
  )

  results.push({
    taskIndex: i,
    actionType: task.actionType,
    valid: validationResult.valid,
    error: validationResult.error,
  })

  if (validationResult.valid) {
    verifiedIndices.add(i)
    newVerification = true
  }
}

// Rest of the function (persist progress) stays unchanged (lines 703+)
```

### 5. Remove old "Manual verification required" fallback

The old code at line 698-700 returned:
```typescript
} else {
    results.push({ taskIndex: i, actionType: task.actionType, valid: false, error: 'Manual verification required' })
}
```

This is now replaced by the `verifySocialAction` call which handles all types.

## Todo List

- [ ] Add VerifyTasksBody Zod schema with proofUrls
- [ ] Add body schema to POST /tasks/verify route config
- [ ] Create buildVerificationContext helper
- [ ] Rewrite GET /check-tasks to verify all task types
- [ ] Rewrite POST /tasks/verify to verify all task types with proofUrls
- [ ] Remove "Manual verification required" fallback
- [ ] Import verifySocialAction + VerificationContext
- [ ] Compile check
- [ ] Manual test: verify_role still works (backward compat)

## Success Criteria
- All 8 task types verified through real API calls
- POST /tasks/verify accepts `{ proofUrls: { "3": "https://x.com/.../status/..." } }`
- Backward compatible: verify_role continues to work unchanged
- Progress persisted correctly to participation.proof.verifiedIndices

## Risk Assessment
- **Sequential API calls:** For quests with many tasks, verification is sequential. If each takes 2-3s, a quest with 8 tasks could take 20s. Mitigation: acceptable for MVP. Future optimization: parallelize with `Promise.allSettled`.
- **Stale X tokens after refresh:** ensureFreshToken writes new token to DB, but the in-memory `user` object still has the old token. The x-rest-client returns the new token directly so this is fine — the ctx.xAccessToken is only used as a fallback.

## Next Steps
- Phase 5 updates frontend to send proofUrls and show link-account warnings
