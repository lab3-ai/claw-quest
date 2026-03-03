# Explore: "Quest Full" / "Spots Filled" Logic

**Date:** 2026-03-03 19:13  
**Status:** Complete  

## Summary

The "Quest Full" / "spots filled" logic is **purely based on participant count vs total slots**, NOT on quest type. All three quest types (FCFS, LUCKY_DRAW, LEADERBOARD) use the same slot-filling mechanism. The system calculates fullness as `filledSlots >= totalSlots` and displays it on both the frontend and API layers.

---

## 1. Frontend Quest Detail Page

**File:** `/Users/hd/clawquest/apps/dashboard/src/routes/_public/quests/detail.tsx` (919 lines)

### Spot Calculation
```typescript
// Line 388-389
const slotsLeft = quest.totalSlots - quest.filledSlots
const spotsPercent = quest.totalSlots > 0 ? Math.round((quest.filledSlots / quest.totalSlots) * 100) : 0
```

### Spots Filled Progress Bar
**Lines 685-698:** Renders the visual progress bar in the sidebar:
```tsx
<div className="spots-bar">
    <div className="spots-header">
        <span className="spots-label">{quest.filledSlots} / {quest.totalSlots} spots filled</span>
        <span className="spots-value" style={{ color: slotsLeft < 5 ? "var(--red)" : "var(--fg)" }}>
            {slotsLeft} left
        </span>
    </div>
    <div className="spots-track">
        <div
            className={`spots-fill ${slotsLeft < 5 ? "hot" : "normal"}`}
            style={{ width: `${spotsPercent}%` }}
        />
    </div>
</div>
```

**Visual behavior:**
- When `< 5 slots left`: bar color changes to red (`.hot` class)
- When `>= 5 slots left`: bar is accent color (`.normal` class)
- Progress: `width = (filledSlots / totalSlots) * 100%`

### "Quest Full" Button Text
**Lines 787-806:** Accept button logic for authenticated users:
```tsx
if (isLive && isAuthenticated) {
    if (quest.myParticipation) {
        // Already accepted — show status
        return <div>Quest Accepted ✓</div>
    }
    return (
        <button
            className={`cta-btn ${!acceptMutation.isPending && slotsLeft > 0 ? "primary" : "disabled"}`}
            disabled={acceptMutation.isPending || slotsLeft <= 0}
            onClick={() => acceptMutation.mutate()}
        >
            {acceptMutation.isPending ? "Accepting..." : slotsLeft <= 0 ? "Quest Full" : "Accept Quest"}
        </button>
    )
}
```

**Logic:**
- **`slotsLeft <= 0`** → button text becomes **"Quest Full"**
- **`slotsLeft > 0`** → button text is **"Accept Quest"**
- Button is **disabled** when `slotsLeft <= 0` (visual + functional)

### Optimistic UI Update
**Lines 288-305:** When accept succeeds, local state is updated immediately:
```typescript
queryClient.setQueryData<QuestWithParticipation>(["quest", questId, token], (old) => {
    if (!old) return old
    return {
        ...old,
        filledSlots: old.filledSlots + 1,  // ← Increment locally
        myParticipation: { ... }
    }
})
```
This makes the progress bar and button state change instantly before the server refetch completes.

---

## 2. API Endpoint: GET /quests/:id

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts`  
**Lines:** 114-251

### Response Schema
```typescript
QuestSchema.extend({
    isPreview: z.boolean().optional(),
    fundingRequired: z.boolean().optional(),
    myParticipation: z.object({
        id: z.string(),
        status: z.string(),
        // ... other fields
    }).optional(),
})
```

**Note:** There is **NO `isFull` field** returned by the API. The frontend **calculates it**:
```
isFull = filledSlots >= totalSlots
```

### What Gets Returned
- `filledSlots: number` — actual filled count
- `totalSlots: number` — max slots
- `questers: number` — count of active participations
- `questerNames: string[]` — first few agent names for UI
- `questerDetails: object[]` — agent name + human owner handle

The frontend uses `filledSlots` and `totalSlots` to calculate everything.

---

## 3. Accept Quest Endpoint: POST /quests/:id/accept

**File:** `/Users/hd/clawquest/apps/api/src/modules/quests/quests.routes.ts`  
**Lines:** 880-965 (approximate)

### Full Check
```typescript
// Line 917
if (quest.filledSlots >= quest.totalSlots) 
    return reply.status(400).send({ message: 'Quest is full' } as any);
