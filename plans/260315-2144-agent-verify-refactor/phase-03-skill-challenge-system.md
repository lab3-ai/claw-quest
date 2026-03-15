# Phase 3: Skill Challenge System

**Priority:** High — core new feature
**Status:** pending

## Context

When an agent needs to prove it has a skill installed, the flow is:

1. Agent calls `POST /challenges` (auth: `Bearer cq_*`) → `{ skillSlug, questId? }` → gets `{ token, verifyUrl }`
2. Agent GETs `GET /verify/:token` (no auth, returns `text/markdown`) → markdown with challenge + bash script
3. Agent runs the bash script locally — it fetches data using the skill, then POSTs result
4. `POST /verify/:token` (no auth needed, token is the secret) → `{ result, ts }` → `{ passed, message }`

The challenge token (`cq_ch_XXXXXXXXXXXXXXXX`) is a 16-char random hex string prefixed with `cq_ch_`.
Challenges expire in 30 minutes. Only one submission per token.

## Key Design Decision: Markdown with Embedded Bash Script

The GET response is `Content-Type: text/markdown`. It contains:
- A short human-readable description of the challenge
- A **copy-paste bash script** that does all the work — no interpretation required by the agent

This means any agent with shell access can complete verification without understanding ClawQuest internals.

## Files to Create/Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `SkillChallenge` model |
| `apps/api/src/modules/agents/agent-auth.helper.ts` | Extract shared `authenticateAgent()` helper |
| `apps/api/src/modules/agents/agents.routes.ts` | Import helper from new file |
| `apps/api/src/modules/challenges/challenge-generator.ts` | Generate bash script from `verification_config` |
| `apps/api/src/modules/challenges/challenges.service.ts` | DB logic (create, fetch, submit, verify) |
| `apps/api/src/modules/challenges/challenges.routes.ts` | Route registration |
| `apps/api/src/app.ts` | Register challenge routes |

---

## Chunk 0: Extract Shared Agent Auth Helper

### Task 3.0: Move authenticateAgent to a shared helper

**Rationale:** `agents.routes.ts` already has `authenticateAgent()`. `challenges.routes.ts` will need the same logic. Extract once, import in both.

**Files:**
- Create: `apps/api/src/modules/agents/agent-auth.helper.ts`
- Modify: `apps/api/src/modules/agents/agents.routes.ts`

- [ ] **Step 1: Create agent-auth.helper.ts**

```typescript
// agent-auth.helper.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function authenticateAgent(
    server: FastifyInstance & { prisma: any },
    request: FastifyRequest,
    reply: FastifyReply
): Promise<{ agentId: string; ownerId: string | null } | null> {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer cq_')) {
        reply.status(401).send({ error: 'Missing or invalid agent API key' });
        return null;
    }
    const apiKey = auth.slice(7);
    const agent = await server.prisma.agent.findUnique({
        where: { agentApiKey: apiKey },
        select: { id: true, ownerId: true, isActive: true },
    });
    if (!agent) {
        reply.status(401).send({ error: 'Invalid agent API key' });
        return null;
    }
    if (agent.ownerId && !agent.isActive) {
        reply.status(403).send({ error: 'This agent is not active. Ask your human owner to activate it on the Dashboard.' });
        return null;
    }
    return { agentId: agent.id, ownerId: agent.ownerId as string | null };
}
```

- [ ] **Step 2: Update agents.routes.ts to import from helper**

Replace the inline `authenticateAgent` function definition in `agents.routes.ts` with:
```typescript
import { authenticateAgent } from './agent-auth.helper';
```

- [ ] **Step 3: Compile check**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

---

## Chunk 1: Schema — SkillChallenge model

### Task 3.1: Add SkillChallenge model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add SkillChallenge model**

Add after the `clawhub_skills` model:

```prisma
model SkillChallenge {
  id           String    @id @default(uuid()) @db.Uuid
  token        String    @unique               // cq_ch_XXXXXXXXXXXXXXXX
  skillSlug    String
  questId      String?   @db.Uuid
  agentId      String?   @db.Uuid
  params       Json                            // resolved challenge params (variables substituted)
  expiresAt    DateTime  @db.Timestamptz(6)
  verifiedAt   DateTime? @db.Timestamptz(6)
  result       Json?                           // submitted result from agent
  passed       Boolean?
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)

  quest        Quest?    @relation(fields: [questId], references: [id])
  agent        Agent?    @relation(fields: [agentId], references: [id])

  @@index([token])
  @@index([agentId])
  @@index([skillSlug])
}
```

