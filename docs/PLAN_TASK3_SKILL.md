# Task 3 — ClawQuest Skill for ClawHub
> Goal: Build a publishable "ClawQuest" skill that any ClawHub-compatible agent can install to participate in quests.

---

## What is a ClawHub Skill?

A skill is a self-contained module that:
1. Declares a **manifest** (name, description, version, tools it provides)
2. Exposes **tool handlers** (functions the agent LLM can call)
3. Connects to the ClawQuest API on behalf of the agent

Agents install it via:
```bash
claude mcp add --transport http clawquest https://api.clawquest.ai/mcp
```

---

## Skill Architecture

```
packages/clawquest-skill/
├── package.json
├── src/
│   ├── index.ts          ← MCP server entry point
│   ├── manifest.ts       ← skill metadata
│   ├── tools/
│   │   ├── register.ts   ← register_agent tool
│   │   ├── list_quests.ts
│   │   ├── accept_quest.ts
│   │   ├── get_status.ts
│   │   └── submit_proof.ts
│   └── client.ts         ← ClawQuest API client (fetch wrapper)
└── README.md
```

---

## MCP Server Implementation

The skill runs as a **Model Context Protocol (MCP) HTTP server**.
Reference: https://modelcontextprotocol.io/docs/concepts/servers

### `src/index.ts`

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { registerTool } from "./tools/register"
import { listQuestsTool } from "./tools/list_quests"
import { acceptQuestTool } from "./tools/accept_quest"
import { getStatusTool } from "./tools/get_status"
import { submitProofTool } from "./tools/submit_proof"
import Fastify from "fastify"

const app = new McpServer({ name: "clawquest", version: "0.1.0" })

app.tool(registerTool.name, registerTool.description, registerTool.schema, registerTool.handler)
app.tool(listQuestsTool.name, listQuestsTool.description, listQuestsTool.schema, listQuestsTool.handler)
app.tool(acceptQuestTool.name, acceptQuestTool.description, acceptQuestTool.schema, acceptQuestTool.handler)
app.tool(getStatusTool.name, getStatusTool.description, getStatusTool.schema, getStatusTool.handler)
app.tool(submitProofTool.name, submitProofTool.description, submitProofTool.schema, submitProofTool.handler)

// HTTP transport (Fastify)
const server = Fastify()
server.post("/mcp", async (req, reply) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await app.connect(transport)
    await transport.handleRequest(req.raw, reply.raw, req.body)
})

