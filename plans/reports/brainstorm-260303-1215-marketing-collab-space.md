# Brainstorm: Marketing Collaboration Space in Monorepo

**Date:** 2026-03-03 | **Status:** Draft

---

## Problem Statement

ClawQuest (monorepo: api + dashboard + shared + contracts) can cho thanh vien marketing (non-dev) commit content vao repo. Ho dung LLM/Agent rieng (Claude, GPT, etc.) de viet va commit. Owner's agent can review, approve, coordinate hang ngay.

**Core tension:** Git la tool cho developer. Marketer khong biet git. Agent cua ho co the lam hong repo. Can mot cach don gian, an toan, LLM-friendly.

## Constraints

- Private GitHub repo (`leeknowsai/clawquest`)
- Monorepo voi code production (API, Dashboard, contracts)
- Marketer khong can biet git internals
- LLM/Agent cua marketer can instructions ro rang de commit dung
- Owner can biet khi co content moi, review, va approve/reject
- Khong duoc lam anh huong codebase (no merge conflicts voi code)

---

## Evaluated Approaches

### Option A: Marketing folder trong main repo, PR-based workflow

**Structure:**
```
marketing/
├── README.md                    # Huong dan cho LLM/Agent
├── GUIDELINES.md                # Naming, format, commit rules
├── templates/
│   ├── campaign-brief.md
│   ├── content-calendar.md
│   ├── social-post.md
│   ├── partnership-proposal.md
│   └── weekly-report.md
├── campaigns/
│   ├── 2603-testnet-launch/
│   │   ├── brief.md
│   │   ├── content-calendar.md
│   │   ├── assets/              # images, design files
│   │   └── posts/
│   │       ├── 260303-thread-intro.md
│   │       └── 260304-announcement.md
│   └── 2604-mainnet-prep/
├── content/
│   ├── blog/
│   ├── social/
│   │   ├── x-twitter/
│   │   ├── telegram/
│   │   └── discord/
│   └── email/
├── brand/
│   ├── voice-guide.md
│   ├── keywords.md
│   └── competitors.md
├── reports/
│   ├── weekly/
│   └── metrics/
└── inbox/                       # Unsorted ideas, drafts
    └── .gitkeep
```

**Workflow:**
1. Marketer's agent tao branch `marketing/<name>/<topic>`
2. Commit chi vao `marketing/` folder
3. Mo PR vao `main`
4. Owner's agent review PR, comment, approve/request changes
5. Merge khi approved

**Pros:**
- Don gian, dung Git nhu binh thuong
- CODEOWNERS bao ve code: owner phai approve moi file ngoai `marketing/`
- PR conversation la built-in review system
- Moi thu trong 1 repo, de search va reference
- GitHub notifications tu dong

**Cons:**
- Marketer's agent co the vo tinh edit files ngoai `marketing/` (rui ro chinh)
- Repo size tang theo thoi gian (dac biet images/assets)
- Marketing commits xuat hien trong git log chung voi code commits
- PR queue co the bi mix marketing + code PRs

**Risk mitigation:**
- CODEOWNERS: `* @owner` + `marketing/ @owner @marketer` -> moi PR can owner approve
- Branch protection: require PR, no direct push to main
- CI check: script kiem tra PR chi chua files trong `marketing/`
- `.gitattributes`: track large files voi Git LFS

**Verdict:** Practical nhat. Simple enough. Risks manageable.

---

### Option B: Separate repo cho marketing

**Structure:**
```
# Repo: leeknowsai/clawquest-marketing
marketing/
├── ... (same structure as Option A)
```

**Pros:**
- Zero risk lam hong codebase
- Clean git history cho moi ben
- Marketer co full write access, khong can PR workflow
- Repo size khong anh huong main project

**Cons:**
- 2 repos de manage = 2x overhead
- Cross-reference kho hon (marketing can reference product features, API docs)
- Owner phai switch context giua 2 repos
- Khong tan dung duoc `.claude/` config, hooks, rules da co
- Marketer's agent khong co context ve product (schema, features, etc.)
- Overkill cho team nho (< 5 nguoi)

**Verdict:** Over-engineered cho giai doan hien tai. Chi nen dung khi marketing team > 5 nguoi hoac repo size > 1GB.

---

### Option C: Git submodule cho marketing

**Pros:**
- Tach biet nhung van linked
- Marketing co repo rieng, main repo reference no

**Cons:**
- Submodules la DX nightmare (ngay ca developer con ghet)
- LLM/Agent xu ly submodules rat te
- Marketer se khong hieu submodule workflow
- Complexity khong xung dang voi benefit

