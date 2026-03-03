# Brainstorm: Quest Save Draft Flow — Backend & API Integration

**Date:** 2026-03-02
**Topic:** Improve quest save draft flow with relaxed validation, localStorage persistence, missing DB fields, and publish validation

---

## Problem Statement

Current quest creation requires near-complete data even for drafts. Users lose progress on form navigation. Missing DB fields (`network`, `drawTime`), `rewardAmount` has no default (blocks partial saves), and publish flow has no frontend validation gate.

## Decisions (from discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-save strategy | LocalStorage only, manual Save Draft | Simpler, no ghost records on server |
| My Quests UX | Keep existing filter tabs | Already works, just improve draft card UI |
| Draft validation | Only `title` required, rewardAmount=0 default | Let users save incomplete work |
| Publish validation | Frontend blocks + backend safety net | Best UX + security |
| Telegram OIDC | Separate scope — not related | Different plan |

---

## Approach: 3-Layer Changes

### Layer 1: Database Schema

```prisma
// Changes to Quest model:
rewardAmount  Int       @default(0)     // was: no default
network       String?                   // new: "Base", "BNB Smart Chain", etc.
drawTime      DateTime?                 // new: Lucky Draw deadline
```

**Migration:** single `ALTER TABLE` migration, all nullable/default — no data backfill needed.

**Note on rewardAmount type:** Keep `Int` for now. Crypto rewards are whole tokens (100 USDC, not 100.50). If fractional needed later, migrate to `Decimal` then.

### Layer 2: API Changes

#### A. Relaxed Create (`POST /quests`)

```
Current: rewardAmount required (no default), tasks validated
Proposed: rewardAmount defaults to 0, tasks validation SKIPPED when status='draft'
```

- Only `title` required for draft creation
- Add `network`, `drawTime` to `CreateQuestSchema` (both optional)
- Skip `validateAllTasks()` when `input.status === 'draft'`

#### B. Relaxed Update (`PATCH /quests/:id`)

- Same: skip task validation when quest.status === 'draft'
- Accept `network`, `drawTime` in `UpdateQuestSchema`

#### C. Publish Validation (`PATCH /quests/:id/status`)

When `to === 'live'`, validate:

| Field | Rule |
|-------|------|
| title | non-empty |
| description | non-empty |
| rewardAmount | > 0 |
| totalSlots | > 0 |
| tasks | length > 0 AND all pass `validateAllTasks()` |
| expiresAt | in the future (if set) |
| type=LUCKY_DRAW + drawTime | required, must be before expiresAt |

Return structured errors: `{ error: { code: 'PUBLISH_VALIDATION', fields: { description: 'required', ... } } }`

#### D. New endpoint consideration

No new endpoints needed — existing `POST`, `PATCH`, and `PATCH /status` cover all flows.

### Layer 3: Frontend Changes

#### A. localStorage Persistence

```typescript
// Key: `quest-draft-{questId || 'new'}`
// On field change: debounce 1s → save to localStorage
// On mount: check localStorage → restore if found → show banner
// On successful Save Draft to server: clear localStorage
// On navigate away with unsaved: browser beforeunload warning
```

**Scope:** form state only (`FormData`, `socialEntries`, `selectedSkills`). NOT auth tokens.

#### B. Save Draft Flow

```
User opens /quests/create
  → Check localStorage for 'quest-draft-new'
  → If found: restore form, show "Draft restored" banner
  → User fills form (any fields)
  → Click "Save Draft"
    → POST /quests { title, ...partialFields, status: 'draft' }
    → Get questId back
    → Clear localStorage 'quest-draft-new'
    → Set localStorage key to 'quest-draft-{questId}'
    → Navigate to /dashboard (draft filter)
```

**Edit existing draft:**
```
User opens /quests/{questId}/edit
  → Fetch quest from API
  → Check localStorage 'quest-draft-{questId}'
  → If localStorage newer: restore from localStorage, show banner
  → User edits
  → Click "Save Draft" → PATCH /quests/{questId}
  → Clear localStorage
```

#### C. Publish Flow (Frontend Gate)

```
Draft quest card → "Publish" button
  → Frontend validates all required fields
  → If incomplete: show modal with checklist of missing fields
  → If complete: confirm dialog → PATCH /quests/:id/status { status: 'live' }
  → Backend validates again (safety net)
```

#### D. Draft Card UI Improvements

Current: same card as published with "draft" badge.
Proposed additions:
- Show completion progress (e.g., "3/5 sections complete")
- "Continue Editing" primary CTA
- Muted style / dashed border to visually distinguish from live quests
- Quick actions: Edit | Delete | Publish (when complete)

---

## Architecture Summary

```
┌─ Frontend (React) ─────────────────────────────────┐
│  localStorage ←→ Form State                        │
│  Save Draft btn → POST/PATCH /quests (relaxed)     │
│  Publish btn → validate locally → PATCH /status    │
└──────────────────────────┬──────────────────────────┘
                           │
┌─ API (Fastify) ──────────▼──────────────────────────┐
│  POST /quests   → skip task validation if draft     │
│  PATCH /quests  → skip task validation if draft     │
│  PATCH /status  → FULL validation when draft→live   │
│                   structured error response          │
└──────────────────────────┬──────────────────────────┘
                           │
┌─ Database (Prisma) ──────▼──────────────────────────┐
│  Quest.rewardAmount @default(0)                     │
│  Quest.network      String?                         │
│  Quest.drawTime     DateTime?                       │
└─────────────────────────────────────────────────────┘
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Orphan drafts (never completed) | Low | Periodic cleanup cron (delete drafts > 30d old, no tasks) |
| localStorage data stale vs server | Low | Show banner, let user choose which version |
| rewardAmount=0 goes live | Low | Backend validation gate on publish |
| Breaking existing create flow | Medium | All changes additive — existing API callers unaffected |

## Not In Scope

- Auto-save to server (debounced PATCH) — user prefers manual
- New My Quests tab layout — keep existing filter tabs
- Telegram OIDC — separate plan
- `rewardAmount` Float/Decimal migration — Int sufficient for now

## Implementation Order

1. **DB migration** — add `network`, `drawTime`, default `rewardAmount`
2. **API schemas** — update Create/Update schemas, add publish validation
3. **API service** — conditional task validation, publish gate logic
4. **Frontend localStorage** — hook for persist/restore form state
5. **Frontend publish gate** — validation modal + PATCH /status integration
6. **Draft card UI** — completion indicator, muted style, CTAs