Note: also add the reverse relation on `Quest` and `Agent` models:
- In `Quest` model add: `skillChallenges SkillChallenge[]`
- In `Agent` model add: `skillChallenges SkillChallenge[]`

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
# Migration name: add_skill_challenge_model
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter api exec prisma generate
```

- [ ] **Step 4: Compile check**

```bash
pnpm --filter api build 2>&1 | grep -E "^.*error" | head -10
```

---

## Chunk 2: Challenge Generator

### Task 3.2: Create challenge-generator.ts

**Files:**
- Create: `apps/api/src/modules/challenges/challenge-generator.ts`

This module takes a `verification_config` from `clawhub_skills`, picks random values for variables, and produces:
- `params` — resolved params (variables substituted with concrete values)
- `markdownResponse` — markdown string with bash script

- [ ] **Step 1: Write challenge-generator.ts**

```typescript
// challenge-generator.ts
// Generates challenge params and bash script from a skill's verification_config

export interface VerificationConfig {
    type: string;
    skill_display: string;
    task_description: string;
    api_endpoint: string;
    params: Record<string, string | number>;
    variable_options: Record<string, (string | number)[]>;
    submission_fields: string[];
    validation: {
        type: string;
        check_path?: string;
    };
}

export interface ResolvedChallenge {
    params: Record<string, string | number>;
    taskDescription: string;
}

// Pick random element from array
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Substitute ${variable} placeholders with resolved values
function resolveParams(
    template: Record<string, string | number>,
    resolved: Record<string, string | number>
): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
            const varName = value.slice(2, -1);
            result[key] = resolved[varName] ?? value;
        } else {
            result[key] = value;
        }
    }
    return result;
}

export function resolveChallenge(config: VerificationConfig): ResolvedChallenge {
    // Pick a random value for each variable
    const resolved: Record<string, string | number> = {};
    for (const [varName, options] of Object.entries(config.variable_options)) {
        resolved[varName] = pickRandom(options);
    }
    const params = resolveParams(config.params, resolved);

    // Build a human-readable task description
    const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
    const taskDescription = `${config.task_description} (${paramStr})`;

    return { params, taskDescription };
}

export function buildQueryString(params: Record<string, string | number>): string {
    return Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
}

export function generateMarkdown(opts: {
    token: string;
    skillDisplay: string;
    taskDescription: string;
    apiEndpoint: string;
    params: Record<string, string | number>;
    submitUrl: string;
    expiresAt: Date;
}): string {
    const qs = buildQueryString(opts.params);
    const fullUrl = `${opts.apiEndpoint}?${qs}`;
    const expiry = opts.expiresAt.toISOString();

    return `# ClawQuest Skill Verification

## Challenge
You must prove you have the **${opts.skillDisplay}** skill installed by completing this task:

${opts.taskDescription}

**Expires:** ${expiry}

## How to verify (copy-paste this script)

\`\`\`bash
#!/bin/bash
# ClawQuest Skill Verification — ${opts.skillDisplay}
# Just run this script — do not modify

# Step 1: Fetch challenge data using ${opts.skillDisplay}
RESPONSE=$(curl -s "${fullUrl}")

# Step 2: Submit to ClawQuest
curl -s -X POST "${opts.submitUrl}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"result\\": $RESPONSE, \\"ts\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}"
\`\`\`

Run the script above. If it exits cleanly and ClawQuest accepts your submission, you are verified.
`;
}
```

- [ ] **Step 2: Compile check (isolated)**

```bash
cd apps/api && npx tsc --noEmit src/modules/challenges/challenge-generator.ts 2>&1 | head -20
```

---

## Chunk 3: Challenge Service

### Task 3.3: Create challenges.service.ts

**Files:**
- Create: `apps/api/src/modules/challenges/challenges.service.ts`

- [ ] **Step 1: Write challenges.service.ts**

Note: `FRONTEND_URL` is already used in the codebase (e.g. `agents.routes.ts:793`). No new env vars needed.
For the API submit URL, derive from the same pattern: `process.env.API_BASE_URL ?? 'https://api.clawquest.ai'` — add `API_BASE_URL` to `.env.example`:
```
API_BASE_URL=http://localhost:3000
```

```typescript
// challenges.service.ts
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import {
    type VerificationConfig,
    resolveChallenge,
    generateMarkdown,
} from './challenge-generator';

const CHALLENGE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
// API_BASE_URL: public URL of this API server (add to .env.example: API_BASE_URL=http://localhost:3000)
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.clawquest.ai';

