# Code Review: Quest Save Draft Flow

**Date:** 2026-03-02 13:05
**Scope:** 10 files, ~400 LOC changed (API schema, routes, service, frontend create/dashboard, persistence hook, CSS)
**Focus:** Correctness, security, edge cases

---

## Overall Assessment

Solid implementation. The two-phase validation design (relaxed for drafts, strict on publish) is sound. localStorage persistence hook is clean. A few correctness and security issues need attention.

---

## Critical Issues

### 1. `updatedAt` required in `CreateQuestSchema` body

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` lines 21-40

`CreateQuestSchema` omits `id`, `createdAt`, `filledSlots`, `questers`, `questerNames`, `questerDetails` from `QuestSchema` but does NOT omit `updatedAt`. Since `QuestSchema.updatedAt` is `z.string().datetime()` (required, non-optional), the schema technically requires `updatedAt` in the POST body. The frontend never sends it.

This either silently fails (Fastify strips extra validation) or is masked by passthrough behavior. Either way, `updatedAt` must be omitted.

**Fix:**
```typescript
const CreateQuestSchema = QuestSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,  // <-- add this
    filledSlots: true,
    questers: true,
    questerNames: true,
    questerDetails: true,
}).extend({...})
```

### 2. Publish validator parses `quest.tasks` as `QuestTask[]` but DB stores it as JSON

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.publish-validator.ts` line 19

```typescript
const tasks: QuestTask[] = quest.tasks ?? [];
```

`quest.tasks` from Prisma is `Json` type (raw `any`). The type assertion `QuestTask[]` is unsafe -- if the stored JSON is malformed (e.g. user saved a partial draft with bad task data), `validateAllTasks` will crash or produce misleading errors.

**Fix:** Parse with Zod before validating:
```typescript
import { QuestTaskSchema } from '@clawquest/shared';
const parsed = z.array(QuestTaskSchema).safeParse(quest.tasks ?? []);
if (!parsed.success) {
    fields.tasks = 'Tasks contain invalid data — re-edit required';
} else if (parsed.data.length === 0) {
    fields.tasks = 'At least one task is required';
} else {
    const taskErr = validateAllTasks(parsed.data);
    if (taskErr) fields.tasks = taskErr;
}
```

---

## High Priority

