# Phase 2: Admin Skill Management API

**Priority:** High — required so admins can configure `verification_config` for skills before Phase 3 works
**Status:** pending

## Context

`clawhub_skills` is currently populated only by the crawler. Admins need to:
1. Manually insert/upsert a skill (for skills not in ClawHub, or to backfill)
2. Set `verification_config` — a JSON blob that tells the challenge generator what task to issue and how to validate the response

The existing admin module (`apps/api/src/modules/admin/`) uses its own JWT auth (`ADMIN_JWT_SECRET`). We add skill endpoints there.

## What is `verification_config`?

```json
{
  "type": "api_call",
  "skill_display": "Bybit Trading",
  "task_description": "Fetch spot kline data from Bybit API",
  "api_endpoint": "https://api.bybit.com/v5/market/kline",
  "params": {
    "category": "spot",
    "symbol": "${symbol}",
    "interval": "${interval}",
    "limit": "${limit}"
  },
  "variable_options": {
    "symbol": ["DOGEUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT"],
    "interval": ["5", "15", "60"],
    "limit": [3, 5, 10]
  },
  "submission_fields": ["result", "ts"],
  "validation": {
    "type": "non_empty_response",
    "check_path": "result"
  }
}
```

When a challenge is created (Phase 3), the generator picks random values from `variable_options`, embeds them into `params`, and produces a unique bash script + task description. This makes each challenge non-replayable.

## Files to Create/Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `verification_config Json?` to `clawhub_skills` |
| `apps/api/src/modules/admin/admin.routes.ts` | Add skill management endpoints |
| `apps/api/src/modules/admin/admin.service.ts` | Add skill CRUD functions |

---

## Chunk 1: Schema — Add verification_config

### Task 2.1: Add field to clawhub_skills model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add verification_config field**

In the `clawhub_skills` model, add after `featured_order Int?`:
```prisma
verification_config     Json?
```

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
# Migration name: add_verification_config_to_clawhub_skills
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter api exec prisma generate
```

- [ ] **Step 4: Compile check**

```bash
pnpm --filter api build 2>&1 | tail -10
```

---

## Chunk 2: Admin Service — Skill CRUD functions

### Task 2.2: Add skill service functions

**Files:**
- Modify: `apps/api/src/modules/admin/admin.service.ts`

Add these functions at the bottom of the file:

- [ ] **Step 1: Add upsertSkill function**

```typescript
export async function upsertSkill(
    prisma: PrismaClient,
    data: {
        slug: string;
        display_name: string;
        summary?: string;
        owner_handle?: string;
        owner_display_name?: string;
        tags?: Record<string, string>;
        verification_config?: Record<string, unknown>;
        featured?: boolean;
        featured_order?: number;
        is_web3?: boolean;
    }
) {
    return prisma.clawhub_skills.upsert({
        where: { slug: data.slug },
        create: {
            clawhub_id: `admin_${data.slug}`,
            slug: data.slug,
            display_name: data.display_name,
            summary: data.summary ?? null,
            owner_handle: data.owner_handle ?? null,
            owner_display_name: data.owner_display_name ?? null,
            tags: data.tags ?? {},
            badges: {},
            verification_config: data.verification_config ?? undefined,
            featured: data.featured ?? false,
            featured_order: data.featured_order ?? null,
            is_web3: data.is_web3 ?? false,
        },
        update: {
            display_name: data.display_name,
            summary: data.summary ?? undefined,
            owner_handle: data.owner_handle ?? undefined,
            owner_display_name: data.owner_display_name ?? undefined,
            tags: data.tags ?? undefined,
            verification_config: data.verification_config ?? undefined,
            featured: data.featured ?? undefined,
            featured_order: data.featured_order ?? undefined,
            is_web3: data.is_web3 ?? undefined,
        },
    });
}

export async function updateSkillVerificationConfig(
    prisma: PrismaClient,
    slug: string,
    verification_config: Record<string, unknown>
) {
    return prisma.clawhub_skills.update({
        where: { slug },
        data: { verification_config },
    });
}