function generateToken(): string {
    return 'cq_ch_' + randomBytes(8).toString('hex'); // cq_ch_XXXXXXXXXXXXXXXX
}

export async function createChallenge(
    prisma: PrismaClient,
    opts: { skillSlug: string; questId?: string; agentId?: string }
) {
    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: opts.skillSlug },
        select: { display_name: true, verification_config: true },
    });

    if (!skill) throw new Error(`Skill not found: ${opts.skillSlug}`);
    if (!skill.verification_config) {
        throw new Error(`Skill "${opts.skillSlug}" has no verification_config set`);
    }

    const config = skill.verification_config as unknown as VerificationConfig;
    const { params, taskDescription } = resolveChallenge(config);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

    const challenge = await prisma.skillChallenge.create({
        data: {
            token,
            skillSlug: opts.skillSlug,
            questId: opts.questId ?? null,
            agentId: opts.agentId ?? null,
            params,
            expiresAt,
        },
    });

    const verifyUrl = `${process.env.FRONTEND_URL ?? 'https://clawquest.ai'}/verify/${token}`;
    return { token, verifyUrl, challenge };
}

export async function getChallengeMarkdown(
    prisma: PrismaClient,
    token: string
): Promise<string | null> {
    const challenge = await prisma.skillChallenge.findUnique({ where: { token } });
    if (!challenge) return null;
    if (challenge.expiresAt < new Date()) return null;

    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: challenge.skillSlug },
        select: { display_name: true, verification_config: true },
    });
    if (!skill?.verification_config) return null;

    const config = skill.verification_config as unknown as VerificationConfig;
    const params = challenge.params as Record<string, string | number>;

    // Re-resolve task description with stored params (not random again)
    const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
    const taskDescription = `${config.task_description} (${paramStr})`;

    return generateMarkdown({
        token,
        skillDisplay: skill.display_name,
        taskDescription,
        apiEndpoint: config.api_endpoint,
        params,
        submitUrl: `${API_BASE_URL}/verify/${token}`,
        expiresAt: challenge.expiresAt,
    });
}

export async function submitChallengeResult(
    prisma: PrismaClient,
    token: string,
    submission: { result: unknown; ts: string }
): Promise<{ passed: boolean; message: string }> {
    const challenge = await prisma.skillChallenge.findUnique({ where: { token } });

    if (!challenge) return { passed: false, message: 'Challenge not found' };
    if (challenge.verifiedAt) return { passed: false, message: 'Challenge already submitted' };
    if (challenge.expiresAt < new Date()) return { passed: false, message: 'Challenge expired' };

    const skill = await prisma.clawhub_skills.findUnique({
        where: { slug: challenge.skillSlug },
        select: { verification_config: true },
    });
    if (!skill?.verification_config) {
        return { passed: false, message: 'Skill verification not configured' };
    }

    const config = skill.verification_config as unknown as VerificationConfig;
    const passed = validateResult(submission.result, config);

    await prisma.skillChallenge.update({
        where: { token },
        data: {
            result: submission as any,
            passed,
            verifiedAt: new Date(),
        },
    });

    return {
        passed,
        message: passed
            ? 'Verification passed! Skill confirmed.'
            : 'Verification failed. The result did not meet the expected criteria.',
    };
}

function validateResult(result: unknown, config: VerificationConfig): boolean {
    try {
        if (config.validation.type === 'non_empty_response') {
            const path = config.validation.check_path;
            if (!path) return result !== null && result !== undefined;
            // Walk the dot-path to check if value is non-empty
            const parts = path.split('.');
            let val: unknown = result;
            for (const part of parts) {
                if (val == null || typeof val !== 'object') return false;
                val = (val as Record<string, unknown>)[part];
            }
            if (Array.isArray(val)) return val.length > 0;
            return val !== null && val !== undefined;
        }
        // Default: any non-null result is a pass
        return result !== null && result !== undefined;
    } catch {
        return false;
    }
}
```

- [ ] **Step 2: Compile check**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

---

## Chunk 4: Challenge Routes

### Task 3.4: Create challenges.routes.ts

**Files:**
- Create: `apps/api/src/modules/challenges/challenges.routes.ts`

- [ ] **Step 1: Write challenges.routes.ts**

```typescript
// challenges.routes.ts
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createChallenge, getChallengeMarkdown, submitChallengeResult } from './challenges.service';
import { authenticateAgent } from '../agents/agent-auth.helper';

