# Phase 3: UX Polish

**Priority:** MEDIUM | **Status:** Pending | **Effort:** ~2h

## Overview

Replace "Loading..." text with skeleton loaders, add consistent error states, add hover transitions, and implement focus trap in the Register Agent modal.

## Files to Modify/Create

| File | Action |
|------|--------|
| `apps/dashboard/src/routes/_authenticated/dashboard.tsx` | Skeleton loaders for quests + agents, focus trap in modal |
| `apps/dashboard/src/routes/_authenticated/account.tsx` | Loading + error states |
| `apps/dashboard/src/styles/pages/dashboard.css` | Skeleton + hover transition rules |
| `apps/dashboard/src/styles/pages/account.css` | Skeleton rules for account sections |
| `apps/dashboard/src/styles/buttons.css` | Already done in Phase 1 (transition) |

No new shared CSS files needed. The `.skeleton` utility from Phase 1 handles the animation. Page-specific skeleton shapes go in page CSS.

## Implementation Steps

### 3.1 Quest list skeleton in `dashboard.tsx`

**Current** (line ~407):
```tsx
{questsLoading && (
  <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>Loading quests...</div>
)}
```

**Replace with:**
```tsx
{questsLoading && (
  <div className="quest-skeleton-list">
    {[1, 2, 3].map(i => (
      <div key={i} className="quest-item">
        <div className="quest-stats">
          <div className="skeleton" style={{ width: 60, height: 32 }} />
          <div className="skeleton" style={{ width: 50, height: 14 }} />
        </div>
        <div className="quest-body">
          <div className="skeleton" style={{ width: "70%", height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "90%", height: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "40%", height: 12 }} />
        </div>
        <div className="quest-time-col">
          <div className="skeleton" style={{ width: 60, height: 14 }} />
        </div>
      </div>
    ))}
  </div>
)}
```

### 3.2 Agent table skeleton in `dashboard.tsx`

**Current** (line ~644):
```tsx
{agentsLoading && (
  <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-muted)" }}>Loading agents...</div>
)}
```

**Replace with:**
```tsx
{agentsLoading && (
  <table className="agent-table">
    <thead>
      <tr>
        <th className="col-agent">Agent</th>
        <th className="col-skill-status">Status</th>
        <th className="col-skills">Skills</th>
        <th className="col-quests">Quests</th>
      </tr>
    </thead>
    <tbody>
      {[1, 2, 3].map(i => (
        <tr key={i}>
          <td><div className="skeleton" style={{ width: 120, height: 14 }} /></td>
          <td><div className="skeleton" style={{ width: 70, height: 14 }} /></td>
          <td><div className="skeleton" style={{ width: 140, height: 14 }} /></td>
          <td><div className="skeleton" style={{ width: 30, height: 14, margin: "0 auto" }} /></td>
        </tr>
      ))}
    </tbody>
  </table>
)}
```

### 3.3 Account page loading + error states

**Current** `account.tsx` has no loading/error handling for profile or wallets queries. The `useQuery` calls don't destructure `isLoading` or `isError`.

**Modify the profile query** (line ~49):
```tsx
const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<UserProfile>({
```

**Modify the wallets query** (line ~62):
```tsx
const { data: wallets = [], isLoading: walletsLoading, isError: walletsError } = useQuery<Wallet[]>({
```

**In the Profile section body** (replace inner content of `.account-section-body` for profile):
```tsx
<div className="account-section-body">
  {profileLoading ? (
    <>
      <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
      <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
      <div className="account-row"><span className="skeleton" style={{ width: "60%", height: 16 }} /></div>
    </>
  ) : profileError ? (
    <div className="account-error">
      Failed to load profile. <button className="btn btn-sm btn-secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["auth", "me"] })}>Retry</button>
    </div>
  ) : (
    /* existing profile rows unchanged */
  )}
</div>
```

