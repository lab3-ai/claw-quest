# Phase 2 — Frontend `leaderboard-section.tsx`

## Priority: High | Status: Completed | Effort: M | Depends on: Phase 1

## Overview
Build `LeaderboardSection` component using shadcn Tabs + Table. 3 tabs, time period radio filter, compact table with rank styling. Single file ~150 lines.

## Context
- [Brainstorm report](../../plans/reports/brainstorm-260319-2259-home-leaderboard-section.md) — Design specs section
- Pattern: follow existing home.tsx sections (FeaturedQuests, PopularSkills)

## File to Create
- `apps/dashboard/src/components/leaderboard-section.tsx`

## Implementation Steps

### 1. Component structure

```
LeaderboardSection (exported)
├── SectionHeader (reuse from home.tsx — icon: TrophyLine)
├── Tabs (shadcn) — "agents" | "sponsors" | "recent-winners"
│   ├── Time filter radio (inside tab content, hidden for recent-winners)
│   └── Table (shadcn) — 5 rows
│       ├── Loading: 5 skeleton rows
│       ├── Empty: EmptyState message
│       └── Data: mapped rows with rank styling
```

### 2. Data fetching

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Single query hook, re-fetches on tab/period change
const { data, isLoading } = useQuery({
  queryKey: ["leaderboard", activeTab, period],
  queryFn: async () => {
    const params = new URLSearchParams({
      type: activeTab,
      period,
      limit: "5",
    });
    const res = await fetch(`${API_BASE}/leaderboard?${params}`);
    if (!res.ok) return { type: activeTab, period, entries: [] };
    return res.json();
  },
  staleTime: 300_000, // 5min — matches server cache
});
```

### 3. State management
```typescript
const [activeTab, setActiveTab] = useState<"agents" | "sponsors" | "recent-winners">("agents");
const [period, setPeriod] = useState<"week" | "month" | "all">("all");
```

### 4. Tabs UI (shadcn `<Tabs>`)

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0">
    <TabsTrigger value="agents" className="...">Top Agents</TabsTrigger>
    <TabsTrigger value="sponsors" className="...">Top Sponsors</TabsTrigger>
    <TabsTrigger value="recent-winners" className="...">Recent Winners</TabsTrigger>
  </TabsList>
  {/* Single TabsContent — table changes based on activeTab */}
</Tabs>
```

Tab trigger styling:
- Base: `text-sm font-medium text-fg-3 pb-2 px-0 rounded-none border-b-2 border-transparent`
- Active: `data-[state=active]:text-fg-1 data-[state=active]:border-accent`
- Hover: `hover:text-fg-2`

### 5. Time filter (radio group)

Only visible when `activeTab !== "recent-winners"`.

```tsx
{activeTab !== "recent-winners" && (
  <div className="flex gap-3 mt-3 mb-2">
    {(["week", "month", "all"] as const).map((p) => (
      <button
        key={p}
        onClick={() => setPeriod(p)}
        className={cn(
          "text-xs font-medium px-2 py-0.5 border",
          period === p
            ? "text-fg-1 border-fg-3"
            : "text-fg-3 border-transparent hover:text-fg-2"
        )}
      >
        {p === "week" ? "Weekly" : p === "month" ? "Monthly" : "All-time"}
      </button>
    ))}
  </div>
)}
```

### 6. Table columns per tab

| Tab | Col 1 | Col 2 | Col 3 | Col 4 |
|-----|-------|-------|-------|-------|
| agents | # (rank) | Agent (name + avatar) | Quests ✓ | Rewards |
| sponsors | # (rank) | Sponsor (name + avatar) | Quests | Total Funded |
| recent-winners | # (row num) | Quest (title + type badge) | Winner | Reward |

### 7. Rank styling helper

```typescript
function rankClass(rank: number): string {
  if (rank === 1) return "text-warning font-semibold";
  if (rank <= 3) return "text-fg-2 font-medium";
  return "text-fg-3";
}
```

### 8. Avatar display
- Use existing `avatarUtils.ts` → `getAvatarUrl()` or simple fallback
- Size: `w-5 h-5` (20px) inline with name
- Fallback: first letter of name in `bg-bg-3 text-fg-3` circle

### 9. Skeleton loading state
```tsx
// 5 rows × 4 cols of skeleton bars
{Array.from({ length: 5 }).map((_, i) => (
  <TableRow key={i} className="animate-pulse">
    <TableCell><div className="h-3 w-4 bg-bg-2 rounded" /></TableCell>
    <TableCell><div className="h-3 w-24 bg-bg-2 rounded" /></TableCell>
    <TableCell><div className="h-3 w-8 bg-bg-2 rounded" /></TableCell>
    <TableCell className="text-right"><div className="h-3 w-16 bg-bg-2 rounded ml-auto" /></TableCell>
  </TableRow>
))}
```

### 10. Empty state
```tsx
<div className="py-6 text-center text-xs text-fg-3">
  No data yet. Complete quests to climb the ranks!
</div>
```

## Design Token Reference
- Container: `bg-bg-1 border border-border px-4 py-4`
- Header text: `text-lg font-semibold text-foreground font-heading`
- Table header: `text-2xs uppercase tracking-wider text-fg-3`
- Table rows: `text-sm text-fg-2`, hover: `hover:bg-bg-2`
- Rewards column: `text-right tabular-nums`
- No border-radius (terminal theme)

## TODO
- [x] Create `leaderboard-section.tsx`
- [x] Implement Tabs with 3 tab triggers
- [x] Implement time filter radio buttons
- [x] Implement table with dynamic columns per tab
- [x] Add rank styling
- [x] Add skeleton loading
- [x] Add empty state
- [x] Verify dark mode appearance
