# Phase 4: Crawler Update

**Priority:** Medium — improves automation; can be done after Phases 1–3 are live
**Status:** pending

## Context

The crawler (`apps/api/src/modules/clawhub/clawhub-sync.job.ts`) currently inserts skills into `clawhub_skills` with all stats but leaves `verification_config` as null.

This phase adds auto-detection logic so the crawler can populate `verification_config` for skills it recognizes by category/tags/slug patterns. Admin can always override via the Phase 2 API.

## Strategy

Rather than hard-coding verification configs per-skill (brittle), we define a **registry** of known skill patterns. When the crawler encounters a skill whose slug or tags match a pattern, it writes a `verification_config` template.

Rules:
1. Only write `verification_config` if not already set (don't overwrite admin's manual config)
2. Keep the registry small — add patterns as skills are verified manually first
3. All generated configs must be reviewed by admin before use in production

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/modules/clawhub/clawhub-sync.job.ts` | Add auto-config logic on new skill insert |
| `apps/api/src/modules/clawhub/verification-config-registry.ts` | New: registry of known skill → config patterns |

---

## Chunk 1: Verification Config Registry

### Task 4.1: Create verification-config-registry.ts

**Files:**
- Create: `apps/api/src/modules/clawhub/verification-config-registry.ts`

- [ ] **Step 1: Write the registry**

```typescript
// verification-config-registry.ts
// Maps known skill slug patterns/tags to default verification_config templates.
// Crawler uses this to auto-populate configs for recognizable skills.
// Admin can always override via PATCH /admin/skills/:slug/verification-config.

export interface SkillPattern {
    // Match by slug contains (case-insensitive) OR tag value match
    slugContains?: string[];
    tagValues?: string[];
    config: Record<string, unknown>;
}

export const VERIFICATION_CONFIG_REGISTRY: SkillPattern[] = [
    {
        slugContains: ['bybit'],
        tagValues: ['bybit', 'trading', 'defi'],
        config: {
            type: 'api_call',
            skill_display: 'Bybit Trading',
            task_description: 'Fetch spot kline (candlestick) data from Bybit API',
            api_endpoint: 'https://api.bybit.com/v5/market/kline',
            params: {
                category: 'spot',
                symbol: '${symbol}',
                interval: '${interval}',
                limit: '${limit}',
            },
            variable_options: {
                symbol: ['DOGEUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
                interval: ['5', '15', '60'],
                limit: [3, 5],
            },
            submission_fields: ['result', 'ts'],
            validation: { type: 'non_empty_response', check_path: 'result' },
        },
    },
    {
        slugContains: ['coingecko', 'coin-gecko'],
        tagValues: ['coingecko', 'price', 'crypto'],
        config: {
            type: 'api_call',
            skill_display: 'CoinGecko Price',
            task_description: 'Fetch current price of a coin from CoinGecko API',
            api_endpoint: 'https://api.coingecko.com/api/v3/simple/price',
            params: {
                ids: '${coin}',
                vs_currencies: 'usd',
            },
            variable_options: {
                coin: ['bitcoin', 'ethereum', 'dogecoin', 'solana'],
            },
            submission_fields: ['result', 'ts'],
            validation: { type: 'non_empty_response', check_path: 'result' },
        },
    },
];

export function detectVerificationConfig(
    slug: string,
    tags: Record<string, string>
): Record<string, unknown> | null {
    const slugLower = slug.toLowerCase();
    const tagValues = Object.values(tags).map(v => v.toLowerCase());

    for (const pattern of VERIFICATION_CONFIG_REGISTRY) {
        const slugMatch = pattern.slugContains?.some(s => slugLower.includes(s));
        const tagMatch = pattern.tagValues?.some(t => tagValues.includes(t));
        if (slugMatch || tagMatch) {
            return pattern.config;
        }
    }
    return null;
}
```

- [ ] **Step 2: Compile check**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

---

## Chunk 2: Update Crawler to Use Registry

### Task 4.2: Use detectVerificationConfig in clawhub-sync.job.ts

**Files:**
- Modify: `apps/api/src/modules/clawhub/clawhub-sync.job.ts`

- [ ] **Step 1: Import detectVerificationConfig**

Add import at top of file:
```typescript
import { detectVerificationConfig } from './verification-config-registry';
```

- [ ] **Step 2: Find the skill insert/create call**

```bash
grep -n "clawhub_skills.create\|clawhub_skills.upsert\|prisma.clawhub_skills" \
  apps/api/src/modules/clawhub/clawhub-sync.job.ts
```

- [ ] **Step 3: Add verification_config to the create call**

In the `create` data block for new skills, add:

```typescript
// After resolving slug and tags for the skill being inserted:
const autoConfig = detectVerificationConfig(skill.slug, skill.tags ?? {});

// In the create/upsert call, add:
verification_config: autoConfig ?? undefined,
```

Only set on CREATE, not UPDATE — this ensures admin-set configs are never overwritten:

```typescript
// In upsert:
create: {
    // ... existing fields ...
    verification_config: autoConfig ?? undefined,
},
update: {
    // ... existing fields ...
    // Do NOT include verification_config here — preserve admin overrides
},
```

- [ ] **Step 4: Full compile check**

```bash
pnpm --filter api build 2>&1 | tail -20
```

- [ ] **Step 5: Verify registry doesn't overwrite admin configs**

Manual check: after running crawler in dev, query:
```bash
# In psql or Prisma Studio — check that bybit-trading config (if set via admin in Phase 2) is unchanged
pnpm --filter api db:studio
# Browse clawhub_skills → bybit-trading → verify verification_config
```

---

## Success Criteria

- [ ] `detectVerificationConfig('bybit-trading', {})` returns the Bybit config
- [ ] `detectVerificationConfig('some-random-skill', {})` returns null
- [ ] After crawler runs, new skills matching known patterns have `verification_config` auto-set
- [ ] Existing skills with admin-set `verification_config` are NOT overwritten by crawler
- [ ] No compile errors
