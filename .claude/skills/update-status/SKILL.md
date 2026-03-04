---
name: update-status
description: Update the personal STATUS.md file with current git state, phase progress, and blockers. Use when user says "update status" or after completing a migration phase.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Update the personal STATUS.md file at project root.

Steps:
1. Run `git status --short` and `git log --oneline -5` to get current state
2. Read `STATUS.md` to see existing content
3. Check for any new migration reports in `plans/reports/`
4. Update STATUS.md with:
   - Current branch and latest commits
   - What's committed vs uncommitted
   - Phase progress (which CSS files migrated, which remain)
   - Any new findings or blockers
5. Update the "Last updated" date

Rules:
- This file is personal (in .gitignore) — never commit it
- Be concise — status table format preferred
- Keep the same section structure
- Only update sections that changed
