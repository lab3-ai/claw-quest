# Phase 2: Shared Schema + API

## Context
- Brainstorm: `plans/reports/brainstorm-260302-1248-quest-save-draft-flow.md`
- Phase 1 must complete first (DB fields exist)

## Overview
- **Priority:** high
- **Status:** completed
- **Effort:** medium (~45 min)

Update shared Zod schema with new fields, relax API validation for drafts, add publish validation gate on `draft→live` transition.

## Key Insights

- Current `POST /quests` validates tasks even for drafts → blocks partial saves
- Current `PATCH /quests/:id/status` does NO content validation → rewardAmount=0 quest could go live
- Need `network` + `drawTime` in shared schema so both API and dashboard can use them
- Publish validator should return structured field-level errors for frontend to display

## Requirements

### Functional
1. Shared `QuestSchema` includes `network` and `drawTime`
2. `CreateQuestSchema` defaults `rewardAmount` to 0
3. Draft create/update skips task param validation
4. `PATCH /quests/:id/status` validates all required fields when `draft→live`
5. Structured error response: `{ error: { code: 'PUBLISH_VALIDATION', fields: { ... } } }`

### Non-functional
- Existing API callers unaffected (all changes additive)
- Agent-created quests (via API key) still validate tasks on create (they don't use draft flow)

## Architecture

```
POST /quests (create)
  └─ if status='draft': skip validateAllTasks()
  └─ if status!='draft': validate as before (agent flow)

PATCH /quests/:id (update draft)
  └─ if quest.status='draft': skip validateAllTasks()

PATCH /quests/:id/status
  └─ if from='draft' to='live':
     └─ validatePublishRequirements(quest) → structured errors
     └─ if errors → 400 { code: 'PUBLISH_VALIDATION', fields: {...} }
```

## Related Code Files

**Modify:**
- `packages/shared/src/index.ts` — add `network`, `drawTime` to `QuestSchema`
- `apps/api/src/modules/quests/quests.routes.ts` — update Create/Update schemas, status transition
- `apps/api/src/modules/quests/quests.service.ts` — conditional task validation, createQuest defaults

**Create:**
- `apps/api/src/modules/quests/quests.publish-validator.ts` — publish validation logic (extracted for clarity)

## Implementation Steps

### Step 1: Update Shared Schema

In `packages/shared/src/index.ts`, add to `QuestSchema`:
```typescript
network: z.string().nullable().optional(),   // "Base", "BNB Smart Chain", etc.
drawTime: z.string().datetime().nullable().optional(), // Lucky Draw deadline
```

Rebuild shared: `pnpm --filter @clawquest/shared build`

### Step 2: Create Publish Validator

New file `apps/api/src/modules/quests/quests.publish-validator.ts`:

```typescript
export interface PublishValidationError {
  code: 'PUBLISH_VALIDATION';
  fields: Record<string, string>;
}

export function validatePublishRequirements(quest: any): PublishValidationError | null {
  const fields: Record<string, string> = {};

  if (!quest.title?.trim()) fields.title = 'Title is required';
  if (!quest.description?.trim()) fields.description = 'Description is required';
  if (!quest.rewardAmount || quest.rewardAmount <= 0) fields.rewardAmount = 'Reward amount must be > 0';
  if (!quest.totalSlots || quest.totalSlots <= 0) fields.totalSlots = 'Total slots must be > 0';

  // Tasks
  const tasks = quest.tasks ?? [];
  if (tasks.length === 0) {
    fields.tasks = 'At least one task is required';
  } else {
    // validate each task
    const taskErr = validateAllTasks(tasks);
    if (taskErr) fields.tasks = taskErr;
  }

  // Dates
  if (quest.expiresAt && new Date(quest.expiresAt) <= new Date()) {
    fields.expiresAt = 'Expiry must be in the future';
  }

  // Lucky Draw specific
  if (quest.type === 'LUCKY_DRAW') {
    if (!quest.drawTime) fields.drawTime = 'Draw time is required for Lucky Draw';
    if (quest.drawTime && quest.expiresAt && new Date(quest.drawTime) > new Date(quest.expiresAt)) {
      fields.drawTime = 'Draw time must be before expiry';
    }
  }

  return Object.keys(fields).length > 0 ? { code: 'PUBLISH_VALIDATION', fields } : null;
}
```

### Step 3: Update API Routes — CreateQuestSchema

In `quests.routes.ts`, update `CreateQuestSchema`:
```typescript
const CreateQuestSchema = QuestSchema.omit({
    id: true, createdAt: true, updatedAt: true,
    filledSlots: true, questers: true, questerNames: true, questerDetails: true,
}).extend({
    description: z.string().default(''),
    sponsor: z.string().default('System'),
    status: z.nativeEnum(QUEST_STATUS).default(QUEST_STATUS.DRAFT),
    rewardAmount: z.number().default(0),    // ← NEW: default 0
    startAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    tasks: z.array(QuestTaskSchema).default([]),
    requiredSkills: z.array(z.string()).default([]),
    network: z.string().optional(),         // ← NEW
    drawTime: z.string().datetime().optional(), // ← NEW
});
```

### Step 4: Update API Routes — UpdateQuestSchema

Add `network` and `drawTime` to the update body schema:
```typescript
network: z.string().optional(),
drawTime: z.string().datetime().nullable().optional(),
```

### Step 5: Conditional Task Validation in Service

In `quests.service.ts` → `createQuest()`:
```typescript
// Only validate tasks for non-draft quests (agent flow)
if (input.status !== 'draft') {
    const taskErr = validateAllTasks(tasks);
    if (taskErr) throw new QuestValidationError(taskErr);
}
```

In `updateQuest()`:
```typescript
// Only validate tasks if quest is not a draft
if (input.tasks && quest.status !== 'draft') {
    const taskErr = validateAllTasks(input.tasks);
    if (taskErr) throw new QuestValidationError(taskErr);
}
```

Add `network`, `drawTime` to update data mapping:
```typescript
if (input.network !== undefined) data.network = input.network;
if (input.drawTime !== undefined) data.drawTime = input.drawTime ? new Date(input.drawTime) : null;
```

### Step 6: Publish Gate in Status Transition

In `quests.routes.ts`, status transition handler — add before `prisma.quest.update`:

```typescript
// Validate publish requirements when going live
if (quest.status === 'draft' && newStatus === 'live') {
    const publishErr = validatePublishRequirements(quest);
    if (publishErr) {
        return reply.status(400).send({
            message: 'Quest does not meet publish requirements',
            ...publishErr,
        } as any);
    }
}
```

### Step 7: Update CreateQuest Service — network/drawTime

In `createQuest()`, add to `prisma.quest.create` data:
```typescript
network: input.network || null,
drawTime: input.drawTime ? new Date(input.drawTime) : null,
```

In `CreateQuestInput` interface:
```typescript
network?: string;
drawTime?: string;
```

### Step 8: Update formatQuestResponse

Add `network` and `drawTime` to response:
```typescript
network: quest.network ?? null,
drawTime: quest.drawTime ? quest.drawTime.toISOString() : null,
```

## Todo List

- [x] Add `network`, `drawTime` to shared QuestSchema
- [x] Rebuild shared package
- [x] Create `quests.publish-validator.ts`
- [x] Update CreateQuestSchema (rewardAmount default, network, drawTime)
- [x] Update UpdateQuestSchema (network, drawTime)
- [x] Conditional task validation in createQuest/updateQuest
- [x] Add publish gate to status transition route
- [x] Update createQuest service (network, drawTime fields)
- [x] Update formatQuestResponse (network, drawTime)
- [x] Compile check: `pnpm --filter api build`

## Success Criteria

- `POST /quests { title: "Test" }` succeeds (rewardAmount=0, no tasks)
- `PATCH /quests/:id { tasks: [...invalid] }` succeeds when quest is draft
- `PATCH /quests/:id/status { status: 'live' }` fails with structured errors when quest incomplete
- `PATCH /quests/:id/status { status: 'live' }` succeeds when quest is complete
- Agent flow (`status != 'draft'`) still validates tasks on create

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Agent-created quests bypass validation | Medium | Only skip for `status='draft'`, agents create with `status='live'` |
| Publish gate too strict | Low | Return field-level errors, frontend shows exactly what's missing |
| Shared schema change breaks dashboard | None | All new fields optional/nullable |
