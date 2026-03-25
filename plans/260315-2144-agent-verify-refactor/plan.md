# Agent & Verify Refactor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove agent registration flows, add admin skill management API, and replace the verify page with a new challenge-based bash-script verification system.

**Architecture:** Agents no longer self-register or claim ownership via Twitter. Instead, quest skill verification works by generating a unique challenge token — the agent fetches `GET /verify/:token` (markdown + bash script), runs the script, then POSTs the result back. Admin can manage skills via the admin API.

**Tech Stack:** Fastify + Prisma (PostgreSQL), React 18 + TanStack Router, Zod validation, pnpm monorepo

---

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [1](#phase-1-remove-agent-registration) | Remove agent registration (API + Dashboard) | pending |
| [2](#phase-2-admin-skill-management-api) | Admin skill management API + schema | pending |
| [3](#phase-3-skill-challenge-system) | Skill challenge system (model + routes + generator) | pending |
| [4](#phase-4-crawler-update) | Update crawler for verification_config | pending |

---

## Phase 1: Remove Agent Registration

See → [phase-01-remove-agent-registration.md](./phase-01-remove-agent-registration.md)

Removes self-register, tweet-based claim, activation-code exchange, and the dashboard verify page.

## Phase 2: Admin Skill Management API

See → [phase-02-admin-skill-api.md](./phase-02-admin-skill-api.md)

Adds `verification_config` to `clawhub_skills`, creates admin CRUD endpoints for skill management.

## Phase 3: Skill Challenge System

See → [phase-03-skill-challenge-system.md](./phase-03-skill-challenge-system.md)

New `SkillChallenge` model, challenge generation logic, markdown + bash script response, result submission + validation.

## Phase 4: Crawler Update

See → [phase-04-crawler-update.md](./phase-04-crawler-update.md)

Updates the clawhub sync job to optionally populate `verification_config` for known skill categories.

---

## Recommended Execution Order

Run phases in this sequence — each phase builds on the previous:

1. **Phase 1** — Remove registration (clean slate, no conflicts)
2. **Phase 3, Chunk 0** — Extract `authenticateAgent` helper (before Phase 3 routes need it)
3. **Phase 3, Chunks 1–4** — Add `SkillChallenge` model + challenge routes
4. **Phase 2** — Add admin skill API (tools to configure `verification_config`)
5. **Phase 4** — Update crawler (automation layer, can run last)

## Key Notes

- **No git commits** — developer commits manually
- `getAdminPrisma` signature: `getAdminPrisma(server.prisma, env)` — note arg order
- `authenticateAdmin` is a **router-level hook** in `adminRoutes`, not per-route
- `FRONTEND_URL` already exists in env — reuse it; only new var is `API_BASE_URL`
- Agent table stays; only the *registration flow* (UI + API routes) is removed