```

**Order of checks:**
1. Quest exists? → 404 if not
2. Quest status is "live"? → 400 if not
3. **Quest is full?** → 400 "Quest is full"
4. Skill gate validation (if required)
5. Already participated? → 400 if yes
6. Create participation record
7. Increment `filledSlots` with atomic `{ increment: 1 }`

### Slot Increment
```typescript
// Lines 951-952
const sideEffects: Promise<any>[] = [
    server.prisma.quest.update({ where: { id }, data: { filledSlots: { increment: 1 } } }),
];
```

This is atomic — no race conditions on the increment.

---

## 4. Shared Types

**File:** `/Users/hd/clawquest/packages/shared/src/index.ts`

### Quest Schema
```typescript
export const QuestSchema = z.object({
    id: z.string().uuid(),
    // ...
    totalSlots: z.number(),      // Max slots for this quest
    filledSlots: z.number(),      // Current filled count
    type: z.nativeEnum(QUEST_TYPE),  // FCFS | LEADERBOARD | LUCKY_DRAW
    status: z.nativeEnum(QUEST_STATUS),
    questers: z.number().default(0),
    questerNames: z.array(z.string()).default([]),
    // ...
});

export const QUEST_TYPE = {
    FCFS: 'FCFS',
    LEADERBOARD: 'LEADERBOARD',
    LUCKY_DRAW: 'LUCKY_DRAW',
};
```

**Critical finding:** `filledSlots` and `totalSlots` are generic numeric fields — **quest type does NOT affect slot mechanics**.

---

## 5. CSS Styling

**File:** `/Users/hd/clawquest/apps/dashboard/src/styles/pages/quest-detail.css`  
**Lines:** 116-124

```css
/* Spots meter */
.spots-bar { padding: 10px 12px; border-bottom: 1px solid var(--border); }
.spots-header { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
.spots-header .spots-label { color: var(--fg-muted); font-weight: 600; }
.spots-header .spots-value { font-family: var(--font-mono); font-weight: 700; }
.spots-track { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
.spots-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.spots-fill.normal { background: var(--accent); }  /* Orange/accent when normal */
.spots-fill.hot { background: var(--red); }        /* Red when < 5 slots left */
```

---

## 6. Database Schema (Inferred)

**From Prisma usage:**
```prisma
model Quest {
  id         String   @id @default(uuid())
  totalSlots Int      // Set at creation
  filledSlots Int     @default(0)  // Incremented on accept
  type       String   // FCFS | LEADERBOARD | LUCKY_DRAW
  // ... other fields
}

model QuestParticipation {
  questId String
  userId  String
  status  String   // in_progress | submitted | verified | rejected | completed | failed
}
```

---

## Key Findings

1. **No `isFull` computed field**: The API returns raw `filledSlots` and `totalSlots`. FE calculates:
   ```
   slotsLeft = totalSlots - filledSlots
   isFull = slotsLeft <= 0
   ```

2. **Quest type is irrelevant to slots**: All three types use identical slot-filling logic:
   - **FCFS**: First come first served — winner is determined by accept order
   - **LEADERBOARD**: Winner by score — but still fills same slots
   - **LUCKY_DRAW**: Random winner — but still fills same slots

3. **Button state machine**:
   - Pending accept → "Accepting..."
   - `slotsLeft <= 0` → "Quest Full" (disabled)
   - `slotsLeft > 0` → "Accept Quest" (enabled)
   - Already participated → "Quest Accepted" (disabled)
   - Quest ended/draft → context-specific button

4. **Visual urgency**: When < 5 slots remain:
   - Progress bar turns red (`.hot` class)
   - Remaining count shows in red text
   - Creates visual urgency for users

5. **Atomic increment**: `filledSlots` is incremented atomically via Prisma:
   ```
   { filledSlots: { increment: 1 } }
   ```
   No race condition risk.

6. **Optimistic update**: FE increments `filledSlots` locally before server refetch, making button state change instant.

---

## Data Flow (Accept Quest)

```
User clicks "Accept Quest"
  ↓
acceptMutation.mutate() fires
  ↓
Frontend optimistically updates:
  - filledSlots += 1
  - myParticipation = { id, status: "in_progress", ... }
  - slotsLeft recalculates
  - Button changes to "Quest Accepted"
  ↓
POST /quests/:id/accept
  ↓
API checks: filledSlots >= totalSlots? → abort if true
  ↓
Creates QuestParticipation record
  ↓
Atomically increments Quest.filledSlots
  ↓
Returns { participationId, ... }
  ↓
Frontend receives response
  ↓
queryClient.invalidateQueries({ queryKey: ["quest", questId] })
  ↓
Component re-fetches fresh data from API
```

---

## Unresolved Questions

None identified. The "Quest Full" logic is straightforward:
- `filledSlots >= totalSlots` determines fullness
- No special type-specific handling
- API returns numeric fields; FE calculates `isFull`
- Button, progress bar, and error handling are all consistent
