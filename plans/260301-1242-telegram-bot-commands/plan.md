---
title: "Telegram Bot Agent Commands"
description: "Add /register, /quests, /accept, /done commands to the ClawQuest Telegram bot"
status: pending
priority: P2
effort: 3h
branch: main
tags: [telegram, grammy, bot, agent, quests]
created: 2026-03-01
---

# Telegram Bot Agent Commands

## Overview

Add 5 missing bot commands so AI agents can self-register and interact with quests entirely via Telegram chat, without needing the Dashboard.

**Existing handlers**: `/start`, `/help`, `/about`, `/status`, `/verify`, fallback
**Adding**: `/register` (conversational flow), `/quests`, `/accept <n>`, `/done`
**Updating**: `/status` (extend with quest progress), `messages.ts` (new strings), `menus.ts` (new keyboards), `telegram.service.ts` (register new handlers + update bot menu)

---

## Phases

| Phase | Description | Files | Est |
|-------|-------------|-------|-----|
| 1 | Session store + `/register` flow | `telegram.session.ts`, `register.handler.ts`, `messages.ts`, `fallback.handler.ts`, `telegram.service.ts` | 1h |
| 2 | `/quests`, `/accept`, `/done` commands | `quests.handler.ts`, `accept.handler.ts`, `done.handler.ts`, `messages.ts`, `menus.ts`, `telegram.service.ts` | 1.5h |
| 3 | Update bot menu + `/status` enhancement | `telegram.service.ts`, `status.handler.ts` | 0.5h |

---

## Phase 1 — `/register` Conversational Flow

### Context
- Human's agent bot sends `/register` → multi-step chat: email → activation code → done
- Uses in-memory session Map (no plugin needed — KISS)
- Validates email → finds User → finds Agent by `activationCode` + `ownerId` → creates `TelegramLink`

### Files

**CREATE** `apps/api/src/modules/telegram/telegram.session.ts`
```ts
export type RegisterStep = 'email' | 'code';
export interface RegisterSession { step: RegisterStep; email?: string; }
export const registerSessions = new Map<number, RegisterSession>();
```

**CREATE** `apps/api/src/modules/telegram/handlers/register.handler.ts`
- `composer.command('register', ...)` → sets session step = `'email'`, replies with email prompt
- `composer.on('message:text', ...)` → reads `registerSessions.get(tgId)`:
  - step `'email'`: store email, advance to `'code'`, reply with code prompt
  - step `'code'`: look up User by email, then Agent by `{ activationCode: code, ownerId: user.id }`, create `TelegramLink`, clear `activationCode`, reply success
- Error cases: no user found, code mismatch, agent already linked → clear session, reply descriptive error

**MODIFY** `apps/api/src/modules/telegram/content/messages.ts`
Add keys: `registerStart`, `registerEmailPrompt`, `registerCodePrompt`, `registerSuccess`, `registerNoUser`, `registerBadCode`, `registerAlreadyLinked`, `registerCancelled`

**MODIFY** `apps/api/src/modules/telegram/handlers/fallback.handler.ts`
- Before FAQ matching: check `registerSessions.get(tgId)` → if active, delegate to register flow handler function (imported from register.handler)
- Also handle `/cancel` text or command to clear session

**MODIFY** `apps/api/src/modules/telegram/telegram.service.ts`
- Import and register `registerHandler(server)` before `fallbackHandler`

### Key Logic — `handleAgentRegistration`
```
1. Trim + lowercase email
2. prisma.user.findUnique({ where: { email } }) — NOT FOUND → error
3. prisma.agent.findFirst({ where: { activationCode: code, ownerId: user.id } })
   - NOT FOUND → "Invalid code or doesn't belong to that account"
4. prisma.telegramLink.findUnique({ where: { agentId: agent.id } })
   - EXISTS → "Agent already linked"
5. prisma.telegramLink.create(...)
6. prisma.agent.update({ activationCode: null })
7. Reply success with agent name + ID
```

---

## Phase 2 — `/quests`, `/accept <n>`, `/done`

### `/quests` Handler

**CREATE** `apps/api/src/modules/telegram/handlers/quests.handler.ts`

- Query: `prisma.quest.findMany({ where: { status: 'live' }, orderBy: { createdAt: 'desc' }, take: 5, select: { id, title, rewardAmount, rewardType, totalSlots, filledSlots } })`
- Format message (see existing `PLAN_TASK2_TELEGRAM.md` spec):
  ```
  Available Quests:

  1. Follow @ClawQuest on X — 50 USDC (10 slots left)
  2. Discord Role Quest — 100 USDC (3 slots left)

  Use /accept <number> to join a quest.
  ```
- Store quest list in a simple per-user cache Map `questListCache: Map<number, string[]>` (quest IDs indexed by position) — expires on next `/quests` call
- Also handle `callbackQuery('cmd:quests', ...)` for inline button

**ADD** to `messages.ts`: `noLiveQuests`, `questList` (formatter fn), `questListFooter`
**ADD** to `menus.ts`: `questsKeyboard()` — single "Browse All" URL button to dashboard

### `/accept <n>` Handler

**CREATE** `apps/api/src/modules/telegram/handlers/accept.handler.ts`

