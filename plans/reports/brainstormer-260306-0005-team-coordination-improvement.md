# Team Coordination Improvement — Brainstorm Report

**Date:** 2026-03-06  
**Author:** brainstormer  
**Context:** Team of 6 (Brian/PO, Ryan, Vincent, Ray, Hiru, Chalee + thomasle-vn) stopped following Plan → Code workflow on March 4-5. No plans created, changelog not updated.

---

## Problem Statement

Starting March 4, the team shipped ~40 commits across all members with zero plans in `plans/` and no changelog updates. The workflow broke down at the most critical enforcement point: **nothing stops anyone from coding without a plan**.

Root causes:
1. **No hard gate** — rules.md says to create a plan but nothing enforces it
2. **Plans are optional friction** — when AI sessions are short/focused, members skip straight to code
3. **Changelog is manual and last** — gets forgotten when session ends
4. **No shared "what's been done" signal** — other LLM sessions can't catch up without reading git log

---

## What the Ideal Workflow Looks Like

```
Pull main → Brainstorm/Plan → Lead approves → Code → Changelog entry → PR → Merge
```

The team collapsed this to:

```
Pull branch → Code → PR → Merge
```

---

## Analysis: What Each Member Skipped

| Member | Commits (Mar 4-5) | Plan created | Changelog updated |
|--------|-------------------|--------------|-------------------|
| Hiru | Design system v3, Stripe merge, branding, theme switcher | No | No |
| Vincent | Testnet quest, chain RPC, escrow poller, nullable userId | No | No |
| Ray | QuestList view toggle, dashboard layout | No | No |
| thomasle-vn | Account page, Dockerfile, chain RPC, escrow contract | No | No |
| Ryan | Stripe Connect | No | No |
| Chalee | Unit tests (auth, quests, stripe) | No | No |

Pattern: Everyone skipped together. This is a systemic issue, not individual negligence.

---

## Solution Options

### Option A — CLAUDE.md Enforcement (Lowest friction, highest impact)

**Approach:** Add a mandatory checklist to `CLAUDE.md` that every LLM session reads at startup. Make the plan creation step explicit and non-skippable in AI instructions.

Current `CLAUDE.md` team section says: "ALWAYS read `.team/ACTIVE.md` before making any code changes"

Add a stronger directive:

```markdown
## MANDATORY: Before Any Code Change
1. Check if a plan exists in `plans/` for this task
2. If NO plan exists → STOP, create plan first via `/plan` or brainstormer
3. If plan exists → proceed with implementation
4. After implementation → update `docs/CHANGELOG.md` before PR
```

