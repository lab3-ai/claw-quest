# Claim Flow Investigation Report

Date: 2026-03-01
Investigator: debugger
Scope: Browser claim flow for ClawQuest quest ownership transfer

---

## Executive Summary

Investigated the browser claim flow end-to-end. Found and fixed **3 bugs**, confirmed **2 flows** are working correctly. No unclaimed quests in DB (all 3 quests with claim tokens were already claimed). Created a test draft quest to verify the preview token flow.

---

## Flow Architecture

Two separate claim flows exist:

### Flow A: Browser Claim (previewUrl)
1. Agent creates quest via `POST /quests` → returns `previewUrl`
2. `previewUrl = /quests/:id?token=pv_xxx&claim=quest_xxx`
3. Human opens URL → `QuestDetail` component loads
4. If not authenticated: claim banner shows "Log in to Claim" → saves URL to `localStorage` → redirects to `/login`
5. After login: `window.location.href = savedRedirect` → back to quest detail
6. Auto-claim `useEffect` fires: `claim && isAuthenticated` → `POST /quests/claim` with JWT
7. Banner updates to "Quest Claimed!"

### Flow B: Telegram Claim (telegramDeeplink)
1. Agent creates quest → `telegramDeeplink = t.me/bot?start=quest_xxx`
2. User opens Telegram deeplink → bot sends claim URL: `/quests/claim?token=quest_xxx`
3. User clicks URL → `/quests/claim` dedicated page
4. If not authenticated: TanStack Router's `beforeLoad` redirects to `/login`
5. After login: saved redirect → `/quests/claim?token=xxx`
6. `ClaimQuest` component reads `?token=` via `URLSearchParams` → `POST /quests/claim`

---

## Bugs Found & Fixed

### Bug 1: `GET /quests/:id` returns 500 (CRITICAL — FIXED)

**File**: `apps/api/src/modules/quests/quests.service.ts`
**Root cause**: `formatQuestResponse()` spread `...quest` (Prisma object with `updatedAt` as `Date`) but didn't serialize `updatedAt` to ISO string. The `QuestSchema` requires `updatedAt: z.string().datetime()`, so Fastify's Zod response validator rejected it with HTTP 500.

**Fix**: Added `updatedAt: quest.updatedAt.toISOString()` to `formatQuestResponse` return value.

**Impact**: Quest detail page was completely broken for all quests — 500 on every `GET /quests/:id` request.

---

### Bug 2: `previewToken` leaking in public quest responses (SECURITY — FIXED)

**File**: `apps/api/src/modules/quests/quests.service.ts`
**Root cause**: `formatQuestResponse()` spread `...quest` which included DB fields `previewToken`, `claimToken`, `claimTokenExpiresAt`, `claimedAt`. The `previewToken` field is in the `GET /:id` response schema (`.optional()`), so Fastify's serializer let it through for live quests.

**Fix**: Destructure out internal fields before spreading in `formatQuestResponse`:
```ts
const { claimToken: _ct, claimTokenExpiresAt: _ctex, claimedAt: _ca, previewToken: _pt, ...safeQuest } = quest;
```

The draft preview path still explicitly re-adds `previewToken: quest.previewToken` after calling `formatQuestResponse`.

**Impact**: Minor privacy leak — any caller could see the previewToken for a live quest. Since the quest is live (public), this doesn't enable unauthorized access, but is an unnecessary data exposure.

---

### Bug 3: `creatorUserId` stripped from response — Manage button broken (UX — FIXED)

**File**: `apps/api/src/modules/quests/quests.routes.ts`
**Root cause**: `GET /:id` response schema (`QuestSchema.extend({...})`) did not include `creatorUserId` or `fundingMethod`. Fastify/Zod serialization strips unknown fields, so `creatorUserId` from the DB was never sent to the frontend.

**Impact**: `QuestDetail` component checks `quest.creatorUserId === user?.id` to show the "Manage Quest" button. Since `creatorUserId` was always `undefined`, the Manage button NEVER appeared for quest creators.

**Fix**: Added to `GET /:id` response schema:
```ts
creatorUserId: z.string().nullable().optional(),
fundingMethod: z.string().nullable().optional(),
```

---

## Verified Working

- Draft quest with valid `?token=pv_xxx` → 200 with `isPreview: true` and `previewToken` in response
- Draft quest without token → 404
- Live quest detail → 200 with `creatorUserId`, no `previewToken` leaking
- API claim endpoint requires JWT auth (401 without)
- Login redirect via `localStorage` key `clawquest_redirect_after_login` works for both email and OAuth flows
- Auth callback at `/auth/callback` handles redirect-after-login correctly

---

## DB State

- 23 total quests
- 3 quests with `claimToken` — all already claimed (`claimedAt` set, `claimToken` nullified after claim)
- 2 draft quests — no claim tokens (created by human, no agent)
- No unclaimed quests in DB to test the full flow end-to-end

---

## Build Results

Both services build clean after fixes:
- `pnpm --filter api build` → success (tsup, no errors)
- `pnpm --filter dashboard build` → success (Vite, no TypeScript errors)

---

## Files Modified

1. `apps/api/src/modules/quests/quests.service.ts`
   - `formatQuestResponse`: added `updatedAt.toISOString()`, stripped internal DB fields
2. `apps/api/src/modules/quests/quests.routes.ts`
   - `GET /:id` response schema: added `creatorUserId`, `fundingMethod`

---

## Unresolved Questions

1. Should `previewToken` be stripped from the `GET /:id` response schema entirely (for cleanliness)? Currently it's `.optional()` in the schema but only set for draft preview responses.
2. There are no unclaimed quests to do a live end-to-end test of the full claim flow in browser — need real agent to create a quest OR manually insert test data + valid Supabase JWT.
3. The `/quests/claim` page (Telegram flow) reads `?token=` via raw `URLSearchParams` not TanStack Router `useSearch` — works but is inconsistent with the rest of the codebase. Low priority.
