# Cloudflare Deploy for Admin & Dashboard

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy admin and dashboard SPAs to Cloudflare Workers Static Assets with Cloudflare's built-in Git CI/CD.

**Architecture:** Each app gets its own `wrangler.toml` with `[assets]` config for SPA routing. Cloudflare auto-triggers build+deploy on push to `main` via Git integration — no GitHub Actions needed. Root `package.json` provides local deploy convenience scripts.

**Tech Stack:** Cloudflare Workers Static Assets, Wrangler CLI

---

## Context

### Cloudflare Applications Overview

| App | Type | Status | Deploy method |
|-----|------|--------|---------------|
| `claw-quest-admin` | Workers Static Assets (SPA) | **NEW** | Cloudflare Git CI/CD |
| `claw-quest-dashboard` | Workers Static Assets (SPA) | **NEW** | Cloudflare Git CI/CD |
| `clawquest-llm-server` | Cloudflare Worker (Hono + D1) | Existing | `wrangler deploy` / Git CI/CD |
| `clawquest-mcp` | Cloudflare Worker (Hono) | Existing | `wrangler deploy` / Git CI/CD |
| API (`apps/api`) | **Railway (Docker)** | Existing | Railway CI/CD |

> **Why not API on Cloudflare Workers?** Fastify relies on Node.js HTTP primitives (`http.createServer`) which don't exist in Workers runtime. Would require full rewrite to Hono + Prisma Workers adapter. Not worth it — keep on Railway.

### Cloudflare Git CI/CD (replaces GitHub Actions)

Each Cloudflare project connects to the GitHub repo. On push to `main`, Cloudflare runs:
1. **Build command** — installs deps, builds shared, builds app
2. **Deploy command** — `npx wrangler deploy`

Environment variables (including `VITE_*`) are set in Cloudflare dashboard per project. No GitHub secrets needed for deploy.

This means `.github/workflows/admin-deploy.yml` and `dashboard-deploy.yml` can be **deleted** — Cloudflare handles everything.

## File Structure

```
apps/admin/wrangler.toml               # NEW — Workers Static Assets config
apps/dashboard/wrangler.toml           # NEW — Workers Static Assets config
apps/admin/package.json                # MODIFY — add wrangler devDependency
apps/dashboard/package.json            # MODIFY — add wrangler devDependency
package.json                           # MODIFY — add deploy convenience scripts
.github/workflows/admin-deploy.yml     # DELETE — replaced by Cloudflare Git CI/CD
.github/workflows/dashboard-deploy.yml # DELETE — replaced by Cloudflare Git CI/CD
```

## Prerequisites

- Cloudflare account connected to `lab3-ai/claw-quest` GitHub repo
- Create 2 Workers in Cloudflare dashboard (same flow as screenshot):
  - `claw-quest-admin` — connected to repo
  - `claw-quest-dashboard` — connected to repo

---

## Chunk 1: Wrangler Configs & Local Deploy

### Task 0: Install wrangler in both apps

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: Add wrangler as devDependency to both apps**

```bash
pnpm --filter @clawquest/admin add -D wrangler
pnpm --filter @clawquest/dashboard add -D wrangler
```

> Matches existing pattern: `apps/llm-server` already has `wrangler` as a devDependency.

---

### Task 1: Create admin wrangler.toml

**Files:**
- Create: `apps/admin/wrangler.toml`

- [ ] **Step 1: Create the wrangler config**

```toml
name = "claw-quest-admin"
compatibility_date = "2026-03-17"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

- [ ] **Step 2: Verify build output matches config**

Run: `pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/admin build && ls apps/admin/dist/index.html`
Expected: file exists

---

### Task 2: Create dashboard wrangler.toml

**Files:**
- Create: `apps/dashboard/wrangler.toml`

- [ ] **Step 1: Create the wrangler config**

```toml
name = "claw-quest-dashboard"
compatibility_date = "2026-03-17"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

- [ ] **Step 2: Verify build output matches config**

Run: `pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/dashboard build && ls apps/dashboard/dist/index.html`
Expected: file exists