**Verdict:** NO. Vi pham KISS nghiem trong. Khong bao gio.

---

### Option D: Notion/Google Docs + sync script

**Pros:**
- Marketer dung tool quen thuoc
- Khong can biet git

**Cons:**
- Mat single source of truth
- Sync script la maintenance burden
- Khong LLM-friendly (LLM lam viec tot voi files, khong tot voi Notion API)
- Owner's agent khong the review trong git workflow

**Verdict:** Off-topic. User muon git-native workflow.

---

## Final Recommendation: Option A (Marketing folder trong main repo)

### Ly do chon:

1. **KISS**: Mot repo, mot workflow, mot set of rules
2. **YAGNI**: Khong can separate repo khi team < 5 nguoi
3. **DRY**: Tan dung existing `.claude/` config, CLAUDE.md, va git hooks
4. **LLM-friendly**: Folder structure + README + templates = bat ky agent nao cung follow duoc
5. **Risk manageable**: CODEOWNERS + branch protection + CI check = 3 lop bao ve

---

## Implementation Details

### 1. Folder Structure (Recommended)

```
marketing/
├── README.md                         # Agent Instructions (THE key file)
├── GUIDELINES.md                     # Naming, format, review process
├── templates/
│   ├── campaign-brief.md
│   ├── content-calendar.md
│   ├── social-post-batch.md
│   ├── partnership-proposal.md
│   ├── weekly-report.md
│   └── competitor-analysis.md
├── campaigns/
│   └── YYMM-campaign-name/
│       ├── brief.md
│       ├── calendar.md
│       ├── assets/
│       └── posts/
│           └── YYMMDD-platform-topic.md
├── content/
│   ├── blog/
│   ├── social/
│   │   ├── x/
│   │   ├── telegram/
│   │   └── discord/
│   └── email/
├── brand/
│   ├── voice-guide.md
│   ├── keywords.md
│   ├── messaging-matrix.md
│   └── competitors.md
├── reports/
│   ├── weekly/
│   │   └── YYMMDD-weekly-report.md
│   └── metrics/
└── inbox/
    └── YYMMDD-author-idea-title.md
```

**Key decisions:**
- `YYMM` prefix cho campaigns (group theo thang)
- `YYMMDD` prefix cho posts/reports (sortable by date)
- `inbox/` cho unsorted ideas — agent co the dump vao day truoc
- `assets/` dung Git LFS cho images > 500KB
- Moi campaign la self-contained folder

### 2. README.md cho Marketing Agents (Core Document)

Day la file quan trong nhat. Bat ky LLM/Agent nao cua marketer cung PHAI doc file nay truoc khi lam gi.

**Content can co:**
```markdown
# Marketing Workspace — Agent Instructions

## WHO: Ban la ai?
Ban la marketing agent lam viec cho ClawQuest.
ClawQuest la quest platform voi crypto rewards.

## RULES (KHONG DUOC VI PHAM):
1. CHI duoc tao/edit files trong `marketing/` folder
2. KHONG BAO GIO edit files ngoai `marketing/`
3. KHONG BAO GIO commit truc tiep vao `main` branch
4. LUON tao branch voi ten: `marketing/<ten-nguoi>/<mo-ta-ngan>`
5. LUON mo Pull Request sau khi commit
6. Commit message format: `content: <mo ta>` hoac `marketing: <mo ta>`

## HOW: Workflow
1. git checkout main && git pull
2. git checkout -b marketing/<ten>/<topic>
3. Tao/edit files trong marketing/
4. git add marketing/
5. git commit -m "content: <mo ta>"
6. git push -u origin marketing/<ten>/<topic>
7. Tao PR voi title "[Marketing] <mo ta>"

## FILE NAMING:
- Posts: YYMMDD-platform-topic.md (vd: 260303-x-launch-thread.md)
- Reports: YYMMDD-weekly-report.md
- Campaigns: YYMM-ten-campaign/ (vd: 2603-testnet-launch/)

## FILE FORMAT:
- Dung Markdown (.md)
- Frontmatter YAML o dau file (xem templates/)
- Tieng Viet hoac English deu duoc
- Images: dat trong assets/ folder cua campaign

## TRUOC KHI COMMIT:
- [ ] Chi co files trong marketing/?
- [ ] Branch name dung format?
- [ ] Commit message dung format?
- [ ] Da dung template tuong ung?
```

**Design rationale:** Viet nhu dang noi chuyen voi AI agent. Menh lenh ro rang. Checklist cu the. Khong jargon.

### 3. Protection Layers (3 lop bao ve)

