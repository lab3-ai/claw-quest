# GitHub Bounty — Brainstorm Report

**Date:** 2026-03-11 | **Branch:** github

## Problem Statement

Repo owners want help distributing bounties for their GitHub issues/PRs. Manual bounty creation is tedious — they don't know what to prioritize or how much to pay. ClawQuest can use LLM to analyze their repo and suggest bounties automatically.

**Target users:** Repo owners (human), code contributors (human + AI agents)

## Evaluated Approaches

### Why NOT extend existing quest system
- Current quest = agent competition with social tasks
- GitHub Bounty = code contribution incentive with different UX, data model, reward logic
- Mixing concerns creates complexity; independent module = cleaner, shippable faster

### Why Code Bounty over Star/Fork rewards
- GitHub ToS explicitly prohibits "activities incentivized by rewards such as cryptocurrency"
- Stars/forks = ToS violation risk → account bans
- Code contributions (PR, issue fix) = legitimate, verifiable, valuable

### Competitive landscape
| | Algora | OnlyDust | **ClawQuest** |
|---|---|---|---|
| AI agents | ❌ | ❌ (banned) | ✅ native |
| LLM_KEY reward | ❌ | ❌ | ✅ unique |
| LLM-assisted creation | ❌ | ❌ | ✅ differentiator |
| On-chain escrow | Partial | No | ✅ trustless |
| Multi-chain USDC | ❌ | ❌ | ✅ Base+BNB |

## Final Architecture

### Data Models (independent from Quest system)

```prisma
model GitHubBounty {
  id            String    @id @default(uuid())
  creatorUserId String
  repoOwner     String    // "facebook"
  repoName      String    // "react"
  issueNumber   Int?      // optional link to specific issue
  issueUrl      String?   // https://github.com/owner/repo/issues/123
  title         String
  description   String
  rewardAmount  Decimal
  rewardType    String    // USDC | LLM_KEY
  status        String    // draft | live | completed | cancelled
  questType     String    // fcfs | leaderboard
  maxWinners    Int       @default(1)
  deadline      DateTime?
  createdAt     DateTime  @default(now())
  submissions   GitHubBountySubmission[]
}

model GitHubBountySubmission {
  id        String   @id @default(uuid())
  bountyId  String
  userId    String?  // human
  agentId   String?  // or agent
  prUrl     String   // https://github.com/owner/repo/pull/123
  prNumber  Int
  status    String   // pending | approved | rejected
  createdAt DateTime @default(now())
}
```

User model additions: `githubId String?`, `githubHandle String?`, `githubAccessToken String?`

### API Module (new, independent)

```
apps/api/src/modules/github-bounty/
├── github-bounty.routes.ts       # REST endpoints
├── github-bounty.service.ts      # business logic
└── github-rest-client.ts         # GitHub API calls

apps/api/src/modules/auth/
└── github-auth.routes.ts         # /auth/github/authorize + callback (new)
```

### Dashboard Routes (new)

```
/github-bounties              → explore bounties (public)
/github-bounties/new          → create bounty wizard (protected)
/github-bounties/$bountyId    → bounty detail + submit PR (public)
/github-bounties/mine         → my bounties as creator
```

### Full Creation Flow

```
1. Creator enters repo URL
2. API tries GitHub API (public) → if 403 → prompt "Connect GitHub"
3. GitHub OAuth (scope: repo) → store githubAccessToken
4. POST /github-bounty/analyze-repo
   → GitHub API fetches: README, open issues (top 20), languages, CONTRIBUTING.md
   → Send to Claude (via llm-server) with structured prompt
   → Returns: [{ title, description, issueNumber?, suggestedReward, difficulty, rewardType }]
5. Creator sees checkbox list of suggestions → selects + edits → bulk create
6. Fund escrow (USDC) or skip (LLM_KEY)
7. Bounty live
```

### PR Submission & Verification Flow

```
Submitter links GitHub via OAuth (/auth/github/authorize, scope: read:user)
→ POST /github-bounties/:id/submit { prUrl }
→ API: parse PR number from URL
→ GitHub API: GET /repos/{owner}/{repo}/pulls/{number}
→ Verify: pr.user.login === submitter.githubHandle
→ Store submission as "pending"
→ Creator approves/rejects via dashboard
→ On approve: escrow.distribute(submitter.walletAddress, amount)
```

### LLM Prompt Design

Input to Claude:
```
Repo: {owner}/{name}
Stars: {n} | Language: {lang} | Description: {desc}
Open issues (sorted by reactions):
  #123 [bug] Memory leak in useEffect (47 👍) - {body_truncated}
  #456 [docs] Add TypeScript examples (23 👍)
  ...
README summary: {first_500_chars}

Suggest 5-8 GitHub bounties this repo owner could create to attract contributors.
For each: title, description, issueNumber (if applicable), difficulty (easy/medium/hard),
suggestedReward (USD), rewardType (USDC for complex tasks, LLM_KEY for AI-friendly tasks).
Return JSON array.
```

### Shared Infrastructure (reused, not modified)

- Auth middleware (JWT + agent API keys)
- Escrow contract + distribute function
- LLM server (`POST /api/v1/keys` for LLM_KEY rewards)
- User auth (Supabase)
- Prisma/PostgreSQL

## Implementation Phases

### Phase 1 — MVP (est. 2 weeks)
- [ ] DB migration: GitHubBounty, GitHubBountySubmission, User fields
- [ ] GitHub OAuth flow (/auth/github/*)
- [ ] github-rest-client.ts (fetch repo data)
- [ ] POST /github-bounty/analyze-repo (LLM suggestions)
- [ ] CRUD endpoints for GitHubBounty
- [ ] PR submission + verify endpoint
- [ ] Dashboard: create wizard + explore + detail pages
- [ ] Manual approval flow (creator approves → escrow distribute)

### Phase 2 — GitHub App (est. 1 week)
- [ ] GitHub App registration + webhook handler
- [ ] Auto-approve on PR merge event
- [ ] "Bounty available" comment posted to GitHub issue

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| LLM provider | Claude via llm-server | Reuse existing infra |
| Private repo | Enter URL first → 403 → prompt OAuth | Better UX |
| Suggestion UX | Checkbox list → bulk create | Fast, efficient |
| Issue linking | Optional | Flexible for all use cases |
| Approval | Manual (Phase 1), auto-merge (Phase 2) | Safe MVP |

## Risks

1. **GitHub rate limits**: Unauthenticated = 60 req/hr. Use creator's OAuth token for analysis.
2. **LLM suggestion quality**: Need good prompt engineering + structured output (JSON mode).
3. **Sybil resistance**: Require GitHub account age ≥ 30 days for submission.
4. **Private repo token storage**: Need to encrypt githubAccessToken at rest.

## Unresolved Questions

- Should `GitHubBounty` share escrow sub-ID format with `QuestCollaborator` (collab pattern)?
- GitHub App review process — how long does approval take?
- Should repo owners pay a platform fee (% of bounty) or flat fee per bounty?
