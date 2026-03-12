# Mobile Responsive Implementation Audit - ClawQuest Dashboard

**Date**: 2026-03-12
**Scope**: 4 main quest pages + shared components
**Target Viewports**: 375px-768px (mobile & tablet)
**Status**: Read-only audit of current responsive state

---

## Executive Summary

The ClawQuest dashboard implements **partial responsive design** with heavy reliance on `sm:` breakpoint (640px+). The layout scales poorly for 375px-480px mobile screens, requiring:

1. **Tab/Filter UI** - Not mobile-friendly (horizontal overflow)
2. **Hidden columns** - Stats columns hidden on mobile but no mobile-specific UI
3. **Layout direction** - Grid/flex hardcoded to desktop-first breakpoints
4. **Spacing** - Fixed px-6 padding on auth layout too large for 375px
5. **Font sizes** - Small text sizes (text-xs) become hard to read on mobile

---

## 1. Main Pages Current State

### Quest Explore (`/apps/dashboard/src/routes/_authenticated/quests/index.tsx`)

**Current Breakpoint Usage:**
- `grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]` (line 291, 351)
- `hidden sm:flex` (lines 320, 329)
- `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0` (line 376) - compact view

**Mobile Responsive State**: ⚠️ PARTIAL
- Grid view: Works (single col on mobile)
- List view: Hides reward/time columns on mobile ✓
- Compact (table) view: Horizontal scroll on mobile ⚠️ (needs touch-friendly handling)

**Issues for 375px-480px:**
- Tab buttons crammed into single row (9 buttons + 3 view toggles)
- Text truncation needed for tab labels
- View toggle buttons (30px width each) take up 90px + gap
- No stacked mobile layout for tabs/filters
- Padding `px-6` on layout = 12px margins left/right (too large ratio on 375px)

**Required Changes:**
- Add `max-sm:` breakpoint styles for tabs (stack or collapse to icon mode)
- Add `max-sm:gap-2` to reduce spacing on tabs
- Add `max-sm:text-xs` to tab text
- Make view toggle buttons stack vertically on mobile
- Reduce layout padding to `max-sm:px-3` or `max-sm:px-4`

---

### Quest Manage (`/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx`)

**Current Breakpoint Usage:**
- `flex flex-col md:flex-row gap-6` (line 327) - main/sidebar layout
- `md:min-w-2xs md:max-w-xs` (line 498) - sidebar width
- `w-full md:min-w-2xs` (line 498)
- `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0` (line 408) - table scroll

**Mobile Responsive State**: ⚠️ PARTIAL
- Sidebar stacks on mobile ✓
- Table has horizontal scroll on mobile ⚠️
- Buttons flex-wrap on smaller screens (line 336, 465)

**Issues for 375px-480px:**
- Participant table columns fixed width (`px-4 py-[0.65rem]`) - hard to read
- Status badges with text hard to parse on narrow screens
- Modal max-width `w-[560px]` from dashboard.tsx needs mobile constraint
- No mobile table optimization (consider card-based UI for participants)
- Proof details collapse (`<details>`) not touch-friendly on mobile

**Required Changes:**
- Add `max-sm:text-[10px]` to table text
- Make participant table card-based on mobile (`max-sm:grid grid-cols-1`)
- Add `max-sm:hidden` to non-critical table columns
- Stack proof section vertically on mobile

---

### Dashboard (`/apps/dashboard/src/routes/_authenticated/dashboard.tsx`)

**Current Breakpoint Usage:**
- `max-sm:w-[calc(100vw-32px)] max-sm:max-h-[90vh]` (line 324) - modal
- `w-[560px] max-h-[80vh]` → `max-sm:w-[calc(100vw-32px)]` (good mobile constraint)
- Register modal responsive ✓

**Mobile Responsive State**: ✓ GOOD
- Modal scales to mobile width
- Content areas stack vertically
- Tabs work with URL params

**Issues for 375px-480px:**
- Tab content no margin adjustments for narrow screens
- Quest/Agent cards may not optimize for narrow viewports
- Card view vs list view toggle not visible on mobile

**Required Changes:**
- Reduce modal padding on mobile `max-sm:px-3 max-sm:py-2`
- Add `max-sm:gap-2` to reduce spacing in modal sections
- Ensure tab content has `max-sm:px-3` padding adjustment

---

