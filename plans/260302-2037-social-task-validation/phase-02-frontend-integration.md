# Phase 2: Frontend Hook + ChipInput Integration

## Context
- Quest creation wizard: `apps/dashboard/src/routes/_authenticated/quests/create.tsx` (~1660 lines)
- `ChipInput` component defined inline (line 320-387) — handles add/remove chips with sync `validate` callback
- `SocialEntryBody` component (line 390-565) — renders per-action fields, uses `ChipInput`
- Hooks dir: `apps/dashboard/src/hooks/` (4 existing hooks)
- API base: `const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"`

## Overview
- **Priority**: High
- **Status**: Pending
- **Effort**: 3h

## Key Insights
- Current `ChipInput.validate` is synchronous (returns `string | null`). Existence validation is async.
- Strategy: Keep sync regex validation in `validate`. Add async existence check AFTER chip is added — show loading/result status on the chip itself.
- Chips currently render as `<span class="chip"><span class="chip-check">...</span>...</span>`. Add validation states: loading (spinner), valid (green check), invalid (red X + tooltip).
- Debounce not needed per-chip (validation fires once on Enter press, not per keystroke).

## Files to Create

### `apps/dashboard/src/hooks/use-social-validation.ts` (~80 lines)
Custom hook that manages async validation state per chip.

```typescript
interface ChipValidation {
  status: 'idle' | 'loading' | 'valid' | 'invalid'
  error?: string
  meta?: Record<string, string>
}

// Key = `{taskIndex}-{chipValue}` for uniqueness
type ValidationMap = Map<string, ChipValidation>

export function useSocialValidation(session: { access_token: string } | null) {
  const [validations, setValidations] = useState<ValidationMap>(new Map())

  async function validateChip(
    taskIndex: number, chipValue: string,
    platform: string, actionType: string
  ): Promise<void> { ... }

  function getChipStatus(taskIndex: number, chipValue: string): ChipValidation { ... }
  function clearTask(taskIndex: number): void { ... }

  return { validateChip, getChipStatus, clearTask }
}
```

## Files to Modify

### `apps/dashboard/src/routes/_authenticated/quests/create.tsx`

**Changes required (4 locations):**

1. **Import hook** (~line 6): Add `import { useSocialValidation } from "@/hooks/use-social-validation"`

2. **Initialize hook** (~line 583, inside `CreateQuest` component):
   ```typescript
   const { validateChip, getChipStatus, clearTask } = useSocialValidation(session)
   ```

3. **Trigger validation on chip add** — modify `addChip` handler (~line 630):
   After `setHumanTasks(...)`, call `validateChip(idx, value, task.platform, task.actionType)`

4. **Pass validation state to ChipInput** — in `SocialEntryBody` calls (~line 1092):
   Pass `getChipStatus` so chips can render loading/valid/invalid indicators

### `apps/dashboard/src/routes/_authenticated/quests/create.tsx` — ChipInput enhancement

The `ChipInput` component (line 320-387) needs a new optional prop for async validation state:

```typescript
// Add to ChipInput props:
chipStatus?: (chipValue: string) => { status: string; error?: string; meta?: Record<string,string> }
```

Chip rendering changes (line 362-367):
```tsx
// Current:
<span className="chip">
  <span className="chip-check">...</span>
  <span className="chip-text">{formatChip ? formatChip(chip) : chip}</span>
  <button className="chip-remove">x</button>
</span>

// New:
<span className={`chip ${statusClass}`} title={statusTooltip}>
  <span className="chip-status-icon">{statusIcon}</span>
  <span className="chip-text">{formatChip ? formatChip(chip) : chip}</span>
  <button className="chip-remove">x</button>
</span>
```

Where:
- `loading` → spinning icon (CSS animation), class `chip-validating`
- `valid` → green check, class `chip-valid`, tooltip shows meta (e.g. "Elon Musk")
- `invalid` → red X, class `chip-invalid`, tooltip shows error
- `idle` → current green check (backwards compatible)

### `apps/dashboard/src/styles/pages/create-quest.css`

Add chip validation state styles (~15 lines):

