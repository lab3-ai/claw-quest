# Task 2 — Telegram Bot Agent Registration Flow
> Goal: A user's Telegram bot (their agent) can self-register on ClawQuest by chatting with the ClawQuest Telegram bot.

---

## Context

**Existing code**: `apps/api/src/modules/telegram/telegram.service.ts`
- grammY bot library
- Already has `/start <CODE>` → activates agent via Dashboard-generated code
- Registered in `app.ts` but **not yet started** (startPolling never called — needs fix)

**DB models relevant**:
- `User` — the human owner
- `Agent` — `{ id, ownerId, agentname, status, activationCode }`
- `TelegramLink` — `{ agentId, telegramId, username, firstName }`

**Environment vars needed**:
```
TELEGRAM_BOT_TOKEN=...
```

---

## Target UX Flow

The human user's agent bot (e.g., a Claude Code instance, OpenClaw agent) chats with `@ClawQuestBot`:

```
User's bot: /register

ClawQuestBot: 👋 Welcome! Let's register your agent on ClawQuest.
              What's your ClawQuest account email?

User's bot: user@example.com

ClawQuestBot: Got it. Now enter the activation code from your Dashboard
              (Dashboard → My Agents → + Register Agent → Copy Code):

User's bot: ABC123

ClawQuestBot: ✅ Agent "MyBot" registered successfully!
              Your agent ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              You can now accept quests. Try /quests to see available ones.
```

**Alternative flow** (for Claude Code MCP — no Telegram, uses API directly):
- `POST /agents/register-by-mcp` — see Section 3 below

---

## Implementation Plan

### Step 1 — Fix bot startup

In `app.ts`, after server starts:
```ts
if (process.env.TELEGRAM_BOT_TOKEN) {
    const telegramService = new TelegramService(server, process.env.TELEGRAM_BOT_TOKEN)
    telegramService.startPolling()
}
```

### Step 2 — Add `/register` conversational flow

State machine using grammY Conversations plugin (or simple in-memory session Map):

```ts
// Conversation state per telegramId
const registerSessions = new Map<number, { step: 'email' | 'code', email?: string }>()

bot.command('register', async (ctx) => {
    const tgId = ctx.from?.id
    if (!tgId) return
    registerSessions.set(tgId, { step: 'email' })
    await ctx.reply('👋 Let\'s register your agent!\n\nWhat\'s your ClawQuest account email?')
})

bot.on('message:text', async (ctx) => {
    const tgId = ctx.from?.id
    const session = registerSessions.get(tgId!)
    if (!session) return  // not in a flow

    if (session.step === 'email') {
        session.email = ctx.message.text.trim().toLowerCase()
        session.step = 'code'
        registerSessions.set(tgId!, session)
        await ctx.reply('Got it! Now enter your activation code from the Dashboard:')
        return
    }

    if (session.step === 'code') {
        const code = ctx.message.text.trim().toUpperCase()
        registerSessions.delete(tgId!)
        // validate email + code → link agent
        await handleAgentRegistration(ctx, session.email!, code, tgId!)
    }
})
```

**`handleAgentRegistration` logic**:
1. Find `User` by email
2. Find `Agent` by `activationCode === code` AND `ownerId === user.id`
3. Create `TelegramLink` { agentId, telegramId: BigInt(tgId), username, firstName }
4. Clear `agent.activationCode`
5. Reply with success + agentId

**Error cases**:
- Email not found → "No account found with that email"
- Code not found / doesn't match owner → "Invalid code or code doesn't belong to this account"
- Agent already linked → "This agent already has a Telegram link"

### Step 3 — MCP Registration Endpoint (for Claude Code agents)

New API route — no Telegram needed, called by Claude Code MCP tool:

```
POST /agents/register
Body: { ownerEmail: string, activationCode: string, agentName?: string }
Response: { agentId, claimUrl, verificationCode }
```

Logic:
1. Find User by email
2. Find Agent by activationCode + ownerId
3. If agentname provided and different → update agentname
4. Return `{ agentId: agent.id, message: "Agent registered" }`

**Note**: This endpoint doesn't need `TelegramLink` — it's for API-based agents.

### Step 4 — Quest commands

Add to `telegram.service.ts`:

```
/quests          → list 5 live quests (title, reward, slots)
/accept <id>     → accept quest (requires linked agent)
/status          → show agent status + active quest progress
/done            → (future) submit completion proof
```

**`/quests` format**:
```
📋 Available Quests:

1. Follow @ClawQuest on X — 50 USDC (10 slots left)
2. Discord Role Quest — 100 USDC (3 slots left)
3. ...

Reply /accept <number> to join a quest.
```

**`/accept` logic**:
1. Find `TelegramLink` by `telegramId`
2. Get linked Agent
3. Call `POST /quests/:id/accept` logic (reuse from API)
4. Reply "✅ Quest accepted! Use /status to track progress."

---

## Files to Create/Modify

```
apps/api/src/modules/telegram/
├── telegram.service.ts     MODIFY — add /register, /quests, /accept, /status
└── telegram.session.ts     CREATE — in-memory session Map type

apps/api/src/modules/agents/
└── agents.routes.ts        MODIFY — add POST /agents/register (MCP endpoint)

apps/api/src/app.ts         MODIFY — start bot in main()
```

---

## Testing

Manual test via Telegram:
1. Create test user via `POST /auth/register`
2. Create agent via `POST /agents` → get activationCode
3. Chat with bot: `/register` → enter email → enter code
4. Verify `TelegramLink` created in DB
5. Test `/quests` → see live quests
6. Test `/accept 1` → verify `QuestParticipation` created
