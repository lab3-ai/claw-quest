# Phase 5: Frontend Updates

## Context Links
- Quest detail page: `/Users/hd/clawquest/apps/dashboard/src/routes/_public/quests/detail.tsx`
- Auth context: `/Users/hd/clawquest/apps/dashboard/src/context/AuthContext.tsx`
- Quest detail CSS: `/Users/hd/clawquest/apps/dashboard/src/styles/pages/quest-detail.css`

## Overview
- **Priority:** P2 (UX polish, verification works without this but UX is rough)
- **Status:** completed
- **Effort:** 2.5h
- **Depends on:** Phase 4

Add URL proof input for post/quote_post tasks. Show "link your account" warnings. Send proofUrls in verify mutation body.

## Key Insights
- Current flow: "Do it" → opens link → "Verify" → POST /tasks/verify (no body)
- POST now accepts `{ proofUrls: { "2": "url" } }` — frontend needs to send it
- post/quote_post tasks need a text input for user to paste tweet URL
- /auth/me now returns `hasXToken`, `hasDiscordToken` — use to show link warnings
- TaskActionBtn pattern: status=done|verifying|failed|pending — no changes needed to component

## Requirements

### Functional
- Show text input below post/quote_post task cards for tweet URL proof
- Send proofUrls in POST /tasks/verify body
- Show "Link your X account" inline warning when user hasn't linked X (for X tasks)
- Show "Grant X verification access" button when xId exists but hasXToken=false (separate OAuth for read tokens)
- Show "Link your Discord account" inline warning when discordId missing (for Discord tasks)
- Show "Link your Telegram account" inline warning when telegramId missing (for Telegram tasks)
- After verification error "token expired", show "Re-link your X account" link
- **Quest creation wizard**: When sponsor selects `join_channel` (Telegram), show warning: "Add @ClawQuest_aibot as admin to your channel for verification to work"
- **Quest creation**: When sponsor saves `join_server` (Discord), backend auto-resolves invite → stores guildId in task params

### Non-functional
- No new CSS file — add styles inline or to existing quest-detail.css
- No new component files — keep changes in detail.tsx

## Architecture

```
detail.tsx changes:
├── State: proofUrls: Record<number, string>  (taskIndex → URL)
├── verifyMutation.mutationFn: send { proofUrls } in body
├── Task card: if post/quote_post → show <input> for tweet URL
├── Task card: if account not linked → show warning instead of action button
└── Error display: if error contains "re-link", add link to /dashboard (settings)
```

## Related Code Files

### Modify
- `apps/dashboard/src/routes/_public/quests/detail.tsx`
- `apps/dashboard/src/styles/pages/quest-detail.css` (minor additions)

## Implementation Steps

### 1. Add proofUrls state

Near line 159 (where `openedTasks` is defined):

```typescript
const [proofUrls, setProofUrls] = useState<Record<number, string>>({})
```

### 2. Update verifyMutation to send body

Current (line 321-328):
```typescript
mutationFn: async () => {
    const res = await fetch(`${API_BASE}/quests/${questId}/tasks/verify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
        },
    })
```

Change to:
```typescript
mutationFn: async () => {
    // Only include non-empty proof URLs
    const filteredProofs = Object.fromEntries(
        Object.entries(proofUrls).filter(([, v]) => v.trim())
    )
    const res = await fetch(`${API_BASE}/quests/${questId}/tasks/verify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(
            Object.keys(filteredProofs).length > 0
                ? { proofUrls: filteredProofs }
                : undefined
        ),
    })
```

### 3. Add proof URL input for post/quote_post tasks

Inside the task card rendering (after line 549, inside the task-card div), add conditionally:

```tsx
{/* Proof URL input for post/quote_post */}
{(task.actionType === "post" || task.actionType === "quote_post") && hasAccepted && !isVerified && (
    <div className="proof-url-row">
        <input
            type="url"
            className="proof-url-input"
            placeholder="Paste your tweet URL here..."
            value={proofUrls[idx] || ""}
            onChange={(e) => setProofUrls(prev => ({ ...prev, [idx]: e.target.value }))}
        />
    </div>
)}
```

### 4. Add link-account warning helper

Near the helper functions at the top:

```typescript
/** Check if user has the required linked account for a task platform */
function getMissingAccountWarning(task: any, user: any): string | null {
    if (!user) return null
    if (task.platform === "x" && !user.xId) return "Link your X account in Settings to verify"
    if (task.platform === "discord" && !user.discordId) return "Link your Discord account in Settings to verify"
    if (task.platform === "telegram" && !user.telegramId) return "Link your Telegram account in Settings to verify"
    return null
}
```

### 5. Show link-account warning in task card

Inside the task card (after TaskActionBtn), show warning when account not linked:

```tsx
{/* Account link warning */}
{hasAccepted && !isVerified && (() => {
    const warning = getMissingAccountWarning(task, meData)
    if (!warning) return null
    return (
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4, paddingLeft: 24 }}>
            {warning} — <Link to="/dashboard" style={{ color: "var(--link)" }}>Settings</Link>
        </div>
    )
})()}
```

Note: `meData` comes from the existing `/auth/me` query. Check if detail.tsx already fetches it, or use `useAuth()` context which provides `user`.

### 6. Add CSS for proof URL input

Append to `quest-detail.css`:

```css
.proof-url-row {
    padding: 4px 0 0 24px;
}

.proof-url-input {
    width: 100%;
    padding: 6px 8px;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg, #fff);
    color: var(--fg);
}

.proof-url-input:focus {
    border-color: var(--accent);
    outline: none;
}
```

### 7. Handle "re-link" errors in task error display

In the error display section (line 550-553), enhance to show action link:

```tsx
{hasFailed && (
    <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4, paddingLeft: 24 }}>
        {taskErrors[idx]}
        {taskErrors[idx]?.includes("re-link") && (
            <> — <Link to="/dashboard" style={{ color: "var(--link)" }}>Go to Settings</Link></>
        )}
    </div>
)}
```

## Todo List

- [ ] Add proofUrls state variable
- [ ] Update verifyMutation to include proofUrls in request body
- [ ] Add proof URL input below post/quote_post task cards
- [ ] Add getMissingAccountWarning helper (includes "Grant X access" for linked-but-no-token state)
- [ ] Show link-account warning when identity not linked
- [ ] Add "Grant X verification access" button that triggers GET /auth/x/authorize flow
- [ ] Add Telegram bot guidance warning in quest creation wizard for join_channel
- [ ] Backend: auto-resolve Discord invite → store guildId in join_server task params at creation time
- [ ] Add .proof-url-row and .proof-url-input CSS
- [ ] Handle "re-link" error messages with Settings link
- [ ] Compile check: `pnpm --filter dashboard build`

## Success Criteria
- post/quote_post tasks show text input for tweet URL
- proofUrls sent in POST body
- Missing-account warnings show with link to Settings
- "Re-link" errors show actionable link
- No visual regressions on other task types

## Risk Assessment
- **detail.tsx file size:** Already a large file. Adding ~30 lines is acceptable but monitor size.
- **Auth context:** Need to verify `/auth/me` data is accessible in detail.tsx. The `useAuth()` hook provides `user` but may not have `xId`/`discordId` — may need a separate /me query or rely on error messages from backend instead.

## Next Steps
- Phase 6 adds tests for the new verification paths
