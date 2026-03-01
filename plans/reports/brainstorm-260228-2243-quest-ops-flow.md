# Brainstorm: Quest Operations Flow

**Date:** 2026-02-28
**Status:** Agreed — ready for planning

---

## Problem Statement

Quest lifecycle after funding is incomplete. Agents submit proofs but no one can verify them. No UI for sponsors to manage their quests post-creation. Payout distribution exists in API but no frontend trigger.

## Current State (Audit Results)

### Done
- Quest create/edit/fund flow (full)
- Escrow backend: deposit params, on-chain status, distribute, refund, event poller
- Admin API: 16 endpoints (quest CRUD, user mgmt, escrow overview, analytics)
- Proof submission: `POST /quests/:id/proof` → status="submitted"

### Missing (Gaps)
1. **Proof Verification API** — approve/reject submitted proofs
2. **Quest Manage Page** — sponsor dashboard for managing quest lifecycle
3. **Payout Trigger UI** — connect frontend to `POST /escrow/distribute`
4. **Refund Flow UI** — connect frontend to `POST /escrow/refund`

## Agreed Scope

### In Scope
- Proof verify API (creator + admin can verify)
- Quest Manage page `/quests/:questId/manage` (creator + admin access)
- Payout distribute trigger (creator + admin)
- Refund trigger (creator + admin)
- On-chain escrow status display on manage page

### Out of Scope
- Auto-lifecycle (scheduled→live, live→expired) — manual via admin
- Admin Dashboard frontend (separate project)
- MCP server wrapper

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Manage page access | Creator + Admin | Sponsor manages own quests, admin can intervene |
| Proof verifier | Creator + Admin | Sponsor reviews agent work, admin overrides |
| Payout trigger | Creator + Admin | Sponsor initiates payout, admin can also trigger |
| Auto-lifecycle | Manual only | Admin force-status sufficient for MVP |

## Implementation Approach

### Phase 1: Backend API
- Add `POST /quests/:id/participations/:pid/verify` (approve/reject)
- Add `POST /quests/:id/participations/verify-bulk` (batch verify)
- Ensure distribute/refund endpoints work for creator auth (not just admin)

### Phase 2: Quest Manage Page (Frontend)
- New route: `/quests/:questId/manage`
- Sections: Overview, Participants/Proofs, Escrow Status, Actions
- Proof review table with approve/reject buttons
- Distribute + Refund action buttons
- On-chain status panel (read from `/escrow/status/:questId`)

### Phase 3: Integration & Polish
- Link from Quest Detail → Manage (for creator)
- Link from Dashboard My Quests → Manage
- Toast notifications for action results
- Error handling for on-chain failures

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Distribute without all proofs verified | Warn user, require confirmation |
| Double distribute | Check quest status + on-chain status before allowing |
| Creator modifies quest after funding | Edit locked when fundingStatus=confirmed |
| Refund after partial distribution | Contract handles remaining balance only |

## Success Criteria
- [ ] Creator can view all submitted proofs on manage page
- [ ] Creator can approve/reject individual proofs
- [ ] Creator can trigger payout distribution
- [ ] Creator can trigger refund
- [ ] On-chain escrow status visible on manage page
- [ ] Admin can do all of the above
- [ ] All existing tests still pass

## Next Steps
→ Create detailed implementation plan with phases and TODO tasks
