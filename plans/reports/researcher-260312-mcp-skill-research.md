# Research Report: MCP Skill Architecture for ClawHub

**Date:** March 12, 2026
**Scope:** MCP server framework selection, authentication patterns, tool design, deployment options, and reference implementations

---

## Executive Summary

ClawQuest can adopt the **official @modelcontextprotocol/sdk TypeScript package** (v1 stable, v2 pre-alpha) as the framework. For authentication, **OAuth 2.1 is the production standard** with API keys as a simpler fallback. **Cloudflare Workers provides serverless deployment** with zero cold starts; standalone Node.js offers lower complexity. Tool design follows **flat JSON Schema with snake_case naming**. Microsoft, GitHub, and community projects (Anthropic, Stainless) provide reference architectures.

**Recommendation:** Use official TypeScript SDK + OAuth 2.1 + Cloudflare Workers for initial launch, with fallback to API keys for simplified onboarding.

---

## 1. Best MCP Server Framework for TypeScript

### Official SDK (Recommended)

| Aspect | Official SDK | Custom Framework |
|--------|--------------|------------------|
| **Status** | v1 stable (production), v2 pre-alpha Q1 2026 | Requires maintenance |
| **Docs** | Comprehensive (ts.sdk.modelcontextprotocol.io) | Varies |
| **Maintenance** | Official team | Your team |
| **Ecosystem** | Stable, widely used | Limited |
| **Learning Curve** | Moderate (good docs) | Higher |

### @modelcontextprotocol/sdk Details

**Current Version:** v1.x (stable production)
- **Transport Options:** stdio, HTTP (Streamable), SSE
- **Auth Helpers:** Built-in OAuth utilities
- **Middleware:** Optional packages for Express, Hono, Node.js HTTP

**V2 (Preview):** In development, stable release Q1 2026
- Improved developer experience
- Enhanced protocol features

**Package:** `@modelcontextprotocol/sdk` on npm

### Why Official SDK Over Custom

1. **Protocol Compliance:** Automatically handles MCP v1 spec compliance
2. **Tool Definitions:** Built-in typing for tool schemas (tools, resources, prompts)
3. **Transport Abstraction:** Switch between stdio/HTTP/SSE without code changes
4. **Auth Helpers:** OAuth 2.1 middleware available out-of-box
5. **Community Support:** Issues on GitHub, active discussions

**Verdict:** Adopt official SDK. Custom frameworks add maintenance burden without benefit for a new skill.

---

## 2. Authentication Pattern for Agent-to-API Communication

### Two Approaches

| Approach | Best For | Setup Time | Security | Scalability |
|----------|----------|-----------|----------|-------------|
| **OAuth 2.1** | Production, multiple agents | Medium | Excellent | Excellent |
| **API Keys** | Dev, single agent, MVP | Low | Moderate | Limited |

### OAuth 2.1 (Production-Recommended)

**Architecture:**
- **Agent** (Cursor/Claude Code) = OAuth client
- **ClawQuest MCP Server** = OAuth 2.1 resource server (validates tokens)
- **Authorization Server** = Issues tokens (can be separate or embedded)

**Flow:**
1. Agent requests tool → MCP server redirects to auth endpoint
2. User logs in → Authorization server issues JWT/Bearer token
3. Agent stores token → Subsequent requests include `Authorization: Bearer <token>`
4. MCP server validates token → Grants access to API calls

**Key Requirements:**
- **PKCE required** (Proof Key for Code Exchange) for all OAuth 2.1 clients
- **Token expiration:** 1–24 hours (short-lived)
- **Scopes:** Define per-tool permissions (e.g., `quests:read`, `quests:accept`)
- **Token refresh:** Optional refresh tokens for longer sessions

**Implementation in SDK:**
```ts
// OAuth helper available in @modelcontextprotocol/sdk
import { OAuth2Client } from "@modelcontextprotocol/sdk/server/auth"

const oauth = new OAuth2Client({
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  authorizationUrl: "https://auth.clawquest.ai/authorize",
  tokenUrl: "https://auth.clawquest.ai/token",
})
```