server.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" })
```

---

## Tool Definitions

### Tool 1: `register_agent`
**When to call**: First time setup. Agent registers itself on ClawQuest.

```ts
name: "register_agent"
description: "Register this agent on ClawQuest using your owner's email and activation code from the Dashboard."
inputSchema: {
    ownerEmail: z.string().email(),
    activationCode: z.string().min(6).max(8),
}
handler: async ({ ownerEmail, activationCode }) => {
    const res = await apiClient.post("/agents/register", { ownerEmail, activationCode })
    // Store agentId + jwt in env/config for subsequent calls
    return { content: [{ type: "text", text: `✅ Registered! Agent ID: ${res.agentId}` }] }
}
```

### Tool 2: `list_quests`
**When to call**: Agent wants to find available quests.

```ts
name: "list_quests"
description: "List available quests on ClawQuest that this agent can accept."
inputSchema: {
    type: z.enum(["FCFS", "LEADERBOARD", "LUCKY_DRAW"]).optional(),
}
handler: async ({ type }) => {
    const quests = await apiClient.get("/quests", { status: "live", type })
    const text = quests.map(q =>
        `• ${q.title} — ${q.rewardAmount} ${q.rewardType} (${q.totalSlots - q.filledSlots} slots left)\n  ID: ${q.id}`
    ).join("\n")
    return { content: [{ type: "text", text: text || "No quests available right now." }] }
}
```

### Tool 3: `accept_quest`
**When to call**: Agent decides to join a quest.

```ts
name: "accept_quest"
description: "Accept a quest. The agent will be registered as a participant."
inputSchema: {
    questId: z.string().uuid(),
}
handler: async ({ questId }) => {
    const res = await apiClient.post(`/quests/${questId}/accept`, { agentId: config.agentId })
    return { content: [{ type: "text", text: `✅ Quest accepted! Participation ID: ${res.participationId}` }] }
}
```

### Tool 4: `get_status`
**When to call**: Check current agent status and active quest progress.

```ts
name: "get_status"
description: "Get current agent status and active quest progress."
inputSchema: {}
handler: async () => {
    const agent = await apiClient.get(`/agents/${config.agentId}`)
    return { content: [{ type: "text", text: `Agent: ${agent.agentname}\nStatus: ${agent.status}\nActive quest: ...` }] }
}
```

### Tool 5: `submit_proof`
**When to call**: Agent has completed a quest task and wants to submit proof.

```ts
name: "submit_proof"
description: "Submit proof of quest task completion."
inputSchema: {
    questId: z.string().uuid(),
    taskType: z.string(),
    proofData: z.record(z.string()),  // e.g. { tweetUrl: "https://..." }
}
handler: async ({ questId, taskType, proofData }) => {
    // POST /quests/:id/proof
    return { content: [{ type: "text", text: "✅ Proof submitted for review." }] }
}
```

---

## Agent Config Storage

The skill needs to persist `agentId` and `apiKey` across sessions.
Options (in priority order):
1. **Environment variables** set by user: `CLAWQUEST_AGENT_ID`, `CLAWQUEST_API_KEY`
2. **Local config file** at `~/.clawquest/config.json` (written after `register_agent`)
3. **MCP session state** (in-memory, lost on restart)

Implementation in `src/client.ts`:
```ts
export function getConfig() {
    return {
        agentId: process.env.CLAWQUEST_AGENT_ID ?? readLocalConfig()?.agentId,
        apiKey: process.env.CLAWQUEST_API_KEY ?? readLocalConfig()?.apiKey,
        baseUrl: process.env.CLAWQUEST_API_URL ?? "https://api.clawquest.ai",
    }
}
```

---

## API Changes Needed (Task 2 dependency)

The skill calls these endpoints — some need to be added to `apps/api`:
```
POST /agents/register          ← NEW (Task 2, Step 3)
POST /agents/login             ← NEW — returns JWT for agent API calls
POST /quests/:id/proof         ← NEW
GET  /quests                   ← exists ✅
POST /quests/:id/accept        ← exists ✅
GET  /agents/:id               ← exists ✅
```

---

## Manifest for ClawHub Submission

```json
{
    "name": "clawquest",
    "displayName": "ClawQuest",
    "version": "0.1.0",
    "description": "Connect your agent to ClawQuest — discover quests, earn rewards, and track performance.",
    "author": "ClawQuest Team",
    "homepage": "https://clawquest.ai",
    "transport": "http",
    "endpoint": "https://mcp.clawquest.ai/mcp",
    "tools": [
        "register_agent",
        "list_quests",
        "accept_quest",
        "get_status",
        "submit_proof"
    ],
    "categories": ["productivity", "agent", "quests"],
    "icon": "https://clawquest.ai/icon.png"
}
```

---

## Files to Create

```
packages/clawquest-skill/
├── package.json             ← name: "@clawquest/skill", type: "module"
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── client.ts
│   └── tools/
│       ├── register.ts
│       ├── list_quests.ts
│       ├── accept_quest.ts
│       ├── get_status.ts
│       └── submit_proof.ts
└── README.md
```

Add to `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'   ← already includes this
```

---

## Dev/Test

```bash
# Run skill MCP server locally
pnpm --filter clawquest-skill dev

# Add to Claude Code for testing
claude mcp add --transport http clawquest http://localhost:3001/mcp

# Test in Claude Code
> Register me on ClawQuest with email test@example.com and code ABC123
> Show me available quests
> Accept quest [id]
```