### Create Quest (`/apps/dashboard/src/routes/_authenticated/quests/create.tsx`)

**Current Breakpoint Usage:**
- `width-[380px]` arbitrarily for one-off layout
- Form inputs full width, no explicit responsive styling shown
- Truncated in read (first 300 lines)

**Mobile Responsive State**: ⚠️ UNKNOWN (partial read)
- Multi-step form should handle mobile
- Chip input for social tasks not mobile-tested

**Required Changes:**
- Validate all input widths are responsive
- Chip input keyboard/touch handling for mobile
- Form step indicators responsive on mobile

---

## 2. Shared Components Current State

### PageTitle (`/apps/dashboard/src/components/page-title.tsx`)

**Current Code:**
```tsx
<div className={cn("flex justify-between items-end py-3", ...)}>
    <div>
        <h1 className="text-3xl font-semibold">...</h1>
        <div className="mt-2 text-sm">...</div>
    </div>
    {actions && <div className="flex gap-2">...</div>}
</div>
```

**Mobile Responsive State**: ❌ NOT RESPONSIVE
- `text-3xl` heading too large on mobile (28px)
- `justify-between` will cause action buttons to wrap awkwardly
- No `max-sm:` styling at all

**Required Changes:**
- Add `max-sm:flex-col max-sm:items-start max-sm:gap-3`
- Add `max-sm:text-xl` to heading (20px)
- Add `max-sm:text-xs` to description
- Stack actions below title on mobile

---

### QuestCard (`/apps/dashboard/src/components/QuestCard.tsx`)

**Current Code:**
```tsx
<Link className="flex gap-6 p-4 border...">
    {/* Stats: hidden sm:flex (line 90) */}
    <div className="hidden sm:flex flex-col w-[140px] shrink-0">...</div>
    {/* Body: flex-1 min-w-0 */}
    <div className="flex-1 min-w-0">...</div>
    {/* Time: hidden sm:flex (line 147) */}
    <div className="hidden sm:flex flex-col min-w-[100px] shrink-0">...</div>
</Link>
```

**Mobile Responsive State**: ⚠️ PARTIAL
- Stats hidden on mobile ✓
- Time hidden on mobile ✓
- Body text scales (line-clamp-2 works)
- No mobile-specific stats display

**Issues for 375px-480px:**
- Stats completely hidden - user can't see reward/slots without clicking
- Tags take up too much space (line 138-143)
- Title text-base, description text-sm good for mobile ✓
- Gap-6 between columns too large ratio on 375px (24px on narrow screen)

**Required Changes:**
- Add `max-sm:gap-3` (reduce gap on mobile)
- Add mobile stats row above body: `max-sm:flex max-sm:gap-4 max-sm:mb-2 max-sm:pb-2 max-sm:border-b`
- Show compact reward inline on mobile
- Limit tags to 2 on mobile: `max-sm:[&>span]:max-w-6`

---

### QuestGridCard (`/apps/dashboard/src/components/QuestGridCard.tsx`)

**Current Code:**
```tsx
<Link className="flex flex-col border...p-4">
    <div className="flex justify-between items-center mb-3">
        <span className="...text-xs">Type</span>
        <span className="...text-xs">Time</span>
    </div>
    <h3 className="text-md...">Title</h3>
    <p className="text-sm...line-clamp-2">Desc</p>
    <div className="flex flex-wrap gap-1 mb-3">Tags</div>
    <div className="mt-auto pt-3 border-t">
        <div>Reward</div>
        <div>Slots</div>
    </div>
</Link>
```

**Mobile Responsive State**: ✓ GOOD
- Grid of 1 column on mobile ✓
- Type badge and time always visible ✓
- Title and description responsive ✓
- Tags flex-wrap handles narrow screens ✓

**Issues for 375px-480px:**
- Cards min 320px width from grid, may not account for mobile padding
- Time text small (text-xs = 12px) on 375px
- Spacing `p-4 mb-3` good for mobile
- Stats section bottom may be cut off on small screens

**Required Changes:**
- Add `max-sm:text-[11px]` to type/time for better readability
- Add `max-sm:p-3` for tighter padding on mobile
- Ensure stats section fully visible (okay as-is)

---

## 3. Navigation Layout (`_authenticated.tsx`)

