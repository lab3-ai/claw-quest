# BD & Marketing Team Rules

> These rules apply when working with BD/Marketing team members on business development, marketing, content, and growth tasks.
> Maintained by: BD/Marketing Team Lead
> Primary IDE: Antigravity | Secondary: Claude Code (via symlink)

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

When the user asks for help with a task and skills might be useful, follow this enhanced flow:

### Step 1: Scan Local Skills First

Before searching remotely, check what's already installed:

```bash
ls .claude/skills/    # or .agent/skills/ for Antigravity
```

List any locally installed skills that are relevant to the user's task.

### Step 1.5: Link Existing Claude Code Skills to Antigravity

After scanning, check if any relevant skills exist in `.claude/skills/` but are **missing** from `.agent/skills/`:

```bash
# Find skills in Claude Code that are NOT linked to Antigravity
for skill in .claude/skills/*/SKILL.md; do
  name=$(dirname "$skill" | xargs basename)
  if [ ! -e ".agent/skills/$name" ]; then
    echo "⚠️  $name — in Claude Code, NOT in Antigravity"
  fi
done
```

If relevant skills are found, offer to link them:

```markdown
### ⚠️ Có sẵn trong Claude Code nhưng chưa link sang Antigravity:
| # | Skill | Action |
|---|-------|--------|
| 1 | copywriting | Tạo symlink để dùng trong Antigravity |
| 2 | research | Tạo symlink để dùng trong Antigravity |

Bạn muốn link skill nào sang Antigravity? (nhập số)
```

When user confirms, create symlinks:

```bash
ln -s ../../.claude/skills/<skill-name> .agent/skills/<skill-name>
```

**NOTE**: This does NOT copy files — just creates a symlink so Antigravity reads from the same source of truth in `.claude/skills/`.

### Step 2: Search Remote Skills

Run multiple search queries to find 3-10 relevant options:

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

### Step 3: Present Options as Numbered Table

Always present results in a table with at least 3 options (max 10):

```markdown
## Skills cho [task description]

### ✅ Đã có trong project:
| # | Skill | Mô tả |
|---|-------|--------|
| 1 | copywriting | Conversion copywriting formulas, AIDA, PAS... |

### 🔍 Có thể cài thêm:
| # | Skill | Source | Mô tả |
|---|-------|--------|--------|
| 2 | social-media-pro | vercel-labs/skills | Social media content... |
| 3 | kol-outreach | community/skills | KOL discovery and... |

Bạn muốn cài skill nào? (nhập số, ví dụ: 2,3)
```

### Step 4: Wait for Confirmation

**CRITICAL**: NEVER auto-install. Always wait for user to confirm by number selection.

### Step 5: Install to Project (Both IDEs)

When user confirms, install for this project to both IDEs:

```bash
npx skills add <source> --skill <name> -a claude-code -a antigravity -y
```

After installation, verify:
```bash
ls -la .claude/skills/<skill-name>/
ls -la .agent/skills/<skill-name>/
```

### Step 6: Reverse Symlink if Needed

Since source of truth is `.claude/skills/`, check the symlink direction:
- If the CLI created canonical in `.agents/skills/`, reverse it:
  - Move real files to `.claude/skills/<name>/`
  - Create symlink: `.agent/skills/<name>/ → ../../.claude/skills/<name>/`
  - Remove `.agents/skills/<name>/` if empty

## BD/Marketing Skill Recommendations

For common BD/Marketing tasks, proactively suggest these skill combinations:

| Task | Recommended Skills |
|------|-------------------|
| Campaign launch | copywriting + research + brainstorm |
| KOL outreach | research + copywriting |
| Competitor analysis | research + brainstorm |
| Content calendar | project-management + copywriting |
| Landing page copy | copywriting + web-design-guidelines |
| Growth strategy | brainstorm + research |
| Pitch deck | presentation + brainstorm |