```css
.chip-validating { opacity: 0.7; }
.chip-validating .chip-status-icon { animation: spin 1s linear infinite; }
.chip-valid .chip-status-icon { color: var(--accent); }
.chip-invalid { border-color: #e53e3e; background: rgba(229,62,62,0.08); }
.chip-invalid .chip-status-icon { color: #e53e3e; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

## Architecture

```
User types "@elonmusk" → presses Enter
  ↓
ChipInput.validate() runs sync regex → passes → chip added to state
  ↓
addChip() callback fires → calls validateChip(idx, "elonmusk", "X", "follow_account")
  ↓
useSocialValidation sets status = "loading" for key "0-elonmusk"
  ↓
Chip renders with spinner icon
  ↓
fetch GET /quests/validate-social?platform=x&type=follow_account&value=elonmusk
  ↓
API returns { valid: true, meta: { name: "Elon Musk" } }
  ↓
useSocialValidation sets status = "valid", meta = { name: "Elon Musk" }
  ↓
Chip renders with green check + tooltip "Elon Musk"
```

**Invalid flow**:
```
User types "@zzz_fake_user" → passes regex → chip added → fetch returns { valid: false }
  ↓
Chip renders with red X icon + tooltip "X account not found"
  ↓
Chip is NOT auto-removed (user can manually remove or keep — it's a warning, not a blocker)
```

## Implementation Steps

### 1. Create `use-social-validation.ts` hook

- `validateChip()`: Builds URL, fetches with auth header, updates validation map
- `getChipStatus()`: Returns current validation state for a chip
- `clearTask()`: Removes all validations for a task index (used when task is deleted)
- Handle fetch errors gracefully (set status to `idle`, not `invalid`)
- Use `AbortController` to cancel in-flight requests if component unmounts

### 2. Enhance `ChipInput` in `create.tsx`

- Add `chipStatus` optional prop
- Map chip status to CSS class + icon character
- `loading`: "..." or Unicode spinner character (U+25CC or simple CSS rotate on existing check)
- `valid`: existing "..." check mark
- `invalid`: "!" or "x" character
- Add `title` attribute for tooltip

### 3. Wire up in `SocialEntryBody`

- Pass `chipStatus` prop derived from `getChipStatus(idx, chip)`
- Only pass for action types that support validation (not `post`)

### 4. Wire up in `CreateQuest` component

- Call `validateChip()` inside existing `addChip` handler
- Call `clearTask()` when a social task entry is removed

### 5. Add CSS styles

- Append to `apps/dashboard/src/styles/pages/create-quest.css`

## Todo List
- [ ] Create `apps/dashboard/src/hooks/use-social-validation.ts`
  - [ ] `validateChip()` with fetch + auth header
  - [ ] `getChipStatus()` lookup
  - [ ] `clearTask()` cleanup
  - [ ] AbortController for cleanup on unmount
- [ ] Modify `ChipInput` component to accept `chipStatus` prop
  - [ ] Render loading/valid/invalid states on chips
  - [ ] Tooltip with meta info or error message
- [ ] Modify `SocialEntryBody` to pass `chipStatus` to ChipInput
- [ ] Modify `CreateQuest` to initialize hook + trigger on addChip
- [ ] Add CSS for `.chip-validating`, `.chip-valid`, `.chip-invalid`
- [ ] Test: add valid X username → see green check + name tooltip
- [ ] Test: add invalid X username → see red indicator + error tooltip
- [ ] Test: add Discord invite → see server name on success
- [ ] Test: remove task → validations cleared

## Success Criteria
- Adding a valid X username shows loading then green check with account name tooltip
- Adding a non-existent X username shows loading then red indicator with "X account not found"
- Adding a valid Discord invite shows server name
- Adding an expired Discord invite shows error
- Validation states persist across accordion open/close
- No console errors, no memory leaks (AbortController cleanup)
- Existing ChipInput behavior unchanged when `chipStatus` not provided

## Risk Assessment
- **create.tsx is already ~1660 lines**: Adding more code risks file bloat. Mitigation: hook extracts all async logic. ChipInput changes are minimal (~15 lines). Consider extracting ChipInput to its own file in a future refactor.
- **Race conditions**: User adds then immediately removes chip. Mitigation: AbortController cancels in-flight request. Validation map keyed by value handles stale updates.