**Current Breakpoint Usage:**
```tsx
<header className="sticky top-0 z-50 bg-background">
    <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-6">
        {/* Desktop nav: hidden sm:flex */}
        <nav className="hidden items-center gap-1 sm:flex">...</nav>
        
        {/* Mobile hamburger: sm:hidden */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger ... className="ml-auto sm:hidden">
                {/* SVG hamburger icon */}
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
                {/* Mobile menu */}
            </SheetContent>
        </Sheet>
        
        {/* Desktop right: hidden sm:flex */}
        <div className="ml-auto hidden items-center gap-3 sm:flex">
            <Button>Create Quest</Button>
            <Button variant="outline">Dashboard</Button>
            {/* Dropdown */}
        </div>
    </div>
</header>
```

**Mobile Responsive State**: ✓ GOOD
- Hamburger menu on mobile ✓
- Sheet modal for mobile nav ✓
- Desktop nav hidden on mobile ✓
- Logo always visible ✓

**Issues for 375px-480px:**
- Header padding `px-6` = 12px left/right margin on 375px (tight fit)
- Logo may need to be smaller on mobile
- Sheet width `w-64` (256px) is 68% of 375px screen (okay)
- Mobile menu options stack fine

**Required Changes:**
- Add `max-sm:px-3 max-sm:gap-1` to header
- Add `max-sm:scale-90 max-sm:origin-left` to logo or reduce size
- Sheet width already constrains mobile-friendly ✓

---

## 4. Tailwind Breakpoint Configuration

**Current Configuration** (from `index.css` lines 1-100):
- Using Tailwind CSS v4 with `@theme` block
- Standard breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- CSS variables for design tokens (colors, fonts, spacing)

**Available Breakpoints for Implementation:**
```
max-sm:    < 640px  ← PRIMARY TARGET (375-640px)
sm:        >= 640px (tablet)
md:        >= 768px (tablet+)
lg:        >= 1024px (desktop)
xl:        >= 1280px (large desktop)
max-md:    < 768px
max-lg:    < 1024px
```

**Design Tokens Available** (lines 7-100):
- Spacing: Standard Tailwind (1, 2, 3, 4, 5, 6, 8, etc.)
- Text sizes: `text-xs` (12px), `text-sm` (14px), `text-base`, `text-md`, `text-lg`, etc.
- Colors: Full design system via CSS variables
- Radius: `radius`, `radius-sm`, etc.

---

## 5. Files Needing Mobile Updates

### CRITICAL (User-facing pages):

| File | Issue | Priority |
|------|-------|----------|
| `/apps/dashboard/src/components/page-title.tsx` | No responsive styles at all | 1 |
| `/apps/dashboard/src/routes/_authenticated/quests/index.tsx` | Tab/filter UI not mobile-friendly | 1 |
| `/apps/dashboard/src/components/QuestCard.tsx` | Hidden stats on mobile, bad gap ratio | 1 |
| `/apps/dashboard/src/routes/_authenticated/quests/$questId/manage.tsx` | Table not mobile-optimized | 2 |
| `/apps/dashboard/src/routes/_authenticated/dashboard.tsx` | Modal content needs spacing adjustment | 2 |

### SECONDARY (Layout/Infrastructure):

| File | Issue | Priority |
|------|-------|----------|
| `/apps/dashboard/src/routes/_authenticated.tsx` | Header padding too large | 2 |
| `/apps/dashboard/src/components/QuestGridCard.tsx` | Minor text size adjustments | 3 |
| `/apps/dashboard/src/routes/_authenticated/quests/create.tsx` | Unknown (partial read) | 3 |

---

## 6. Responsive Patterns to Implement

### Pattern 1: Stacked Layout on Mobile
```tsx
// BEFORE (Desktop-first)
<div className="flex gap-6 items-start">
    <div className="w-[140px] shrink-0">Stats</div>
    <div className="flex-1">Content</div>
</div>

// AFTER (Mobile-first with override)
<div className="max-sm:flex-col max-sm:gap-3 flex gap-6 items-start">
    <div className="max-sm:w-full max-sm:border-b max-sm:pb-2 max-sm:order-2 w-[140px] shrink-0">Stats</div>
    <div className="flex-1">Content</div>
</div>
```

### Pattern 2: Hidden Columns with Mobile Alternative
```tsx
// BEFORE
<div className="hidden sm:flex w-[140px]">Desktop Stats</div>

// AFTER
<div className="hidden sm:flex w-[140px]">Desktop Stats</div>
<div className="max-sm:flex sm:hidden gap-2 text-xs">Mobile Stats Compact</div>
```

