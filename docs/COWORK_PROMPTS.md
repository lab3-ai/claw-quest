# ClawQuest — Cowork Session Prompts
> Copy-paste these into Cowork to start each parallel task. Each prompt is self-contained.

---

## 🔧 Shared Context Block (paste into EVERY new Cowork session first)

```
I'm working on ClawQuest — a platform where humans own AI agents that complete quests for rewards.

Monorepo at /Users/hd/clawquest with:
- apps/dashboard  → React + TanStack Router + TanStack Query + plain CSS (no Tailwind)
- apps/api        → Fastify + Prisma + PostgreSQL + grammY (Telegram bot)
- packages/shared → Zod schemas + TypeScript types

Read /Users/hd/clawquest/docs/PROJECT_STATUS.md for full current state before doing anything.

Key conventions:
- Auth: useAuth() → { session, user } — use session?.access_token as Bearer token
- API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
- CSS: use design system vars (--fg, --border, --link, --accent) — no inline hex colors for layout
- No Tailwind. Page CSS in src/styles/pages/[name].css, imported at top of component
- PlatformIcon component at src/components/PlatformIcon.tsx for brand SVG icons
- pnpm only (never npm or yarn)
```

---

## 📋 Task 1 Prompt — Frontend UI/UX

```
Read /Users/hd/clawquest/docs/PROJECT_STATUS.md and /Users/hd/clawquest/docs/PLAN_TASK1_FRONTEND.md first.

Task: Build the Agent Detail page for ClawQuest dashboard.

Route: /agents/:agentId
File to create: apps/dashboard/src/routes/_authenticated/agents/[agentId].tsx
CSS file: apps/dashboard/src/styles/pages/agent-detail.css

Requirements:
1. 2-column layout: main content (left) + stats sidebar (280px right)
2. Header: agent name + status badge (idle=gray, questing=green, offline=red)
3. Platform icon using PlatformIcon component
4. Active Quest card showing: quest title, progress bar (tasksCompleted/tasksTotal), time left
5. Activity Log section: list of AgentLog entries (type, message, createdAt) — newest first
6. Sidebar: total quests done, total earned, registration date

API calls needed:
- GET /agents/:id → agent detail (already exists in agents.routes.ts)
- GET /agents/:id/logs → needs to be added to agents.routes.ts (returns AgentLog[])

Also add the /agents/:id/logs endpoint to apps/api/src/modules/agents/agents.routes.ts:
- Auth required, must own the agent
- Return AgentLog[] ordered by createdAt DESC, limit 50

Design ref: /Users/hd/clawquest/design-backup/dashboard.html (agent section)
```

---

## 📋 Task 1b Prompt — Toast Notifications

```
Read /Users/hd/clawquest/docs/PROJECT_STATUS.md first.

Task: Add global Toast notification system to ClawQuest dashboard.

Files to create:
- apps/dashboard/src/context/ToastContext.tsx
- apps/dashboard/src/components/Toast.tsx
- apps/dashboard/src/styles/toast.css

Requirements:
1. ToastContext with useToast() hook exposing: toast.success(msg), toast.error(msg), toast.info(msg)
2. Toast type: { id: string, type: "success"|"error"|"info", message: string }
3. Toasts auto-dismiss after 3000ms
4. Visual: fixed bottom-right, stacked vertically, slide-in animation
5. Colors: success=#16a34a, error=#dc2626, info=var(--link)
6. X close button on each toast

Integration:
- Add <ToastProvider> wrapper in apps/dashboard/src/main.tsx around <RouterProvider>
- Import toast.css in main.tsx
- Replace the hardcoded alert() calls in create.tsx and dashboard.tsx with toast calls
```

---

## 📋 Task 2 Prompt — Telegram Bot Registration

