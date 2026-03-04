---
name: update-log
description: Summarize session work and update workflow/decisions logs. Use when user says "update log", "ghi log", or at end of a work session.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Summarize what was done in this session and update the personal logs:

1. Read `docs/WORKFLOW-LOG.md` and `docs/DECISIONS-LOG.md`
2. Append today's work summary to `docs/WORKFLOW-LOG.md` under today's date heading (format: `## YYYY-MM-DD`). Include: tasks worked on, files changed, key outcomes. Keep entries concise — bullet points only.
3. If any technical or design decisions were made this session, append them to `docs/DECISIONS-LOG.md` under today's date heading. Skip if no decisions were made.
4. Do NOT duplicate entries if today's date section already exists — append to it instead.
5. Respond in Vietnamese.