### API Keys (Simpler Alternative)

**Use Case:** MVP launch, single agent testing, internal use

**Approach:**
1. Agent provides `CLAWQUEST_API_KEY` in environment
2. MCP server validates key format + permissions in local store or Redis
3. Each API request includes header: `X-API-Key: <key>`

**Limitations:**
- No expiration by default (manual rotation required)
- Coarse-grained permissions (all-or-nothing access)
- Compromise = need manual key revocation

**Hybrid Approach (Recommended for MVP):**
- Launch with API keys for v0.1
- Migrate to OAuth 2.1 for v0.2 (spring 2026)
- Support both during transition

---

## 3. Tool Design Patterns for Quest Participation

### Core Design Principles

**Tool Naming:** snake_case, action-oriented
```
register_agent
list_quests
accept_quest
get_status
submit_proof
```

**Input Schema:** JSON Schema, flat structure (avoid nesting)
```ts
// ✅ Good: flat schema
{
  type: "object",
  properties: {
    questId: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
  },
  required: ["questId"],
}

// ❌ Bad: deeply nested (increases token cost, parsing errors)
{
  type: "object",
  properties: {
    quest: {
      id: { type: "string" },
      metadata: { ... }
    }
  }
}
```

### Tool-by-Tool Design

| Tool | Input Schema | Output |
|------|--------------|--------|
| `register_agent` | `{ ownerEmail, activationCode }` | `{ agentId, apiKey, expiresAt }` |
| `list_quests` | `{ type?: enum, status?: enum, limit?: int }` | Array of quest objects with ID, title, slots |
| `accept_quest` | `{ questId: uuid }` | `{ participationId, startedAt, deadline }` |
| `get_status` | `{}` | `{ agentId, currentQuests[], rewardBalance }` |
| `submit_proof` | `{ questId, taskType, proofData: object }` | `{ status: "pending_review" \| "accepted" \| "rejected" }` |

### Schema Documentation Best Practices

```ts
tool({
  name: "accept_quest",
  description: "Accept a quest. You become a participant and can start completing tasks.",
  inputSchema: {
    type: "object",
    properties: {
      questId: {
        type: "string",
        description: "UUID of quest from list_quests (e.g., from available quests listing)"
      }
    },
    required: ["questId"]
  },
  handler: async (args) => { ... }
})
```

### Input Validation Pattern

```ts
// Always validate before calling API
handler: async ({ questId }) => {
  // 1. Schema validation (SDK handles JSON Schema)
  if (!questId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
    return { content: [{ type: "text", text: "❌ Invalid quest ID format" }] }
  }

  // 2. Auth check
  const config = await getConfig()
  if (!config.agentId || !config.apiKey) {
    return { content: [{ type: "text", text: "❌ Not registered. Call register_agent first" }] }
  }

  // 3. API call
  const res = await apiClient.post(`/quests/${questId}/accept`, { agentId: config.agentId })
  return { content: [{ type: "text", text: `✅ Accepted! Participation: ${res.participationId}` }] }
}
```

---

## 4. Deployment Options: Cloudflare Workers vs. Standalone

### Cloudflare Workers (Recommended for Scalability)

**Pros:**
- ✅ **Zero cold starts** (V8 isolate ~100x faster than Node container)
- ✅ **Global edge deployment** (sub-10ms latency worldwide)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **Free tier** (1M req/month for prototyping)
- ✅ **Built-in DDoS protection**

**Cons:**
- ❌ No persistent local state (use external store: Durable Objects, KV, D1)
- ❌ Limited to HTTP transport (no stdio for desktop agents)
- ❌ Subset of Node.js APIs (use `nodejs_compat` flag)

**Setup:**
```bash
npm install wrangler @modelcontextprotocol/sdk
wrangler init
```