- Parse arg from `ctx.match` (e.g., `"2"` → index `1` → look up ID from `questListCache`)
- Also support full UUID: `/accept <uuid>`
- Auth check: find `TelegramLink` by `telegramId` → get linked `agentId`; if none → reply "Link an agent first with /register"
- Check quest still live + slots available
- `prisma.questParticipation.create(...)` + `filledSlots` increment + agent status `questing` + AgentLog
- Reply success with quest title + participation ID

**ADD** to `messages.ts`: `acceptNoAgent`, `acceptNoQuest`, `acceptAlreadyJoined`, `acceptQuestFull`, `acceptSuccess`, `acceptInvalidArg`

### `/done` Handler

**CREATE** `apps/api/src/modules/telegram/handlers/done.handler.ts`

- Find `TelegramLink` by telegramId → agentId
- Find active `QuestParticipation` with `status: 'in_progress'`
- Collect proof from message text (user pastes proof URL or text after `/done`)
  - Format: `/done https://x.com/my-tweet`
  - Or: `/done` with no arg → prompt for proof URL
- Proof payload: `[{ taskType: 'telegram_submission', proofUrl: arg, submittedAt: new Date() }]`
- `prisma.questParticipation.update({ status: 'submitted', proof: [...], tasksCompleted: tasksTotal })`
- AgentLog entry
- Reply "Proof submitted! Awaiting verification."

**ADD** to `messages.ts`: `doneNoAgent`, `doneNoActiveQuest`, `doneProofPrompt`, `doneSuccess`, `doneInvalidProof`

---

## Phase 3 — Bot Menu + Status Enhancement

### Update Bot Menu

**MODIFY** `apps/api/src/modules/telegram/telegram.service.ts`

Update `setMyCommands` to:
```ts
[
  { command: 'start', description: 'Welcome to ClawQuest' },
  { command: 'register', description: 'Register your agent' },
  { command: 'quests', description: 'Browse available quests' },
  { command: 'accept', description: 'Accept a quest: /accept <number>' },
  { command: 'done', description: 'Submit quest proof: /done <url>' },
  { command: 'status', description: 'Check your agent & quest status' },
  { command: 'verify', description: 'Verify agent or quest ownership' },
  { command: 'help', description: 'Show available commands' },
  { command: 'about', description: 'Learn about ClawQuest' },
]
```

Register new handlers in order (before fallback):
```ts
this.bot.use(registerHandler(this.server));
this.bot.use(questsHandler(this.server));
this.bot.use(acceptHandler(this.server));
this.bot.use(doneHandler(this.server));
```

### Enhance `/status`

**MODIFY** `apps/api/src/modules/telegram/handlers/status.handler.ts`

Extend `handleStatus`:
- Include active `QuestParticipation` details: quest title, `tasksCompleted/tasksTotal`, status
- Show proof submission status if `status === 'submitted'`
- Add "Use /done <url> to submit proof" hint when status is `in_progress`

### Update Help Text

**MODIFY** `apps/api/src/modules/telegram/content/messages.ts`

Update `help` string to include new commands.

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `apps/api/src/modules/telegram/telegram.session.ts` |
| CREATE | `apps/api/src/modules/telegram/handlers/register.handler.ts` |
| CREATE | `apps/api/src/modules/telegram/handlers/quests.handler.ts` |
| CREATE | `apps/api/src/modules/telegram/handlers/accept.handler.ts` |
| CREATE | `apps/api/src/modules/telegram/handlers/done.handler.ts` |
| MODIFY | `apps/api/src/modules/telegram/content/messages.ts` |
| MODIFY | `apps/api/src/modules/telegram/keyboards/menus.ts` |
| MODIFY | `apps/api/src/modules/telegram/handlers/status.handler.ts` |
| MODIFY | `apps/api/src/modules/telegram/handlers/fallback.handler.ts` |
| MODIFY | `apps/api/src/modules/telegram/telegram.service.ts` |

**No DB migrations needed.** No new env vars. No new packages needed.

---

## Key Design Decisions

- **Session store**: in-memory `Map<telegramId, RegisterSession>` — good enough for single-process dev/prod. No Redis needed (KISS). Sessions cleared on success or error.
- **Quest list cache**: `Map<telegramId, string[]>` of quest IDs — ephemeral, rebuilt on each `/quests`. Enables numeric shorthand `/accept 1`.
- **`/done` proof format**: flexible text/URL — stored as `[{ taskType: 'telegram_submission', proofUrl, submittedAt }]`. Matches existing `proof` JSON schema.
- **No grammY Conversations plugin**: simple state machine with Map is sufficient and avoids a new dependency.
- **Auth in bot**: no bot-level JWT. All bot commands identify user via `TelegramLink.telegramId = BigInt(ctx.from.id)`.

---

## Unresolved Questions

- `/accept` by number requires the user to have just run `/quests` — cache eviction strategy? (Current: no eviction; cleared on next `/quests`. Acceptable for MVP.)
- Should `/done` support multiple task proofs in one message? (Current plan: single URL. Multi-proof deferred.)
- Should `/cancel` be a registered command or just text match in fallback? (Current plan: text match in fallback to keep bot menu clean.)
