---
title: "Quest Operations Flow"
description: "Proof verification API, quest manage page, payout/refund trigger UI"
status: completed
priority: P1
effort: 10h
branch: main
tags: [feature, backend, frontend, api]
created: 2026-02-28
---

# Quest Operations Flow

## Overview

Complete the quest lifecycle post-funding: proof verification, quest manage page, payout distribution, and refund triggers. Creator + admin can verify proofs, trigger payouts, and refund.

## Context

- Brainstorm: [brainstorm report](../reports/brainstorm-260228-2243-quest-ops-flow.md)
- Existing escrow: `apps/api/src/modules/escrow/` (distribute, refund, poller — all done)
- Existing proof submit: `POST /quests/:id/proof` → status="submitted"
- Missing: verify endpoint, manage page, UI triggers

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Proof Verification API | Completed | 3h | [phase-01](./phase-01-proof-verify-api.md) |
| 2 | Quest Manage Page | Completed | 5h | [phase-02](./phase-02-quest-manage-page.md) |
| 3 | Integration & Links | Completed | 2h | [phase-03](./phase-03-integration.md) |

## Dependencies

- Phase 2 depends on Phase 1 (verify API needed before UI)
- Phase 3 depends on Phase 2 (links + polish after manage page)
- Escrow distribute/refund endpoints already exist (no new escrow work)

## Key Decisions

- Access: Creator + Admin for all operations
- Auth: Creator verified via `creatorUserId`, admin via `requireAdmin` middleware
- No auto-lifecycle — manual status changes only
- Distribute/refund: reuse existing `/escrow/distribute` and `/escrow/refund` endpoints