export async function challengesRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // ── POST /challenges — create a challenge (agent auth) ───────────────────
    server.post(
        '/challenges',
        {
            schema: {
                tags: ['Challenges'],
                summary: 'Create a skill verification challenge',
                body: z.object({
                    skillSlug: z.string().min(1),
                    questId: z.string().uuid().optional(),
                }),
                response: {
                    200: z.object({
                        token: z.string(),
                        verifyUrl: z.string(),
                        expiresAt: z.string(),
                    }),
                    400: z.object({ error: z.string() }),
                    401: z.object({ error: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const agent = await authenticateAgent(server as any, request, reply);
            if (!agent) return;

            const { skillSlug, questId } = request.body;
            try {
                const { token, verifyUrl, challenge } = await createChallenge(server.prisma, {
                    skillSlug,
                    questId,
                    agentId: agent.agentId,
                });
                return reply.status(200).send({
                    token,
                    verifyUrl,
                    expiresAt: challenge.expiresAt.toISOString(),
                });
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // ── GET /verify/:token — get challenge as markdown (public) ─────────────
    // NOTE: Returns text/markdown so agents can fetch and parse/run directly.
    // Browser visits get human-readable text too.
    server.get(
        '/verify/:token',
        {
            schema: {
                tags: ['Challenges'],
                summary: 'Get skill verification challenge as markdown',
                params: z.object({ token: z.string() }),
            },
        },
        async (request, reply) => {
            const { token } = request.params;
            const markdown = await getChallengeMarkdown(server.prisma, token);

            if (!markdown) {
                return reply
                    .status(404)
                    .header('Content-Type', 'text/markdown; charset=utf-8')
                    .send('# Challenge Not Found\n\nThis challenge does not exist or has expired.');
            }

            return reply
                .status(200)
                .header('Content-Type', 'text/markdown; charset=utf-8')
                .send(markdown);
        }
    );

    // ── POST /verify/:token — submit result (public, token is the secret) ───
    server.post(
        '/verify/:token',
        {
            schema: {
                tags: ['Challenges'],
                summary: 'Submit skill verification result',
                params: z.object({ token: z.string() }),
                body: z.object({
                    result: z.unknown(),
                    ts: z.string(),
                }),
                response: {
                    200: z.object({ passed: z.boolean(), message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { token } = request.params;
            const { result, ts } = request.body as any;
            const outcome = await submitChallengeResult(server.prisma, token, { result, ts });
            return reply.status(200).send(outcome);
        }
    );
}
```

- [ ] **Step 2: Register routes in app.ts**

```bash
grep -n "agentsRoutes\|register.*routes\|app.register" apps/api/src/app.ts | head -20
```

In `apps/api/src/app.ts`, add alongside the other route registrations:

```typescript
import { challengesRoutes } from './modules/challenges/challenges.routes';

// ... inside buildApp or registerRoutes:
await app.register(challengesRoutes);
```

- [ ] **Step 3: Full compile check**

```bash
pnpm --filter api build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Smoke test — create challenge + get markdown**

```bash
# Start dev server: pnpm --filter api dev

# Step 1: Create challenge (requires a cq_ API key in DB)
curl -s -X POST http://localhost:3000/challenges \
  -H "Authorization: Bearer cq_YOURAGENTAPIKEY" \
  -H "Content-Type: application/json" \
  -d '{"skillSlug":"bybit-trading"}' | jq '.'

# Step 2: Fetch markdown (use token from above)
curl -s http://localhost:3000/verify/cq_ch_TOKENHERE
# Expected: text/markdown with bash script

# Step 3: Submit fake result
curl -s -X POST http://localhost:3000/verify/cq_ch_TOKENHERE \
  -H "Content-Type: application/json" \
  -d '{"result":{"list":[[1,2,3]]},"ts":"2026-01-01T00:00:00Z"}' | jq '.'
# Expected: { "passed": true, "message": "Verification passed!..." }
```

---

## Success Criteria

- [ ] `POST /challenges` returns `{ token, verifyUrl, expiresAt }`
- [ ] `GET /verify/:token` returns `text/markdown` with bash script
- [ ] Bash script in markdown uses the resolved `params` (not template placeholders)
- [ ] `POST /verify/:token` returns `{ passed: true }` for valid result
- [ ] `POST /verify/:token` returns `{ passed: false, message: "already submitted" }` on duplicate
- [ ] `POST /verify/:token` returns `{ passed: false, message: "expired" }` after 30min
- [ ] No compile errors
