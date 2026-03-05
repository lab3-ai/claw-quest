# BD & Marketing Team Rules

> These rules apply when working with BD/Marketing team members on business development, marketing, content, and growth tasks.
> Maintained by: BD/Marketing Team Lead
> This file exists in both `.agent/rules/` (Antigravity) and `.claude/rules/` (Claude Code).
> When editing, update BOTH copies.

## Scope

Apply these rules when the user:
- Works on marketing, BD, content, growth, or outreach tasks
- Asks in Vietnamese, English, or mixed (Anh-Việt)
- Requests skill discovery for non-technical/business tasks

## Language Support

The user may communicate in:
- **Tiếng Việt**: "tìm skill cho viết content", "tôi cần làm outreach KOL"
- **English**: "find a skill for social media", "I need to do competitor analysis"
- **Mixed**: "tôi cần skill cho email marketing", "help tôi tìm tool cho copywriting"

Always respond in the same language the user uses.

## Enhanced Skill Discovery (augments find-skills)

> **PATH setup**: On macOS (Homebrew), run `eval "$(/opt/homebrew/bin/brew shellenv)"` once at the start of your session before any `npx` commands if you encounter `command not found`.

**ACTIVATION CONDITION**: Only run this skill-discovery flow when the user **explicitly asks** to find, check, or install skills (e.g. "tìm skill", "kiểm tra skill", "cài thêm skill", "find skills", "what skills do I need"). Do NOT trigger this flow for regular marketing/BD work questions.

### Step 1: Scan Local Skills

Check what's already installed in BOTH locations:

```bash
echo "=== Claude Code ===" && ls .claude/skills/ 2>/dev/null
echo "=== Antigravity ===" && ls .agent/skills/ 2>/dev/null
```

### Step 2: Detect Missing Skills Across IDEs

**YOU MUST RUN THIS SCRIPT. DO NOT SKIP THIS STEP.**

Run these exact commands to find skills that exist in one IDE but not the other:

```bash
echo "--- Skills in Claude Code but NOT in Antigravity ---"
for skill in .claude/skills/*/SKILL.md; do
  name=$(dirname "$skill" | xargs basename)
  [ ! -e ".agent/skills/$name" ] && echo "⚠️  $name"
done
echo "--- Skills in Antigravity but NOT in Claude Code ---"
for skill in .agent/skills/*/SKILL.md; do
  name=$(dirname "$skill" | xargs basename)
  [ ! -e ".claude/skills/$name" ] && echo "⚠️  $name"
done
```

You MUST collect the output. You will use it in Step 4.

### Step 3: Search Remote Skills

Run multiple searches in parallel for 3-10 relevant options:

```bash
npx skills find [keyword1]
npx skills find [keyword2]
```

For BD/Marketing tasks, use these category mappings:

| User Says (VI/EN) | Search Keywords |
|---|---|
| viết copy, copywriting | copywriting, content-writing |
| outreach KOL, influencer | outreach, influencer, kol |
| phân tích đối thủ, competitor analysis | competitor, analysis, research |
| social media, mạng xã hội | social-media, twitter, linkedin |
| email marketing | email, newsletter, drip |
| landing page, trang đích | landing-page, conversion |
| SEO, tối ưu tìm kiếm | seo, search-optimization |
| content strategy, chiến lược nội dung | content-strategy, editorial |
| brand, thương hiệu | branding, brand-guidelines |
| growth, tăng trưởng | growth, acquisition, retention |
| brainstorm, lên ý tưởng | brainstorm, ideation |
| research, nghiên cứu | research, market-research |
| presentation, thuyết trình | presentation, pitch-deck |
| project management, quản lý dự án | project-management, kanban |

### Step 4: Present ALL Options in One Numbered Table

**YOU MUST USE EXACTLY THIS TABLE FORMAT. DO NOT SIMPLIFY, DO NOT USE A PLAIN LIST.**

Combine ALL findings from Step 1, 2, and 3 into this exact 3-section table:

```markdown
## Skills cho [task description]

### ✅ Đã có ở cả 2 IDE (không cần cài):
| # | Skill | Mô tả |
|---|-------|--------|
| 1 | [skill name] | [one-line description] |

### ⚠️ Có ở 1 IDE, cần copy sang IDE còn lại:
| # | Skill | Có ở | Thiếu ở |
|---|-------|------|---------|  
| 2 | [skill name] | Claude Code | Antigravity |

### 🔍 Chưa có trong project, có thể cài từ remote:
| # | Skill | Source | Mô tả |
|---|-------|--------|--------|
| 3 | [skill name] | [owner/repo] | [one-line description] |

Bạn muốn cài/copy skill nào? (nhập số, ví dụ: 2,3)
```

**RULES FOR THIS TABLE:**
- Each section MUST be present. If a section has 0 items, write "Không có" under it.
- Every item MUST have a unique number starting from 1.
- The table MUST end with the question: "Bạn muốn cài/copy skill nào? (nhập số)"

### Step 5: STOP — Wait for User Confirmation

**CRITICAL INSTRUCTION — DO NOT SKIP OR BYPASS**:
- You MUST **STOP** completely after presenting the table above.
- **DO NOT** run `npx skills add`, `cp -r`, or ANY other command.
- **DO NOT** proceed to Step 6.
- Wait for the user to reply with their number selection.
- ONLY continue after the user **explicitly replies** with which skills to install.

### Step 6: Install/Copy (Only After User Replied)

**IMPORTANT RULES FOR INSTALLATION:**
- **NEVER** use the `-g` flag (global install). Skills must stay project-level.
- **ALWAYS** use `--copy` flag (no symlinks).
- **ALWAYS** install to BOTH IDEs with `-a claude-code -a antigravity`.

**For NEW skills** (from remote 🔍), run this exact command:

```bash
npx skills add <source> --skill <name> -a claude-code -a antigravity --copy -y
```

**For EXISTING skills** that need copying between IDEs (⚠️):

```bash
# Claude Code → Antigravity:
cp -r .claude/skills/<name> .agent/skills/<name>
# Antigravity → Claude Code:
cp -r .agent/skills/<name> .claude/skills/<name>
```

After every install/copy, run verification:

```bash
ls .claude/skills/<skill-name>/SKILL.md && echo "Claude Code ✅"
ls .agent/skills/<skill-name>/SKILL.md && echo "Antigravity ✅"
```

## BD/Marketing Skill Recommendations

For common BD/Marketing tasks, proactively suggest these skill combinations:

| Task (EN) | Task (VI) | Recommended Skills |
|---|---|---|
| Campaign launch | Ra mắt chiến dịch | copywriting + research + brainstorm |
| KOL outreach | Outreach KOL | research + copywriting |
| Competitor analysis | Phân tích đối thủ | research + brainstorm |
| Content calendar | Lịch content | project-management + copywriting |
| Landing page copy | Viết copy landing page | copywriting + web-design-guidelines |
| Growth strategy | Chiến lược tăng trưởng | brainstorm + research |
| Pitch deck | Thuyết trình dự án | presentation + brainstorm |