**In the Wallets section body**, wrap similarly:
```tsx
{walletsLoading ? (
  <div className="account-row"><span className="skeleton" style={{ width: "100%", height: 16 }} /></div>
) : walletsError ? (
  <div className="account-error">
    Failed to load wallets. <button className="btn btn-sm btn-secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ["wallets"] })}>Retry</button>
  </div>
) : (
  /* existing wallets content unchanged */
)}
```

### 3.4 Account error style in `account.css`

Append:
```css
/* === ERROR STATE === */
.account-error {
  font-size: 12px;
  color: var(--red);
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### 3.5 Hover transitions on interactive elements

In `dashboard.css`, modify existing rules:

**Quest item hover** -- add after `.quest-item:last-child { border-bottom: none; }`:
```css
.quest-item { transition: background var(--transition-fast, 150ms ease); }
.quest-item:hover { background: var(--sidebar-bg); }
```

**Agent row** -- already has `.agent-table tr.agent-row:hover td { background: #fafbfc; }`. Add transition:
```css
.agent-table td { transition: background var(--transition-fast, 150ms ease); }
```

Add to the existing `.agent-table td` rule (line 150), appending the transition property.

### 3.6 Focus trap in Register Agent modal

The modal in `dashboard.tsx` currently opens/closes but doesn't trap focus. Implement a lightweight focus trap.

**Add helper function** at top of dashboard component (or in a small `useFocusTrap` hook):

```tsx
import { useCallback } from "react"

// Inside the component, after showRegisterModal state:
const modalRef = useRef<HTMLDivElement>(null)

const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === "Escape") {
    setShowRegisterModal(false)
    return
  }
  if (e.key !== "Tab") return

  const modal = modalRef.current
  if (!modal) return

  const focusable = modal.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}, [])
```

**On the modal backdrop div**, add:
```tsx
<div
  className="modal-backdrop visible"
  onClick={() => setShowRegisterModal(false)}
  onKeyDown={handleModalKeyDown}
>
  <div className="modal" ref={modalRef} role="dialog" aria-label="Register an Agent" ...>
```

**Auto-focus on open** -- add `useEffect`:
```tsx
useEffect(() => {
  if (showRegisterModal && modalRef.current) {
    const first = modalRef.current.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])'
    )
    first?.focus()
  }
}, [showRegisterModal])
```

## Todo

- [ ] Replace quest "Loading..." with skeleton cards in `dashboard.tsx`
- [ ] Replace agent "Loading..." with skeleton table rows in `dashboard.tsx`
- [ ] Add `isLoading`/`isError` destructuring to account queries in `account.tsx`
- [ ] Add loading skeleton + error state with retry for profile section
- [ ] Add loading skeleton + error state with retry for wallets section
- [ ] Add `.account-error` style to `account.css`
- [ ] Add `transition` + `:hover` to `.quest-item` in `dashboard.css`
- [ ] Add `transition` to `.agent-table td` in `dashboard.css`
- [ ] Add focus trap (`handleModalKeyDown` + `modalRef`) to Register Agent modal
- [ ] Add auto-focus on modal open
- [ ] Add Escape key handler for modal close
- [ ] Run `pnpm --filter dashboard build`
- [ ] Test: loading states appear briefly on slow network (DevTools throttle to Slow 3G)
- [ ] Test: Tab cycles within modal when open, Escape closes it

## Success Criteria

1. Build passes
2. Quest/agent loading shows skeleton shimmer instead of plain text
3. Account page: disable network in DevTools, reload -- see error states with retry buttons
4. Hover over quest items -- subtle background transition visible
5. Open Register Agent modal, press Tab repeatedly -- focus stays inside modal
6. Press Escape while modal is open -- modal closes

## Risk Assessment

- **Medium risk.** `dashboard.tsx` is 600+ lines. Keep changes surgical -- only replace the loading divs and add the focus trap. Do NOT refactor surrounding code.
- Account page changes are low risk -- additive conditional rendering around existing JSX.
- Focus trap is a common pattern, no external dependencies needed. Keep it as inline logic (no new util file).