**MCP HTTP Server on Workers:**
```ts
// wrangler.toml
[env.production]
routes = [{ pattern = "https://mcp.clawquest.ai/*", zone_name = "clawquest.ai" }]

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

const app = new McpServer({ name: "clawquest", version: "0.1.0" })
// Register tools...

export default {
  fetch(request: Request) {
    return app.handleRequest(request)
  }
}
```

**Cost (Example):** $0–$5/mo for 10M requests/month

### Standalone Node.js (Recommended for Simplicity)

**Pros:**
- ✅ **Full Node.js API access** (any library works)
- ✅ **stdio transport** (perfect for local dev)
- ✅ **Simpler debugging** (Node inspector, console)
- ✅ **Persistent state** (in-memory or local file)
- ✅ **Easier initial setup** (just `npm start`)

**Cons:**
- ❌ Cold starts (~1–2 seconds from container)
- ❌ Manual scaling (need load balancer, multiple instances)
- ❌ Regional deployment (higher latency)
- ❌ Server management overhead

**Setup:**
```bash
npm install fastify @modelcontextprotocol/sdk

# package.json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

**Deployment Options:**
- **Docker + ECS/GKE:** ~$20–50/mo
- **Heroku:** ~$15/mo dyno
- **Railway/Render:** ~$7/mo

### Hybrid Approach (Recommended)

For ClawQuest v0.1–v0.2:
1. **Dev/MVP:** Standalone Node.js locally (fast iteration)
2. **Beta/Launch:** Cloudflare Workers for public endpoint
3. **Long-term:** Workers as primary, Node.js as fallback

---

## 5. Reference Implementations & Skill Providers

### Official Microsoft Skill Architecture

**Location:** github/awesome-copilot/Skills Architecture
**Pattern:** Skill = folder with SKILL.md + bundled scripts/docs

**MCP Builder Reference:** [github.com/anthropics/skills/mcp-builder](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md)
- Provides template for high-quality MCP servers
- Covers Python (FastMCP) and Node/TypeScript (MCP SDK)
- Example tools for file, web, and API interactions

### GitHub's Official MCP Server

**Location:** [github.com/github/github-mcp-server](https://github.com/github/github-mcp-server)
**Stack:** TypeScript + MCP SDK + OAuth

**Relevant Patterns:**
- OAuth for GitHub API authentication
- Tool definitions for search, issue creation, PR review
- HTTP transport (no stdio)

### Community Examples

| Project | Language | Notable |
|---------|----------|---------|
| [Anthropic claude-skills](https://github.com/alirezarezvani/claude-skills) | TS/Python | 180+ production skills, reference patterns |
| [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Various | Curated list of 100+ MCP servers |
| [GitMCP](https://gitmcp.io/) | TypeScript | Git integration example |
| [Stainless MCP Portal](https://www.stainless.com/mcp/) | TypeScript | API-first MCP servers, auth patterns |

### Skill Structure to Adopt

```
packages/clawquest-skill/
├── SKILL.md                  ← User-facing instructions + workflows
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← MCP server entry
│   ├── manifest.ts           ← Skill metadata for ClawHub
│   ├── client.ts             ← API client wrapper
│   └── tools/
│       ├── register.ts
│       ├── list_quests.ts
│       ├── accept_quest.ts
│       ├── get_status.ts
│       └── submit_proof.ts
├── docs/
│   ├── ARCHITECTURE.md       ← This structure
│   └── API.md                ← Tool reference
└── README.md
```

### Manifest for ClawHub Registry

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
  "tools": ["register_agent", "list_quests", "accept_quest", "get_status", "submit_proof"],
  "categories": ["productivity", "agent", "quests"],
  "authentication": {
    "type": "oauth2.1",
    "scopes": ["quests:read", "quests:accept", "quests:submit"]
  }
}
```

---

## Implementation Roadmap

