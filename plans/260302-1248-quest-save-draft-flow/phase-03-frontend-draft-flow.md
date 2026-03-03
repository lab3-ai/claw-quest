# Phase 3: Frontend Draft Flow

## Context
- Brainstorm: `plans/reports/brainstorm-260302-1248-quest-save-draft-flow.md`
- Phase 2 must complete first (API accepts relaxed drafts + publish validation)

## Overview
- **Priority:** high
- **Status:** completed
- **Effort:** medium (~1h)

Add localStorage persistence for quest form, integrate publish validation, improve draft card UI in dashboard.

## Key Insights

- Current form loses all data on navigation — no persistence
- Dashboard already shows drafts with Edit button — just need UI polish
- Publish flow currently just does status transition, no validation check
- Form state includes: `FormData`, `socialEntries[]`, `selectedSkills[]` — all must persist

## Requirements

### Functional
1. Form state persists to localStorage on change (debounce 1s)
2. Restored from localStorage on mount (show banner)
3. Cleared on successful server save
4. `beforeunload` warning when unsaved changes exist
5. Publish button validates locally before API call
6. Incomplete fields shown in modal checklist
7. Draft cards show completion progress + muted style

### Non-functional
- localStorage key: `quest-draft-{questId || 'new'}`
- Max localStorage size ~5KB per draft (well within limits)
- No performance impact on form interaction

## Related Code Files

**Create:**
- `apps/dashboard/src/hooks/use-draft-persistence.ts` — localStorage persistence hook

**Modify:**
- `apps/dashboard/src/routes/_authenticated/quests/create.tsx` — integrate persistence hook, send network/drawTime
- `apps/dashboard/src/routes/_authenticated/dashboard.tsx` — draft card UI, publish button
- `apps/dashboard/src/styles/pages/create-quest.css` — banner style
- `apps/dashboard/src/styles/pages/dashboard.css` — draft card muted style

## Implementation Steps

### Step 1: Create `use-draft-persistence.ts` Hook

```typescript
// apps/dashboard/src/hooks/use-draft-persistence.ts

interface DraftState {
  form: FormData;
  socialEntries: SocialEntry[];
  selectedSkills: any[];
  savedAt: number; // timestamp
}

export function useDraftPersistence(questId?: string) {
  const key = `quest-draft-${questId || 'new'}`;

  const save = useCallback(debounce((state: DraftState) => {
    localStorage.setItem(key, JSON.stringify({ ...state, savedAt: Date.now() }));
  }, 1000), [key]);

  const restore = useCallback((): DraftState | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    // Also clear 'new' key when saving existing quest
    if (questId) localStorage.removeItem('quest-draft-new');
  }, [key, questId]);

  return { save, restore, clear };
}
```

### Step 2: Integrate Hook in `create.tsx`

1. Import and init hook:
   ```typescript
   const { save, restore, clear } = useDraftPersistence(editQuestId);
   ```

2. On mount — check for restored draft:
   ```typescript
   useEffect(() => {
     const draft = restore();
     if (draft) {
       setForm(draft.form);
       setSocialEntries(draft.socialEntries);
       setSelectedSkills(draft.selectedSkills);
       setRestoredBanner(true);
     }
   }, []);
   ```

3. On form/entries/skills change — save to localStorage:
   ```typescript
   useEffect(() => {
     save({ form, socialEntries, selectedSkills, savedAt: Date.now() });
   }, [form, socialEntries, selectedSkills]);
   ```

4. On successful server save — clear localStorage:
   ```typescript
   // In handleSave success callback:
   clear();
   ```

5. Banner UI:
   ```tsx
   {restoredBanner && (
     <div className="draft-restored-banner">
       Draft restored from local backup
       <button onClick={() => setRestoredBanner(false)}>Dismiss</button>
     </div>
   )}
   ```

6. beforeunload warning:
   ```typescript
   useEffect(() => {
     const handler = (e: BeforeUnloadEvent) => {
       if (hasUnsavedChanges) { e.preventDefault(); }
     };
     window.addEventListener('beforeunload', handler);
     return () => window.removeEventListener('beforeunload', handler);
   }, [hasUnsavedChanges]);
   ```

### Step 3: Send `network` and `drawTime` to API

In `create.tsx` submit handler, add to payload:
```typescript
const payload = {
  ...existingFields,
  network: form.network || undefined,
  drawTime: form.drawTime ? new Date(form.drawTime).toISOString() : undefined,
};
```

Note: `form.network` already exists in FormData but was never sent. `form.drawTime` also exists.