### Pattern 3: Responsive Text & Spacing
```tsx
// BEFORE
<h1 className="text-3xl font-semibold">Title</h1>
<div className="px-6">Content</div>

// AFTER
<h1 className="max-sm:text-xl text-3xl font-semibold">Title</h1>
<div className="max-sm:px-3 px-6">Content</div>
```

### Pattern 4: Responsive Grid
```tsx
// BEFORE
<div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">

// AFTER (375px safe)
<div className="grid grid-cols-1 max-sm:gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
```

---

## 7. Key Findings - What Works

✓ **Good responsive patterns already in use:**
- Grid auto-fill with minmax works for mobile
- Hamburger menu for mobile nav ✓
- Modal responsive width on mobile ✓
- Flex-wrap for action buttons ✓
- Line-clamp for text overflow ✓
- Horizontal scroll with negative margin for tables ✓

✓ **Design tokens support mobile design:**
- CSS variables properly configured
- Text size tokens available (xs through 3xl)
- Spacing tokens available
- Color system supports all viewports

---

## 8. Key Findings - What Needs Work

❌ **Critical gaps:**
1. **No `max-sm:` usage** - Page title, many components missing mobile styles
2. **Layout padding** - `px-6` too aggressive on 375px (12px margins = 24px total, 6.4% of width)
3. **Tab/Filter UI** - 9 tabs + 3 toggles crammed on 375px screen
4. **Hidden content** - Stats columns hidden on mobile with no mobile alternative
5. **Text sizing** - Some `text-xs` (12px) hard to read on small phones
6. **Gap ratios** - `gap-6` (24px) on 375px is 6.4% of width (feels cramped ratio)
7. **Button widths** - View toggle buttons fixed 30px, take up 1/3 of narrow screens

---

## 9. Unresolved Questions

1. **Create Quest page** - Was file truncated; unclear if form inputs are responsive
2. **Touch interactions** - No explicit touch-optimized button sizes (48px min-touch target)
3. **Viewport meta tag** - Is `viewport` meta properly configured in HTML?
4. **Mobile test device** - Which devices were tested? iPhone 14 Pro (390px), iPhone SE (375px)?
5. **Performance** - Are images optimized for mobile? SVG file sizes?
6. **Orientation** - Any landscape mode optimization needed?
7. **Typography on mobile** - Line heights appropriate for small screens?

---

## Next Steps (For Implementation)

### Phase 1: Quick Wins (2-3 hours)
- [ ] Update `PageTitle` with `max-sm:` styles
- [ ] Add mobile spacing to auth layout (`px-3` override)
- [ ] Add text-size overrides for `text-3xl`, `text-sm` headings

### Phase 2: Content Components (4-5 hours)
- [ ] Update `QuestCard` with `max-sm:gap-3`, mobile stats
- [ ] Update `QuestGridCard` with `max-sm:text-[11px]`, `max-sm:p-3`
- [ ] Update grid gap-4 to `max-sm:gap-3`

### Phase 3: Complex Layouts (6-8 hours)
- [ ] Redesign Quest Explore tabs for mobile (collapse/tabs)
- [ ] Redesign Manage quest table for mobile (cards or minimal columns)
- [ ] Test form inputs in Create Quest

### Phase 4: Testing (2-3 hours)
- [ ] Test on iPhone 12/13/SE (375px-390px)
- [ ] Test on iPad Mini (768px)
- [ ] Test portrait and landscape
- [ ] Test touch interactions

---

## Appendix: Tailwind Breakpoint Reference

| Breakpoint | Min Width | Usage Pattern |
|------------|-----------|---------------|
| `max-sm:` | N/A | `< 640px` - Mobile phones (375-640px) ← TARGET |
| `sm:` | 640px | Tablets in portrait (640px+) |
| `md:` | 768px | Tablets in landscape (768px+) |
| `lg:` | 1024px | Desktop (1024px+) |
| `xl:` | 1280px | Large desktop (1280px+) |

**Mobile-first strategy:** Use `max-sm:` to override styles for narrow screens, keep default (larger breakpoint) styles for desktop.

---

**Report generated:** 2026-03-12 at 08:39 UTC
**Auditor:** Scout Agent (Read-only exploration)