export async function listSkillsAdmin(
    prisma: PrismaClient,
    opts: { limit?: number; offset?: number; search?: string; hasVerifyConfig?: boolean }
) {
    const where: Prisma.clawhub_skillsWhereInput = {};
    if (opts.search) {
        where.OR = [
            { slug: { contains: opts.search, mode: 'insensitive' } },
            { display_name: { contains: opts.search, mode: 'insensitive' } },
        ];
    }
    if (opts.hasVerifyConfig === true) where.verification_config = { not: Prisma.JsonNull };
    if (opts.hasVerifyConfig === false) where.verification_config = Prisma.JsonNull;

    const [items, total] = await Promise.all([
        prisma.clawhub_skills.findMany({
            where,
            orderBy: { downloads: 'desc' },
            take: opts.limit ?? 50,
            skip: opts.offset ?? 0,
            select: {
                id: true, slug: true, display_name: true, summary: true,
                downloads: true, stars: true, featured: true,
                is_web3: true, verification_config: true, crawled_at: true,
            },
        }),
        prisma.clawhub_skills.count({ where }),
    ]);
    return { items, total };
}
```

- [ ] **Step 2: Add Prisma import if missing**

Make sure `Prisma` namespace is imported:
```typescript
import { type PrismaClient, Prisma } from '@prisma/client';
```

Check existing imports first:
```bash
head -10 apps/api/src/modules/admin/admin.service.ts
```

- [ ] **Step 3: Compile check**

```bash
pnpm --filter api build 2>&1 | grep -E "error|Error" | head -20
```

---

## Chunk 3: Admin Routes — Skill Endpoints

### Task 2.3: Add skill endpoints to admin routes

**Files:**
- Modify: `apps/api/src/modules/admin/admin.routes.ts`

Add at the end of the `adminRoutes` function, before the closing brace:

- [ ] **Step 1: Verify how adminRoutes applies auth**

`authenticateAdmin` is applied as a router-level hook in `adminRoutes`:
```typescript
server.addHook('onRequest', authenticateAdmin);
```
This means **all routes inside `adminRoutes` are already protected** — do NOT add `onRequest: [authenticateAdmin]` per-route. Add the new skill endpoints inside the existing `adminRoutes` function body.

- [ ] **Step 2: Import new service functions**

Add to imports at top of `admin.routes.ts`:
```typescript
import { ..., upsertSkill, updateSkillVerificationConfig, listSkillsAdmin } from './admin.service';
```

- [ ] **Step 3: Add GET /admin/skills**

Add inside the `adminRoutes` function body (before its closing brace):
```typescript
// ── List skills (admin) ──────────────────────────────────────────────────────
server.get(
    '/skills',
    {
        schema: {
            tags: ['Admin - Skills'],
            summary: 'List clawhub_skills with optional filters',
            querystring: z.object({
                limit: z.coerce.number().min(1).max(200).default(50),
                offset: z.coerce.number().min(0).default(0),
                search: z.string().optional(),
                hasVerifyConfig: z.enum(['true', 'false']).optional(),
                env: z.enum(['mainnet', 'testnet']).default('mainnet'),
            }),
        },
    },
    async (request) => {
        const { env, limit, offset, search, hasVerifyConfig } = request.query as any;
        const prisma = getAdminPrisma(server.prisma, env as AdminEnv);
        const result = await listSkillsAdmin(prisma, {
            limit,
            offset,
            search,
            hasVerifyConfig: hasVerifyConfig === 'true' ? true : hasVerifyConfig === 'false' ? false : undefined,
        });
        return result;
    }
);
```

- [ ] **Step 4: Add POST /admin/skills (upsert)**

```typescript
// ── Upsert skill (admin) ─────────────────────────────────────────────────────
server.post(
    '/skills',
    {
        schema: {
            tags: ['Admin - Skills'],
            summary: 'Upsert a skill in clawhub_skills',
            body: z.object({
                slug: z.string().min(1).max(100),
                display_name: z.string().min(1).max(200),
                summary: z.string().optional(),
                owner_handle: z.string().optional(),
                owner_display_name: z.string().optional(),
                tags: z.record(z.string()).optional(),
                verification_config: z.record(z.unknown()).optional(),
                featured: z.boolean().optional(),
                featured_order: z.number().int().optional(),
                is_web3: z.boolean().optional(),
                env: z.enum(['mainnet', 'testnet']).default('mainnet'),
            }),
        },
    },
    async (request, reply) => {
        const { env, ...data } = request.body as any;
        const prisma = getAdminPrisma(server.prisma, env as AdminEnv);
        const skill = await upsertSkill(prisma, data);
        return reply.status(200).send({ skill });
    }
);
```

- [ ] **Step 5: Add PATCH /admin/skills/:slug/verification-config**

```typescript
// ── Set verification config for a skill ─────────────────────────────────────
server.patch(
    '/skills/:slug/verification-config',
    {
        schema: {
            tags: ['Admin - Skills'],
            summary: 'Set verification_config for a skill',
            params: z.object({ slug: z.string() }),
            body: z.object({
                verification_config: z.record(z.unknown()),
                env: z.enum(['mainnet', 'testnet']).default('mainnet'),
            }),
        },
    },
    async (request, reply) => {
        const { slug } = request.params as any;
        const { env, verification_config } = request.body as any;
        const prisma = getAdminPrisma(server.prisma, env as AdminEnv);
        try {
            const skill = await updateSkillVerificationConfig(prisma, slug, verification_config);
            return reply.status(200).send({ skill });
        } catch {
            return reply.status(404).send({ error: 'Skill not found' });
        }
    }
);
```

- [ ] **Step 6: Full compile + test**

```bash
pnpm --filter api build 2>&1 | tail -10
```

- [ ] **Step 6: Smoke-test via curl (dev server)**

```bash
# Start dev server first: pnpm --filter api dev

# Login as admin (replace with real credentials)
TOKEN=$(curl -s -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test"}' | jq -r '.token')

# List skills
curl -s "http://localhost:3000/admin/skills?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.total'

# Upsert a skill with verification_config
curl -s -X POST "http://localhost:3000/admin/skills" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "bybit-trading",
    "display_name": "Bybit Trading",
    "summary": "Interact with Bybit exchange API",
    "verification_config": {
      "type": "api_call",
      "skill_display": "Bybit Trading",
      "task_description": "Fetch spot kline (candlestick) data from Bybit API",
      "api_endpoint": "https://api.bybit.com/v5/market/kline",
      "params": {
        "category": "spot",
        "symbol": "${symbol}",
        "interval": "${interval}",
        "limit": "${limit}"
      },
      "variable_options": {
        "symbol": ["DOGEUSDT", "BTCUSDT", "ETHUSDT"],
        "interval": ["5", "15", "60"],
        "limit": [3, 5, 10]
      },
      "submission_fields": ["result", "ts"],
      "validation": { "type": "non_empty_response", "check_path": "result" }
    }
  }' | jq '.skill.slug'
```

Expected: `"bybit-trading"`

---

## Success Criteria

- [ ] `GET /admin/skills` returns paginated list with `total`
- [ ] `POST /admin/skills` creates or updates skill by slug
- [ ] `PATCH /admin/skills/:slug/verification-config` updates `verification_config`
- [ ] Skills with `verification_config` are queryable via `?hasVerifyConfig=true`
- [ ] No compile errors