**Layer 1: CODEOWNERS** (`.github/CODEOWNERS`)
```
# Default: owner approves everything
* @leeknowsai

# Marketing folder: both owner and marketer team can review
# But owner still required for final merge (via branch protection)
/marketing/ @leeknowsai
```

**Layer 2: Branch Protection Rules**
- Require PR to merge into `main`
- Require at least 1 approval (from code owner)
- Require status checks to pass
- No direct push to `main`

**Layer 3: CI Check (GitHub Action)**
```yaml
# .github/workflows/marketing-pr-check.yml
name: Marketing PR Guard
on:
  pull_request:
    paths: ['marketing/**']

jobs:
  check-scope:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify PR only touches marketing/
        run: |
          FILES=$(gh pr diff ${{ github.event.pull_request.number }} --name-only)
          NON_MARKETING=$(echo "$FILES" | grep -v '^marketing/' || true)
          if [ -n "$NON_MARKETING" ]; then
            echo "ERROR: PR touches files outside marketing/"
            echo "$NON_MARKETING"
            exit 1
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Bonus Layer: Pre-commit hook suggestion trong README**
```bash
# Hook nay agent co the tu cai (optional)
# Kiem tra chi commit files trong marketing/
```

### 4. Branching Strategy

```
main (protected)
├── marketing/alice/testnet-campaign     # Alice's agent
├── marketing/bob/weekly-report-w10      # Bob's agent
├── marketing/carol/x-content-march      # Carol's agent
└── feat/some-code-feature               # Developer
```

**Rules:**
- Marketing branches: `marketing/<name>/<topic>`
- Dev branches: `feat/`, `fix/`, `docs/` (existing convention)
- Clear separation by prefix — easy to filter
- Stale branches: auto-delete after merge (GitHub setting)
- **KHONG co marketing branch chung** — moi nguoi branch rieng, tranh conflict

### 5. Owner's Agent Review Workflow

Owner's agent can dung daily/hourly:

**Scan script (co the chay tu dong hoac khi can):**
```bash
# List open marketing PRs
gh pr list --label marketing --state open

# Or by branch prefix
gh pr list --head "marketing/" --state open

# Review a specific PR
gh pr view <number> --comments
gh pr diff <number>

# Approve
gh pr review <number> --approve --body "LGTM"