---

### Task 3: Add root deploy scripts & cleanup GitHub Actions

**Files:**
- Modify: `package.json` (root)
- Delete: `.github/workflows/admin-deploy.yml`
- Delete: `.github/workflows/dashboard-deploy.yml`

- [ ] **Step 1: Add deploy scripts to root package.json**

Add these scripts:

```json
{
  "scripts": {
    "deploy:admin": "pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/admin build && pnpm --filter @clawquest/admin exec wrangler deploy",
    "deploy:dashboard": "pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/dashboard build && pnpm --filter @clawquest/dashboard exec wrangler deploy"
  }
}
```

- [ ] **Step 2: Delete GitHub Actions workflows (replaced by Cloudflare Git CI/CD)**

```bash
rm .github/workflows/admin-deploy.yml
rm .github/workflows/dashboard-deploy.yml
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/wrangler.toml apps/dashboard/wrangler.toml package.json pnpm-lock.yaml apps/admin/package.json apps/dashboard/package.json
git rm .github/workflows/admin-deploy.yml .github/workflows/dashboard-deploy.yml
git commit -m "feat(deploy): add Cloudflare Workers Static Assets for admin and dashboard"
```

---

## Chunk 2: Cloudflare Dashboard Setup (Manual)

These steps are done in the Cloudflare dashboard, not in code.

### Task 4: Create `claw-quest-admin` application

In Cloudflare dashboard → Workers & Pages → Create:

| Field | Value |
|-------|-------|
| Repository | `lab3-ai/claw-quest` |
| Project name | `claw-quest-admin` |
| Build command | `pnpm install && pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/admin build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `apps/admin` |
| Builds for non-production branches | ✅ (optional, for preview deploys) |

**Environment variables** (Settings → Variables → Add):

| Variable | Value | Type |
|----------|-------|------|
| `VITE_API_URL` | `https://api.clawquest.ai` | Plain text |
| `VITE_SUPABASE_URL` | `(your supabase URL)` | Encrypted |
| `VITE_SUPABASE_ANON_KEY` | `(your anon key)` | Encrypted |
| `VITE_LLM_SERVER_URL` | `(your LLM server URL)` | Plain text |
| `VITE_LLM_ADMIN_KEY` | `(your admin key)` | Encrypted |

---

### Task 5: Create `claw-quest-dashboard` application

Same flow in Cloudflare dashboard:

| Field | Value |
|-------|-------|
| Repository | `lab3-ai/claw-quest` |
| Project name | `claw-quest-dashboard` |
| Build command | `pnpm install && pnpm --filter @clawquest/shared build && pnpm --filter @clawquest/dashboard build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `apps/dashboard` |

**Environment variables:**

| Variable | Value | Type |
|----------|-------|------|
| `VITE_API_URL` | `https://api.clawquest.ai` | Plain text |
| `VITE_SUPABASE_URL` | `(your supabase URL)` | Encrypted |
| `VITE_SUPABASE_ANON_KEY` | `(your anon key)` | Encrypted |

---

## Usage

### Local deploy (from monorepo root)

```bash
pnpm deploy:admin       # builds shared → builds admin → deploys to Cloudflare
pnpm deploy:dashboard   # builds shared → builds dashboard → deploys to Cloudflare
```

### From app directory

```bash
cd apps/admin && npx wrangler deploy    # deploy only (must build first)
cd apps/dashboard && npx wrangler deploy
```

### CI/CD (automatic)

Push to `main` → Cloudflare auto-detects changes → builds → deploys. No GitHub Actions involved.

---

## Custom Domains (optional, post-deploy)

After first deploy, in Cloudflare dashboard → each Worker → Settings → Domains & Routes:
- `claw-quest-admin` → `admin.clawquest.ai`
- `claw-quest-dashboard` → `app.clawquest.ai`

---

## Unresolved Questions

1. Does the Cloudflare Git integration support monorepo path filtering (only rebuild admin when `apps/admin/**` changes)? If not, all 4 Workers may rebuild on every push.
2. What custom domains should be configured for admin and dashboard?