### Step 4: Publish Validation in Dashboard

In `dashboard.tsx`, add publish logic for draft quest cards:

```typescript
function getPublishErrors(quest: MineQuest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!quest.title?.trim()) errors.title = 'Title required';
  if (!quest.description?.trim()) errors.description = 'Description required';
  if (!quest.rewardAmount || quest.rewardAmount <= 0) errors.rewardAmount = 'Reward required';
  if (!quest.totalSlots || quest.totalSlots <= 0) errors.totalSlots = 'Slots required';
  const tasks = (quest.tasks as any[]) ?? [];
  if (tasks.length === 0) errors.tasks = 'Tasks required';
  return errors;
}
```

Publish button on draft card:
```tsx
const errors = getPublishErrors(quest);
const canPublish = Object.keys(errors).length === 0;

{isDraft && (
  <div className="draft-actions">
    <Link to="/quests/$questId/edit" params={{ questId: quest.id }}
      className="btn btn-sm btn-primary">Continue Editing</Link>
    <button
      className="btn btn-sm btn-accent"
      disabled={!canPublish}
      title={canPublish ? 'Publish quest' : `Missing: ${Object.values(errors).join(', ')}`}
      onClick={() => handlePublish(quest.id)}
    >Publish</button>
  </div>
)}
```

Publish handler:
```typescript
async function handlePublish(questId: string) {
  if (!confirm('Publish this quest? It will become visible to agents.')) return;
  const res = await fetch(`${API_BASE}/quests/${questId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ status: 'live' }),
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.code === 'PUBLISH_VALIDATION') {
      alert(`Cannot publish:\n${Object.values(err.fields).join('\n')}`);
    } else {
      alert(err.message || 'Failed to publish');
    }
    return;
  }
  queryClient.invalidateQueries({ queryKey: ['my-quests'] });
}
```

### Step 5: Draft Card UI Improvements

In dashboard, for draft quest cards:

```tsx
// Completion progress
function getDraftCompletion(quest: MineQuest): { done: number; total: number } {
  const checks = [
    !!quest.title?.trim(),
    !!quest.description?.trim(),
    quest.rewardAmount > 0,
    ((quest.tasks as any[]) ?? []).length > 0,
    !!quest.expiresAt,
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}
```

Card additions:
- Completion bar: `<div className="draft-progress">3/5 complete</div>`
- Muted card style: `className={isDraft ? 'quest-card quest-card-draft' : 'quest-card'}`
- "Continue Editing" as primary CTA (instead of current "Edit" secondary)

### Step 6: CSS Updates

`create-quest.css`:
```css
.draft-restored-banner {
  background: var(--accent-bg, #f0f7ff);
  border: 1px solid var(--accent, #3b82f6);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
```

`dashboard.css`:
```css
.quest-card-draft {
  border-style: dashed;
  opacity: 0.85;
}
.quest-card-draft:hover {
  opacity: 1;
}
.draft-progress {
  font-size: 0.8rem;
  color: var(--fg-muted);
}
.draft-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
```

## Todo List

- [x] Create `use-draft-persistence.ts` hook
- [x] Integrate hook in `create.tsx` (save, restore, clear, banner)
- [x] Add `beforeunload` warning for unsaved changes
- [x] Send `network` + `drawTime` in submit payload
- [x] Add `getPublishErrors()` + publish handler in dashboard
- [x] Add Publish button to draft cards
- [x] Add completion progress indicator to draft cards
- [x] Add draft card muted CSS style
- [x] Add restored banner CSS
- [x] Test: create new quest with only title → saves as draft
- [x] Test: navigate away and back → form restored from localStorage
- [x] Test: publish incomplete draft → shows missing fields
- [x] Test: publish complete draft → succeeds

## Success Criteria

- New quest form persists to localStorage as user types
- Navigating away and returning restores form state with banner
- Save Draft works with only title filled
- Dashboard shows draft completion progress
- Publish button disabled/enabled based on completeness
- Backend publish gate catches anything frontend misses

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| localStorage quota exceeded | Very Low | Draft data ~5KB, browsers allow 5-10MB |
| Stale localStorage vs server data | Low | Compare `savedAt` timestamp, show banner to choose |
| Types mismatch for DraftState | Low | Share types from create.tsx or extract to shared file |

## Security Considerations

- localStorage stores only form data — NO tokens, passwords, or session info
- Clear localStorage on logout (add to auth context cleanup)
- No XSS risk — data is only used to populate form fields, not rendered as HTML