Also add to `.team/rules.md` in Vietnamese (since that's the team language there):

```
## QUAN TRỌNG: Quy trình bắt buộc
0. Tao plan trong `plans/` trước khi code bất cứ thứ gì
   - Nếu task nhỏ (< 30 phút): tạo minimal plan (1 file, ~20 lines)
   - Nếu task lớn: dùng `/plan` command
```

**Pros:** Zero tooling, works immediately, AI agents read CLAUDE.md  
**Cons:** Still honor-system — determined humans can skip

---

### Option B — Lightweight Session Log as PR Requirement

**Approach:** Every PR must include a session log entry in `.team/sessions/`. No log = no merge. Lead enforces during PR review.

Session log format (minimal, 10 lines max):
```markdown
# Session: {name} — {date}
- Task: what was done
- Plan: link to plans/ file (or "quick-fix: no plan needed")
- Changelog: [x] updated / [ ] not needed (why)
- Files changed: list key files
```

This creates a paper trail without heavyweight process. The key insight: **making the session log a PR prerequisite** means the plan link is checked at merge time, not code time.

**Pros:** Reviewable, creates audit trail, forces reflection before merge  
**Cons:** Requires lead discipline to enforce at PR review; session logs in `.team/sessions/` currently empty (no established habit)

---

### Option C — Tiered Plan Requirement (RECOMMENDED)

**Approach:** Not every task needs a full plan. Define tiers so small fixes don't get blocked:

| Tier | Criteria | Required artifact |
|------|----------|-------------------|
| Quick fix | Bug fix, 1 file, < 1 hour | Just a commit message + changelog line |
| Feature | New functionality, multiple files | Minimal plan (1 file in `plans/`) |
| Major | DB schema change, new module, cross-team | Full plan with phases |

Add this table to both `CLAUDE.md` and `.team/rules.md`.

The key addition to CLAUDE.md AI instructions:
```
Before coding, classify the task tier. If Feature or Major: run /plan first.
After finishing: add entry to docs/CHANGELOG.md before creating PR.
```

**Pros:** Practical, reduces false friction for small fixes, scalable  
**Cons:** "Quick fix" can be abused — needs clear criteria

---

## Recommended Approach: Option C + Option B Partial

Combine:
1. **Tier system** in `CLAUDE.md` + `rules.md` — clarifies when to plan
2. **Session log** as soft PR requirement — `.team/sessions/{name}-{date}.md` linked in PR description
3. **Changelog update** becomes step in the tier definition (all tiers except tiny hotfixes)

---

## Specific Instructions for Each Team Member

This is the "dặn dò ae" part. Practical, direct:

**To all members (add to `.team/rules.md`):**
```
Trước khi bắt đầu session mới:
- Đọc CLAUDE.md (phần Team section) 
- Đọc docs/CHANGELOG.md để biết version hiện tại
- Nếu task là feature/refactor lớn → tạo plan trong plans/ trước
- Sau khi xong → update docs/CHANGELOG.md rồi mới tạo PR
```

**For AI assistants (add to `CLAUDE.md`):**
```markdown
## Session Checklist (AI MUST follow)
Before writing any code:
- [ ] Read .team/ACTIVE.md
- [ ] Classify task: quick-fix / feature / major
- [ ] If feature or major: create plan in plans/ first
- [ ] Note current changelog version in docs/CHANGELOG.md

After implementation:
- [ ] Update docs/CHANGELOG.md with what changed
- [ ] Remind user to create session log in .team/sessions/
- [ ] Remind user to tag reviewer in PR
```

---

## Changelog Enforcement Specifically

The changelog stopped at v0.12.1 (March 4). Meanwhile ~40 commits happened. To prevent this:

1. Add version bump reminder to `rules.md` — changelog update is part of "Sau khi code" section
2. Keep versioning simple: minor bump (0.12.x) for fixes/small features, major bump (0.13.0) for new modules
3. Lead (Brian/hd) should do a catch-up entry for March 4-5 changes before March 7 — group by member

**Catch-up format suggestion:**
```markdown
## v0.13.0 — Design System v3 + Stripe Connect + Chain Registry (2026-03-05)
### Design (Hiru)
- [New] Design system v3 terminal edition...
### Backend (Vincent)
- [New] Per-chain polling control in escrow poller...
```

---

## What NOT to Do

- **Don't add CI/CD git hooks** that enforce plans — too much friction, kills velocity
- **Don't require plan approval for every task** — slows down individual members working in parallel
- **Don't create a new tool/system** — team already has the right structure, it's a habit problem

---

## Summary

The core fix is 3 lines added to `CLAUDE.md` + `rules.md`:

1. Classify task before coding (tier system)
2. Create plan if feature/major (link in session log)
3. Update changelog before PR (non-negotiable)

The enforcement mechanism is: **Lead checks session log exists when reviewing PR**. Simple, visible, no tooling needed.

---

## Unresolved Questions

1. Who owns the catch-up changelog for March 4-5 commits? (Brian/hd or each member?)
2. Should `thomasle-vn` be added to `.team/ownership.md`? He has active commits touching escrow + chain registry.
3. Should there be a minimum PR description template in GitHub? (Would surface missing plan link naturally)
4. Does the team want version bumps to be semantic (feature = minor, fix = patch) or freeform?
