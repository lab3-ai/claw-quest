# Phase 1: DB Migration

## Overview
- **Priority:** High
- **Effort:** Small
- **Status:** Completed
- **Depends on:** —

Add `telegramId` and `telegramUsername` to User model for Telegram identity storage.

## Related Files
- Modify: `apps/api/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

## Implementation Steps

### 1. Update Prisma schema

Add to `User` model in `schema.prisma`:
```prisma
model User {
  // ... existing fields
  telegramId       BigInt?   @unique
  telegramUsername  String?
}
```

### 2. Run migration

```bash
cd apps/api
pnpm prisma migrate dev --name add-user-telegram-fields
```

### 3. Update /auth/me response

In `auth.routes.ts`, add `telegramId` and `telegramUsername` to the response object.

Also update the `UserProfile` interface in `account.tsx` frontend to include these fields.

## Todo
- [x] Add `telegramId BigInt? @unique` to User model
- [x] Add `telegramUsername String?` to User model
- [x] Run migration
- [x] Update `/auth/me` to return new fields

## Success Criteria
- Migration applies clean
- `telegramId` column exists with unique constraint
- `/auth/me` returns `telegramId` and `telegramUsername`