# Request changes
gh pr review <number> --request-changes --body "Can sua X, Y, Z"
```

**Review checklist cho owner's agent:**
1. PR chi chua files trong `marketing/`?
2. Content co dung brand voice? (reference `marketing/brand/voice-guide.md`)
3. Naming convention dung?
4. Template duoc su dung dung?
5. Khong co thong tin nhay cam (API keys, internal metrics)?

**Auto-label:** GitHub Action tu dong gan label `marketing` cho PR tu branch `marketing/*`

### 6. Templates

**Campaign Brief Template:**
```markdown
---
title: "[Campaign Name]"
author: "[Name]"
date: YYYY-MM-DD
status: draft | review | approved | active | completed
platform: x | telegram | discord | multi
budget: "$X"
timeline: "YYYY-MM-DD to YYYY-MM-DD"
---

# [Campaign Name]

## Objective
[1-2 cau mo ta muc tieu]

## Target Audience
- [Audience 1]
- [Audience 2]

## Key Messages
1. [Message 1]
2. [Message 2]

## Content Plan
| Date | Platform | Type | Topic | Status |
|------|----------|------|-------|--------|
| | | | | |

## KPIs
- [ ] [Metric 1]: [Target]
- [ ] [Metric 2]: [Target]

## Budget Breakdown
| Item | Cost |
|------|------|
| | |

## Notes
[Ghi chu them]
```

**Social Post Batch Template:**
```markdown
---
title: "[Batch Name]"
author: "[Name]"
date: YYYY-MM-DD
platform: x | telegram | discord
campaign: "[Campaign folder name]"
status: draft | approved | posted
---

# [Batch Name]

## Post 1
**Time:** YYYY-MM-DD HH:MM (UTC+7)
**Type:** tweet | thread | quote-tweet | poll

### Content
[Noi dung post]

### Media
- [ ] Image: [mo ta hoac filename trong assets/]

### Notes
[Hashtags, mentions, links trong reply]

---

## Post 2
...
```

**Weekly Report Template:**
```markdown
---
title: "Weekly Report — Week [N]"
author: "[Name]"
date: YYYY-MM-DD
period: "YYYY-MM-DD to YYYY-MM-DD"
---

# Weekly Report — Week [N]

## Highlights
- [Achievement 1]
- [Achievement 2]

## Metrics
| Metric | Last Week | This Week | Change |
|--------|-----------|-----------|--------|
| Followers | | | |
| Engagement Rate | | | |
| Impressions | | | |
| Link Clicks | | | |

## Content Published
| Date | Platform | Type | Topic | Performance |
|------|----------|------|-------|-------------|
| | | | | |

## Learnings
- [Insight 1]
- [Insight 2]

## Next Week Plan
- [ ] [Task 1]
- [ ] [Task 2]

## Blockers / Requests
- [Blocker 1]
```

---

## Honest Trade-off Assessment

### Dieu se hoat dong tot:
- LLM/Agent doc README va follow instructions: **kha nang cao** (cac model hien tai rat tot viec nay)
- CODEOWNERS chan edit code: **dam bao** (GitHub enforce)
- PR workflow cho review: **proven pattern**
- File-based content: **LLM-native** (markdown la format tot nhat cho AI)

### Dieu co the gap van de:

| Risk | Xac suat | Impact | Mitigation |
|------|----------|--------|-----------|
| Agent commit files ngoai marketing/ | Medium | Low (PR blocked by CODEOWNERS) | CI check + CODEOWNERS |
| Merge conflicts trong marketing/ | Low | Low (moi nguoi branch rieng, content khong overlap) | Branch naming convention |
| Agent tao branch name sai | Medium | Low (PR van tao duoc, chi mat naming consistency) | README instructions ro rang |
| Marketer khong biet dung git | High | Medium | Agent lam het — marketer chi can noi "viet post ve X" |
| Repo size tang do images | Medium | Medium | Git LFS cho images > 500KB |
| PR queue bi mix code + marketing | Low | Low | Label `marketing` + filter |
| Agent commit secrets/sensitive data | Low | High | `.gitignore` patterns + review checklist |
| Marketing content quality thap | Medium | Medium | Brand voice guide + review process |

### Brutal honesty:

1. **Marketer KHONG CAN biet git.** Agent cua ho lam het. Marketer chi can noi "viet 5 post ve testnet launch" va agent se tao branch, commit, mo PR. Day la dieu tot.

2. **Van de chinh la AGENT QUALITY, khong phai WORKFLOW.** Neu marketer dung GPT-3.5 hoac agent config te, output se te. README tot giup nhieu, nhung khong the fix bad agent.

3. **Review bottleneck la co that.** Neu 3 marketer submit 5 PRs/ngay, owner phai review 15 PRs/ngay. Owner's agent co the auto-approve nhung PRs don gian (chi markdown, dung template, trong marketing/ folder), va chi flag nhung cai can human review.

4. **Option A la "good enough".** Option B (separate repo) chi can thiet khi team > 5 nguoi hoac marketing content > 500 files. Hien tai, overkill.

5. **Git LFS la MUST neu co images.** Khong co LFS, repo se phinh to va clone cham. Config ngay tu dau.

---

## Success Metrics

- Marketer's agent co the tao PR dung format trong < 5 phut sau khi doc README
- 0 PRs edit files ngoai `marketing/` (CI check pass rate = 100%)
- Owner review time < 10 phut/PR
- Naming convention compliance > 90%
- Khong co merge conflicts trong 30 ngay dau

## Next Steps

1. Tao `marketing/` folder structure
2. Viet `marketing/README.md` (Agent Instructions)
3. Viet `marketing/GUIDELINES.md`
4. Tao templates trong `marketing/templates/`
5. Setup `.github/CODEOWNERS`
6. Setup branch protection rules
7. (Optional) Tao GitHub Action cho marketing PR check
8. (Optional) Setup Git LFS cho images
9. Test workflow: thu dung 1 LLM agent lam marketer de verify

## Unresolved Questions

1. **So luong marketer hien tai va du kien?** Neu > 5, can reconsider Option B.
2. **Co can Git LFS khong?** Marketer co commit images/videos khong, hay chi markdown?
3. **Auto-approve cho PRs don gian?** Owner muon review tat ca hay chi flag nhung cai can attention?
4. **Marketer access level?** `Write` access (can push branch) hay `Triage` (chi mo issue, agent push qua fork)?
5. **Communication channel?** PR comments du hay can Telegram/Discord notification khi co PR moi?
6. **Tieng Viet hay English cho templates?** README nen bilingual hay chi 1 ngon ngu?

---

*Report generated by brainstormer agent. Recommend proceeding with Option A after resolving unresolved questions.*

## References

- [GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS best practices](https://dev.to/eunice-js/a-comprehensive-guide-to-codeowners-in-github-22ga)
- [Git repository structure best practices](https://medium.com/code-factory-berlin/github-repository-structure-best-practices-248e6effc405)