### 3. Dead-code task validation in `updateQuest` service

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.service.ts` lines 182-189

```typescript
if (quest.status !== 'draft') throw new QuestNotEditableError(); // line 182
// ...
if (input.tasks && quest.status !== 'draft') {  // line 186 — ALWAYS false
    const taskErr = validateAllTasks(input.tasks);
```

Line 182 already throws if `quest.status !== 'draft'`. So the condition on line 186 (`quest.status !== 'draft'`) is always false -- task validation in `updateQuest` never runs. This is benign because the publish validator catches it on the transition, but it's dead code that misleads readers.

**Fix:** Remove lines 185-189 or change the logic to validate tasks on update when provided (even for drafts), giving early feedback:
```typescript
if (input.tasks && input.tasks.length > 0) {
    const taskErr = validateAllTasks(input.tasks);
    if (taskErr) throw new QuestValidationError(taskErr);
}
```

### 4. Auto-save logic inverted for edit mode

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/create.tsx` lines 609-613

```typescript
if (editPopulated.current || !isEditMode) {
    saveDraft({ form, socialEntries: humanTasks, selectedSkills: requiredSkills })
}
```

This reads: "save to localStorage if `editPopulated` is true OR if NOT in edit mode." For edit mode, `editPopulated.current` starts `false` then becomes `true` after the form is populated from the API response. So before the API data loads, it skips (correct). After population, it saves (saves edit mode data to localStorage).

The problem: when editing a server-saved draft, auto-save writes to `quest-draft-{id}` in localStorage. But the `restore` path on line 598 only runs `if (isEditMode) return` -- so the localStorage data for edit mode is never restored. It's written but never read. This is harmless wasted storage, but confusing.

**Recommendation:** Either skip auto-save entirely in edit mode (since the server is the source of truth), or restore from localStorage in edit mode too to preserve unsaved edits on page refresh.

### 5. `rewardAmount` type mismatch: DB `Int` vs API `number`

**File:** `/Users/hd/clawquest/apps/api/prisma/schema.prisma` line 78

```prisma
rewardAmount Int @default(0)
```

`rewardAmount` is `Int` in Prisma (integer). The frontend sends floating-point numbers (e.g. 150.50 USDC). Prisma will silently truncate to integer. For stablecoins this is usually fine (amounts in cents or whole dollars), but the UI doesn't enforce integer-only input.

If this is intentional (amounts stored as whole units), document it. If decimal precision is needed, consider `Float` or `Decimal`.

---

## Medium Priority

### 6. Publish validator missing `expiresAt` requirement

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.publish-validator.ts` lines 27-30

The validator checks that `expiresAt` is in the future IF provided, but does not require it to be set. A quest can go live with no expiry. The frontend's `getDraftCompletion` treats `expiresAt` as one of 5 completion checks, but neither the frontend `getPublishErrors` nor the backend `validatePublishRequirements` blocks publishing without it.

**Decision needed:** Is an expiry date required to publish? If yes, add validation. If optional, align `getDraftCompletion` by removing `!!quest.expiresAt` from the completion checks (currently shows 4/5 complete even when the quest is publishable).

### 7. Frontend `getPublishErrors` and backend `validatePublishRequirements` diverge

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/dashboard.tsx` lines 54-63

The frontend validation (`getPublishErrors`) does NOT check:
- `expiresAt` in the future
- Lucky Draw `drawTime` requirement
- Task params validity (only checks task count > 0)

The backend catches these, so it's not a security issue, but the UX is poor: the "Publish" button enables, user clicks, then gets a server error. Mirror the backend checks in the frontend for better UX.

### 8. `description` allows empty string on create but publish requires it

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` line 29

```typescript
description: z.string().default(''),
```

A draft can be created with `description: ''` (the default). Later, publish validation requires `description.trim()` to be truthy. This is correct behavior but the PATCH update schema (line 833) allows `description: z.string().optional()` -- meaning an empty string `""` can be patched in. This is fine since the publish gate catches it, but consider `z.string().min(1).optional()` for the PATCH to give immediate feedback.

### 9. localStorage stale draft collision

**File:** `/Users/hd/clawquest/apps/dashboard/src/hooks/use-draft-persistence.ts`

There's no staleness check. If a user saves a draft to the server, comes back days later, the stale localStorage data is restored on the `/quests/new` page. The `savedAt` timestamp is stored but never checked.

**Recommendation:** Add a max-age check (e.g., 7 days) on restore:
```typescript
if (draft && Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem(key)
    return null
}
```

### 10. Status transition endpoint does not check admin role

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` line 902

```typescript
if (quest.creatorUserId !== userId) return reply.status(403).send(...)
```

Admins cannot transition quest status. The pattern elsewhere is `isQuestCreatorOrAdmin()`. This should use the same pattern for consistency.

---

## Low Priority

### 11. `beforeunload` fires even for new empty forms

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_authenticated/quests/create.tsx` line 618

```typescript
if (form.title.trim()) e.preventDefault()
```

The condition is correct (only warns if title has content), but it fires on EVERY navigation including after successful save. The `clearDraft` runs in `onSuccess`, but `beforeunload` doesn't know the save succeeded. Since the user navigates away via React Router (not page unload), this is mostly cosmetic -- `beforeunload` only fires on actual page close/refresh.

### 12. `network` field has no server-side validation

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts` line 38

```typescript
network: z.string().optional(),
```

Any string is accepted. Consider `z.enum([...])` with known network values to prevent typos and ensure consistency with the frontend's `NETWORKS_PRIMARY` + `NETWORKS_OTHER` list.

---

## Positive Observations

- Clean separation: publish validation is its own file, reusable and testable
- Draft persistence hook is simple, well-scoped, and handles quota exceeded gracefully
- The `clearDraft` logic correctly clears both `quest-draft-{id}` and `quest-draft-new`
- Dashed-border visual treatment for drafts is a nice UX touch
- Status transition validation is properly gated at the API layer (not just frontend)
- `beforeunload` warning prevents accidental data loss

---

## Recommended Actions (priority order)

1. **Omit `updatedAt` from `CreateQuestSchema`** -- potential silent validation failure
2. **Safe-parse `quest.tasks` JSON in publish validator** -- prevents runtime crash on malformed data
3. **Remove dead task validation code in `updateQuest`** -- misleading dead code
4. **Align frontend `getPublishErrors` with backend `validatePublishRequirements`** -- UX improvement
5. **Add staleness check to draft persistence** -- prevents restoring weeks-old data
6. **Decide on `expiresAt` requirement for publishing** -- frontend/backend already disagree on whether it's "complete"

---

## Unresolved Questions

- Is `rewardAmount` intentionally integer? If so, the frontend reward input should restrict to whole numbers.
- Should `expiresAt` be required to publish a quest, or is it truly optional?
- Should the status transition endpoint allow admin override (`isQuestCreatorOrAdmin` pattern)?