```
Read /Users/hd/clawquest/docs/PROJECT_STATUS.md and /Users/hd/clawquest/docs/PLAN_TASK2_TELEGRAM.md first.

Task: Implement conversational /register flow in the ClawQuest Telegram bot.

File to modify: apps/api/src/modules/telegram/telegram.service.ts
File to modify: apps/api/src/app.ts (fix bot startup)
File to modify: apps/api/src/modules/agents/agents.routes.ts (add /register endpoint)

Step 1 — Fix bot startup in app.ts:
After `await server.listen(...)`, add:
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const telegramService = new TelegramService(server, process.env.TELEGRAM_BOT_TOKEN)
    await telegramService.startPolling()
  }

Step 2 — Add /register conversational flow to telegram.service.ts:
- Use an in-memory Map<number, SessionState> for conversation state
- SessionState = { step: 'email' | 'code', email?: string }
- /register → ask for email
- On email received → ask for activation code
- On code received → find User by email, find Agent by code+ownerId, create TelegramLink, clear activationCode, reply success with agentId

Step 3 — Add POST /agents/register to agents.routes.ts (for MCP/API agents):
Body: { ownerEmail: string, activationCode: string }
Response: { agentId: string, message: string }
No auth required — activation code IS the auth token
Logic: same as Telegram flow but returns JSON

Step 4 — Add /quests command:
- List 5 live quests: title, reward, slots remaining
- Format nicely for Telegram (use Markdown)
- User can reply /accept <number or questId>

Step 5 — Add /accept command:
- Requires linked TelegramLink
- Creates QuestParticipation for the linked agent
- Increments quest.filledSlots

Error handling required for all steps.
```

---

## 📋 Task 3 Prompt — ClawQuest Skill

```
Read /Users/hd/clawquest/docs/PROJECT_STATUS.md and /Users/hd/clawquest/docs/PLAN_TASK3_SKILL.md first.

Task: Build the ClawQuest MCP skill package.

Create new package at: packages/clawquest-skill/

Stack: TypeScript, @modelcontextprotocol/sdk, Fastify, Zod

Files to create:
1. packages/clawquest-skill/package.json
   - name: "@clawquest/skill"
   - type: "module"
   - dependencies: @modelcontextprotocol/sdk, fastify, zod, dotenv

2. packages/clawquest-skill/src/client.ts
   - ClawQuest API client using fetch
   - Reads config from env: CLAWQUEST_AGENT_ID, CLAWQUEST_API_KEY, CLAWQUEST_API_URL
   - Falls back to ~/.clawquest/config.json for persisted config after registration
   - Base URL default: https://api.clawquest.ai

3. packages/clawquest-skill/src/tools/register.ts
   - Tool name: "register_agent"
   - Inputs: ownerEmail (string), activationCode (string)
   - Calls POST /agents/register on ClawQuest API
   - On success: writes agentId to ~/.clawquest/config.json
   - Returns success message with agentId

4. packages/clawquest-skill/src/tools/list_quests.ts
   - Tool name: "list_quests"
   - Optional input: type (FCFS|LEADERBOARD|LUCKY_DRAW)
   - Calls GET /quests?status=live
   - Returns formatted text list

5. packages/clawquest-skill/src/tools/accept_quest.ts
   - Tool name: "accept_quest"
   - Input: questId (uuid string)
   - Calls POST /quests/:id/accept with agentId from config
   - Returns participationId

6. packages/clawquest-skill/src/tools/get_status.ts
   - Tool name: "get_status"
   - No inputs
   - Calls GET /agents/:id
   - Returns agent status + active quest info

7. packages/clawquest-skill/src/index.ts
   - MCP server using StreamableHTTPServerTransport
   - Registers all 4 tools
   - Listens on PORT env var (default 3001)
   - Route: POST /mcp

8. packages/clawquest-skill/README.md
   - Install instructions: claude mcp add --transport http clawquest http://localhost:3001/mcp
   - Environment variables
   - Available tools + example prompts

Note: POST /agents/register endpoint on the API side is being built in Task 2.
For now, stub the API client call with the endpoint shape from PLAN_TASK3_SKILL.md.
```

---

## 🔄 After Each Task — Update Docs Prompt

```
Task complete. Please update /Users/hd/clawquest/docs/PROJECT_STATUS.md to reflect:
1. Mark completed items in the "Remaining Work" section as done [x]
2. Add any new files created to the Key File Map section
3. Add any new API endpoints to the API Endpoints section
4. Note any DB schema changes in the Database Schema section
Keep the doc concise — just update what changed, don't rewrite everything.
```
