# Phase 3 — Integrate into Home Page

## Priority: Medium | Status: Completed | Effort: S | Depends on: Phase 2

## Overview
Import `LeaderboardSection` into home.tsx, place between PopularSkills and LatestBounties sections.

## File to Modify
- `apps/dashboard/src/routes/_public/home.tsx`

## Implementation Steps

### 1. Add import
```typescript
import { LeaderboardSection } from "@/components/leaderboard-section";
```

### 2. Add to JSX (line ~501, between section 3 and 4)

Current order:
```tsx
<FeaturedQuests ... />    {/* Section 2 */}
<PopularSkills />         {/* Section 3 */}
{/* INSERT HERE */}
<LatestBounties />        {/* Section 4 */}
```

Add:
```tsx
{/* 3.5 Leaderboard */}
<LeaderboardSection />
```

### 3. Update section comments
Renumber comments: Leaderboard becomes Section 4, Bounties becomes Section 5, How It Works becomes Section 6.

## TODO
- [x] Import LeaderboardSection
- [x] Insert between PopularSkills and LatestBounties
- [x] Update section numbering comments
- [x] Visual check on desktop + mobile
