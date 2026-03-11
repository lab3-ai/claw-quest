# Pre-Mortem: Quest Invite Partner Flow

**Date**: 2026-03-06
**Status**: Draft
**Scope**: Quest Owner → Invite Partner → Accept → Co-fund → Distribute

## Risk Summary
- **Tigers**: 6 (2 launch-blocking, 2 fast-follow, 2 track)
- **Paper Tigers**: 3
- **Elephants**: 2

---

## Launch-Blocking Tigers

| # | Risk | Likelihood | Impact | Mitigation | Owner | Deadline |
|---|------|-----------|--------|-----------|-------|----------|
| 1 | **`isSponsor` check is wrong** — `fund.tsx:416` uses `collabData?.collaborators?.length > 0` which returns `true` if ANY collaborators exist on the quest, not if the CURRENT user is a sponsor. A random viewer who happens to be authenticated could see "Invite a partner" button if the API ever relaxes the `GET /collaborators` auth check. Currently masked because the endpoint requires owner/sponsor auth, but one API change breaks it. | Medium | High | Fix to `collabData?.collaborators?.some(c => c.userId === currentUserId)` or return `isSponsor: boolean` from API. | Ray | Before launch |
| 2 | **Fund page may not pass auth token to deposit-params** — `GET /escrow/deposit-params/:questId` optionally reads auth to determine if caller is owner vs sponsor and compute the correct `escrowQuestId` (sub-questId). If the fund page fetches without `Authorization` header, a sponsor gets the OWNER's questId bytes32 and deposits to the wrong escrow slot. Funds would be locked in a slot nobody can distribute from. | Medium | Critical | Audit fund page fetch call — ensure `Authorization: Bearer` is always included. Add server-side guard: if user is a known sponsor but no auth header, return 401 instead of silently falling back to owner questId. | Ray/Ryan | Before launch |

## Fast-Follow Tigers

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|-----------|--------|-----------------|-------|
| 3 | **Unlimited pending invites** — only ACCEPTED sponsors count toward the 5 cap. Owner can spam 100 pending invite links. Each creates a DB row. Potential for invite link confusion (which one did I send?) and minor DB bloat. | Medium | Low | Add cap on pending (unaccepted, unexpired) invites per quest, e.g. max 10 outstanding. Or count pending + accepted toward the 5 limit. | Brian |
| 4 | **No invite revocation** — once a link is generated, there's no way to revoke it before the 7-day expiry. If owner sends link to wrong person, can only wait or race to remove them after they accept. | Medium | Medium | Add `DELETE /quests/:id/invite/:inviteId` (owner only) that deletes the pending `QuestCollaborator` row. Trivial implementation. | Ryan |

## Track Tigers

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 5 | **Auto-accept on page load (join.tsx)** — `useEffect` fires `POST /collaborate` immediately on mount. No confirmation screen. User might accidentally accept by clicking a link. If they don't want to be a sponsor, there's no undo (no "leave quest" endpoint). | Low | Medium | Add a confirmation step before auto-accept: show quest title + "Accept partnership?" button. Add `POST /quests/:id/leave` for sponsors to self-remove. |
| 6 | **Copy button has no feedback** — `fund.tsx:498` calls `navigator.clipboard.writeText` but shows no toast/success indicator. User doesn't know if copy worked (especially on mobile where clipboard access can fail silently). | High | Low | Add a "Copied!" toast or button text change on success. Handle clipboard API rejection gracefully. |

---

## Paper Tigers

| # | Concern | Why It's Manageable |
|---|---------|-------------------|
| 7 | **Token brute-force** — `collab_` + 64 hex chars = 256 bits of entropy. Mathematically infeasible to guess. Even at 1M attempts/sec, heat death of universe before finding a valid token. | Becomes real Tiger only if token length is accidentally reduced or if tokens are leaked in logs. |
| 8 | **Race condition on accept** — two people clicking same invite link simultaneously. The `$transaction` with re-count handles this correctly. The `invite.acceptedAt` check pre-transaction also gates it. First wins, second gets `TOKEN_USED`. | Already handled. Would only break if someone removes the transaction block. |
| 9 | **Proportional distribution rounding errors** — BigInt arithmetic for multi-deposit distribute could lose dust amounts due to integer division. | At most 1 wei per deposit lost to rounding. Negligible for any realistic token decimals (6-18). |

---

## Elephants in the Room

| # | Risk | Why It's Uncomfortable | Conversation Starter |
|---|------|----------------------|---------------------|
| 10 | **No deposit tracking UX per sponsor** — after a sponsor deposits, there's no clear "your deposit: X USDC, status: confirmed" view. The FundingProgress bar shows aggregate only. Sponsors don't know if THEIR specific deposit landed. Trust issue. | Requires frontend work that nobody has scoped. | "If I'm a sponsor and I just deposited 500 USDC, how do I know it worked? What do I see?" |
| 11 | **Sponsor has no say in distribution** — owner unilaterally distributes rewards. Sponsor's funds get distributed proportionally without their approval. If owner distributes to friends/fake winners, sponsor has no recourse except the 30-day emergency withdraw (which only works if quest expired). | This is a fundamental trust model question. Contract gives all power to OPERATOR role (backend), which acts on owner's behalf. | "What happens if a sponsor disagrees with how their funds are distributed? Do we need multi-sig approval for distribution, or is the current trust model acceptable for v1?" |

---

## Go/No-Go Checklist

- [ ] **Tiger #1**: Fix `isSponsor` check in `fund.tsx` to verify current user specifically
- [ ] **Tiger #2**: Audit & fix auth token passing on fund page deposit-params fetch
- [ ] **Tiger #4**: Add invite revocation endpoint (nice-to-have but reduces risk)
- [ ] **Tiger #6**: Add clipboard copy feedback (toast)
- [ ] Rollback plan: sponsor removal (`DELETE /collaborators/:userId`) already exists
- [ ] Monitoring: log invite creation/acceptance events for abuse detection

---

## Improvement Recommendations

### Quick Wins (< 1 day each)
1. **Fix `isSponsor` logic** — return `{ isSponsor: boolean }` from `GET /collaborators` response, computed server-side
2. **Add invite revocation** — `DELETE /quests/:id/invite/:inviteId` for pending invites
3. **Copy feedback** — swap to `sonner` toast on clipboard copy
4. **Confirmation before accept** — show quest card + "Become a sponsor?" button before auto-firing API

### Medium Effort (2-3 days)
5. **Per-sponsor deposit view** — show each sponsor's deposit amount + status + txHash on the fund page
6. **Cap pending invites** — limit outstanding invites to 10 per quest
7. **Invite history** — show list of all generated invites (pending/accepted/expired) in a table for the owner

### Strategic (needs product decision)
8. **Sponsor approval for distribution** — multi-party approval before `distribute()` fires. Could be as simple as "Sponsor confirms distribution plan" button, or as complex as on-chain multi-sig.
9. **Sponsor self-exit** — `POST /quests/:id/leave` + trigger refund for their sub-escrow deposit
10. **Invite via email/Telegram** — send invite directly instead of sharing a link (reduces wrong-person risk)

---

## Unresolved Questions
1. Is the 5-sponsor cap a product decision or arbitrary? Should it be configurable per quest?
2. Should sponsors see each other's deposit amounts, or only their own + aggregate?
3. What's the intended UX if a sponsor wants out after depositing but before quest goes live?
