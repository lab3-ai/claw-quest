# Phase 1: Remove Agent Registration

**Priority:** High — clear bloat before building new features
**Status:** pending

## Context

Current agent registration has two flows:
1. **Human-initiated**: Human creates agent on dashboard → gets `activationCode` → agent exchanges code via `POST /agents/register`
2. **Agent self-register**: Agent calls `POST /agents/self-register` → gets `verificationToken` → human visits `/verify?token=...` → tweets verification code → `POST /agents/verify`

Both flows are being removed. The Agent *table* stays (referenced by `QuestParticipation`, `AgentLog`, `AgentSkill`). Registration-specific fields can be nulled out via migration.

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/modules/agents/agents.routes.ts` | Remove 4 routes |
| `apps/api/prisma/schema.prisma` | Remove registration fields from Agent model |
| `apps/dashboard/src/routes/_authenticated/verify.tsx` | Delete file |
| `apps/dashboard/src/routes/_authenticated/dashboard.tsx` | Remove register agent modal + related state |
| `apps/dashboard/src/services/agent.service.ts` | Remove `getAgentInfoByVerify`, `verifyAgent` |

## Migration

Remove fields: `activationCode`, `verificationToken`, `verificationExpiresAt`, `claimedAt`, `claimedVia`, `claimEmail`, `claimedXHandle`

These are all nullable, so removal is non-breaking for existing rows.

---

## Chunk 1: API — Remove Registration Routes

### Task 1.1: Remove 4 routes from agents.routes.ts

**Files:**
- Modify: `apps/api/src/modules/agents/agents.routes.ts`

Routes to delete:
- `POST /agents` — human creates agent (lines ~83–140 approx)
- `POST /agents/register` — agent exchanges activation code for API key
- `POST /agents/self-register` — agent creates itself
- `GET /agents/verify/:token` — public fetch agent by token
- `POST /agents/verify` — human claims agent via tweet

Also remove the `verifyTweet` import (no longer needed) if it's used only by `POST /agents/verify`.

- [ ] **Step 1: Identify exact line ranges**

```bash
grep -n "self-register\|/register\|/verify\|CreateAgentSchema\|verifyTweet" \
  apps/api/src/modules/agents/agents.routes.ts
```

- [ ] **Step 2: Remove POST /agents (create agent) route**

Delete the `server.post('/', ...)` block that uses `CreateAgentSchema` and generates `activationCode`.

- [ ] **Step 3: Remove POST /agents/register route**

Delete the `server.post('/register', ...)` block that exchanges `activationCode` for `agentApiKey`.

- [ ] **Step 4: Remove POST /agents/self-register route**

Delete the `server.post('/self-register', ...)` block that creates an agent with `verificationToken`.

- [ ] **Step 5: Remove GET /agents/verify/:token route**

Delete the `server.get('/verify/:token', ...)` block that returns agent info by token.

- [ ] **Step 6: Remove POST /agents/verify route**

Delete the `server.post('/verify', ...)` block that calls `verifyTweet`.

- [ ] **Step 7: Clean up unused imports**

Remove `import { verifyTweet }` if no other route uses it.
Remove `CreateAgentSchema` import if no longer used.
Check: `generateAgentApiKey` helper — keep it (used by future flows or existing routes), or remove if only used by deleted routes.

```bash
grep -n "generateAgentApiKey\|CreateAgentSchema\|verifyTweet" \
  apps/api/src/modules/agents/agents.routes.ts
```

- [ ] **Step 8: Compile check**

```bash
pnpm --filter api build 2>&1 | tail -20
```

Expected: no TypeScript errors.

---

### Task 1.2: Remove registration fields from Prisma schema + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Remove fields from Agent model**

In `schema.prisma`, remove these lines from the `Agent` model:
```
activationCode          String?                  @unique
verificationToken       String?                  @unique
verificationExpiresAt   DateTime?
claimedAt               DateTime?
claimedVia              String?
claimEmail              String?
claimedXHandle          String?                  @unique
```

Also remove the `@@index([verificationToken])` index.

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
# When prompted for migration name: remove_agent_registration_fields
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter api exec prisma generate
```

- [ ] **Step 4: Fix any TypeScript errors from removed fields**

```bash
grep -rn "activationCode\|verificationToken\|verificationExpiresAt\|claimedAt\|claimedVia\|claimEmail\|claimedXHandle" \
  apps/api/src/ apps/dashboard/src/ packages/
```

Fix each reference (likely in: `agents.routes.ts` list/get routes, `packages/shared/src/index.ts` AgentSchema).

- [ ] **Step 5: Update AgentSchema in shared package**

In `packages/shared/src/index.ts`, remove from `AgentSchema`:
```typescript
activationCode: z.string().nullable().optional(),
verificationToken: z.string().nullable().optional(),
verificationExpiresAt: z.string().datetime().nullable().optional(),
claimedAt: z.string().datetime().nullable().optional(),
claimedVia: z.string().nullable().optional(),
claimEmail: z.string().nullable().optional(),
```

- [ ] **Step 6: Rebuild shared package**

```bash
pnpm --filter @clawquest/shared build
```

- [ ] **Step 7: Full compile check**

```bash
pnpm build 2>&1 | tail -30
```

---

## Chunk 2: Dashboard — Remove Registration UI

### Task 1.3: Delete verify page

**Files:**
- Delete: `apps/dashboard/src/routes/_authenticated/verify.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm apps/dashboard/src/routes/_authenticated/verify.tsx
```

- [ ] **Step 2: Check for any links to /verify in dashboard**

```bash
grep -rn "verify\?token\|/verify" apps/dashboard/src/ --include="*.tsx" --include="*.ts"
```

Remove any links pointing to the old `/verify?token=` URL.

### Task 1.4: Remove register agent modal from dashboard.tsx

**Files:**
- Modify: `apps/dashboard/src/routes/_authenticated/dashboard.tsx`

- [ ] **Step 1: Identify and remove the register agent modal**

```bash
grep -n "register.*agent\|modal\|activationCode\|verificationToken" \
  apps/dashboard/src/routes/_authenticated/dashboard.tsx
```

- [ ] **Step 2: Remove modal state + handler**

Remove: modal open state, register agent button, the modal component/JSX, any `POST /agents` fetch call.

Keep: the agents tab (which shows existing agents), agent query (`GET /agents`), agent skills display.

- [ ] **Step 3: Remove activation-code display in agent list**

In the agents tab, remove any UI that shows `activationCode` or instructs user to copy/share it.

- [ ] **Step 4: Update agent.service.ts**

In `apps/dashboard/src/services/agent.service.ts`:
- Remove `getAgentInfoByVerify()` function
- Remove `verifyAgent()` function
- Remove related TypeScript types (`AgentVerifyInfo`, `VerifyAgentResponse`)

- [ ] **Step 5: Dashboard compile check**

```bash
pnpm --filter dashboard build 2>&1 | tail -20
```

Expected: no errors.

---

## Success Criteria

- [ ] `POST /agents` returns 404 (route removed)
- [ ] `POST /agents/register` returns 404
- [ ] `POST /agents/self-register` returns 404
- [ ] `GET /agents/verify/:token` returns 404
- [ ] `POST /agents/verify` returns 404
- [ ] `/verify` route is gone from dashboard
- [ ] No TypeScript compile errors
- [ ] Agent list page still loads (GET /agents still works)
- [ ] Agent detail page still loads
