---
name: Hiru command aliases
description: When Hiru says these phrases, execute the corresponding skill/action immediately without asking
type: feedback
---

When Hiru says these phrases, execute immediately — don't ask for confirmation:

| Phrase | Action |
|--------|--------|
| "dau phien" | Run `/hiru-dau-phien` skill |
| "ket phien" | Run `/hiru-ket-phien` skill |
| "sync main" | Merge main↔hiru-uiux both ways, push both |
| "update demo" | Run `/update-demo` |
| "update log" | Run `/update-log` |
| "update status" | Run `/update-status` |

**Why:** Hiru expects these as shortcuts — asking "do you want me to X?" wastes time. Just do it.

**How to apply:** When any of these phrases appear in user message, execute the action immediately. For "sync main": commit pending changes, merge hiru-uiux→main, push main, then rebase hiru-uiux on main if needed.
