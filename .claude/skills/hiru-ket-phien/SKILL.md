---
name: hiru-ket-phien
description: End-of-session ritual — commit, update logs/status, sync hiru↔main both ways, suggest tomorrow plan. Use when user says "ket phien", "end session", "kết phiên".
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

End-of-session workflow for Hiru (UI/UX branch `hiru-uiux`).

## Steps

1. **Check uncommitted changes:**
   - Run `git status --short` and `git diff --stat`
   - If uncommitted changes exist: list them and ASK user what to commit
   - Do NOT auto-commit — wait for user confirmation

2. **Update logs** (call skills in sequence):
   - Run `/update-log` — summarize session into WORKFLOW-LOG + DECISIONS-LOG
   - Run `/update-status` — update STATUS.md with current progress

3. **Sync both ways (hiru↔main):**
   ```
   git checkout main && git pull --ff-only origin main
   git merge hiru-uiux --no-edit && git push origin main
   git checkout hiru-uiux && git merge main --no-edit
   git push origin hiru-uiux
   ```
   - If merge conflict: STOP, report conflicts, let user resolve
   - Always end on `hiru-uiux`

4. **Suggest tomorrow plan:**
   - Read `docs/design-system/HIRU-PLAN.md`
   - Read today's WORKFLOW-LOG entry
   - Suggest 3-5 bullet points for next session based on:
     - Unfinished tasks from today
     - Next items in HIRU-PLAN
     - Any blockers to flag to team
   - Present as suggestion, don't auto-edit HIRU-PLAN

5. **Final report** in Vietnamese:
   - What was committed today
   - Branch sync status
   - Tomorrow's suggested focus

## Rules
- Never force-push
- Never auto-commit without user confirmation
- If merge fails, stop and report — don't auto-resolve
- Always end on `hiru-uiux` branch
- Respond in Vietnamese
