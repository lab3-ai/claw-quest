---
name: hiru-dau-phien
description: Start-of-session ritual — fetch, sync main→hiru-uiux, scan team plans, suggest HIRU-PLAN updates. Use when user says "dau phien", "start session", "bắt đầu phiên".
allowed-tools: Bash, Read, Edit, Grep, Glob
---

Start-of-session workflow for Hiru (UI/UX branch `hiru-uiux`).

## Steps

1. **Fetch & sync main→hiru-uiux:**
   ```
   git fetch origin
   git checkout main && git pull --ff-only origin main
   git checkout hiru-uiux && git merge main --no-edit
   git push origin hiru-uiux
   ```
   - If merge conflict: STOP, report conflicts, let user resolve

2. **Scan team activity:**
   - Read `.team/ACTIVE.md` — check who is working on what
   - Run `git log --oneline -10 origin/main` — see recent commits from other team members
   - Flag any commits that touch UI/styles/components (potential conflicts)

3. **Check team plans:**
   - Scan `plans/` for any new or updated plans since last session
   - Check if any plan involves files Hiru owns (styles, components/ui, design-system docs)

4. **Read current HIRU-PLAN:**
   - Read `docs/design-system/HIRU-PLAN.md`
   - Compare with what was done in recent commits and team activity

5. **Suggest HIRU-PLAN updates:**
   - If new blockers or dependencies from team → suggest adding to HIRU-PLAN
   - If tasks completed by others unblock Hiru's work → flag them
   - Present as bullet list, don't auto-edit

6. **Report summary** in Vietnamese:
   - Branch status (ahead/behind)
   - Team changes that affect UI/UX
   - Today's suggested focus from HIRU-PLAN

## Rules
- Never force-push
- If merge fails, stop and report — don't auto-resolve
- Always end on `hiru-uiux` branch
- Respond in Vietnamese