### Phase 1: MVP (v0.1, Week 1–2)
- **Framework:** Official TypeScript SDK + Fastify
- **Auth:** API keys (env var `CLAWQUEST_API_KEY`)
- **Deployment:** Standalone Node.js on Railway
- **Tools:** `register_agent`, `list_quests`, `accept_quest`
- **Endpoint:** `http://localhost:3001/mcp` (dev)

### Phase 2: Launch (v0.2, Week 3–4)
- **Auth:** Migrate to OAuth 2.1
- **Deployment:** Cloudflare Workers
- **Endpoint:** `https://mcp.clawquest.ai/mcp`
- **Tools:** Add `get_status`, `submit_proof`

### Phase 3: Scale (v0.3, Month 2)
- **SDK:** Upgrade to v2 (when stable)
- **Features:** Rate limiting, webhooks, tool discovery
- **Monitoring:** Observe auth patterns, token expiration

---

## Technical Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.1.0",
  "fastify": "^4.24.0",
  "zod": "^3.22.0",
  "dotenv": "^16.3.0",
  "node-fetch": "^3.3.0"
}
```

---

## Security Checklist

- [ ] API keys never logged or exposed in error messages
- [ ] OAuth token validation before every API call
- [ ] Input schema validation + sanitization (especially proof URLs)
- [ ] CORS headers configured (restrict to known agents)
- [ ] Rate limiting per agent/IP
- [ ] Secrets stored in environment variables (not git)
- [ ] HTTPS enforced for HTTP transport

---

## Next Steps

1. **Prototype:** Build Phase 1 MVP with API keys + Fastify
2. **Auth Implementation:** Design OAuth 2.1 flow (owner, agent, token endpoint)
3. **Integration:** Test with Cursor / Claude Code locally
4. **Deployment:** Prepare Cloudflare Workers setup for v0.2
5. **Documentation:** Write user-facing SKILL.md (how to register, use tools)

---

## Sources & References

### Official Documentation
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript SDK Official Docs](https://ts.sdk.modelcontextprotocol.io/)
- [TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

### Authentication
- [MCP Server API Key Management Best Practices - Stainless](https://www.stainless.com/mcp/mcp-server-api-key-management-best-practices)
- [MCP Authentication & Authorization - Auth0](https://auth0.com/blog/an-introduction-to-mcp-and-authorization/)
- [MCP OAuth 2.1 Guide - ScaleKit](https://www.scalekit.com/blog/migrating-from-api-keys-to-oauth-mcp-servers)
- [MCP Auth Guide - WorkOS](https://workos.com/blog/mcp-auth-developer-guide)

### Deployment
- [Cloudflare Workers Node.js Compatibility](https://blog.cloudflare.com/bringing-node-js-http-servers-to-cloudflare-workers/)
- [Deploy MCP to Cloudflare Workers - Natoma](https://natoma.ai/blog/how-to-deploy-mcp-server-to-cloudflare-workers/)
- [Cloudflare Workers MCP Servers](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)

### Tool Design & Architecture
- [MCP Tool Schema Best Practices - Merge Dev](https://www.merge.dev/blog/mcp-tool-schema)
- [MCP Tools Guide - Obot AI](https://obot.ai/resources/learning-center/mcp-tools/)
- [MCP Architecture Deep Dive - GetKnit](https://www.getknit.dev/blog/mcp-architecture-deep-dive-tools-resources-and-prompts-explained)

### Reference Implementations
- [Microsoft Skills Architecture](https://github.com/microsoft/skills)
- [Anthropic MCP Builder Reference](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [Claude Skills Repository](https://github.com/alirezarezvani/claude-skills)

---

## Unresolved Questions

1. **Token Storage:** How does the agent persist OAuth tokens between sessions? (Cursor config, local file, session cache?)
2. **Authorization Server:** Build custom auth service or use third-party (Auth0, WorkOS, Supabase Auth)?
3. **Rate Limiting:** Should be per-agent or per-user? What limits? (default: 100 req/min suggested)
4. **Error Handling:** What happens if token expires mid-tool-call? (retry with refresh token, prompt re-auth?)
