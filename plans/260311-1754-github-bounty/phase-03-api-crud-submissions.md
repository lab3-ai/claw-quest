# Phase 3 — API CRUD + PR Submission/Verify

**Status:** pending | **Blocked by:** Phase 2

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /github-bounties | public | List live bounties (paginated) |
| POST | /github-bounties | JWT | Create bounty (or bulk from suggestions) |
| GET | /github-bounties/:id | public | Get bounty detail |
| PATCH | /github-bounties/:id | JWT (creator) | Update draft bounty |
| DELETE | /github-bounties/:id | JWT (creator) | Cancel bounty |
| POST | /github-bounties/analyze-repo | JWT | LLM suggestions (Phase 2) |
| POST | /github-bounties/:id/submit | JWT | Submit PR |
| GET | /github-bounties/:id/submissions | JWT (creator) | List submissions |
| PATCH | /github-bounties/:id/submissions/:subId | JWT (creator) | Approve/reject submission |

## Business Logic

### Create Bounty (`github-bounty.service.ts`)
```typescript
createBounty(userId, data) → GitHubBounty
  - status = 'draft' initially
  - if rewardType === 'LLM_KEY' → status = 'live' immediately (no funding)
  - if rewardType === 'USDC' → status = 'draft' (needs escrow funding, future)
```

**Bulk create:** `POST /github-bounties/bulk` body `{ bounties: CreateBountyInput[] }` — creates multiple from suggestions.

### PR Submission (`POST /github-bounties/:id/submit`)
```
1. Require user.githubHandle (else return { needsGithubAuth: true, scope: 'read:user' })
2. Parse prNumber from prUrl regex: /github.com/{owner}/{repo}/pull/(\d+)/
3. Verify prUrl owner/repo matches bounty.repoOwner/repoName
4. Fetch PR via GitHub API: GET /repos/{owner}/{repo}/pulls/{number}
5. Verify pr.user.login === user.githubHandle
6. Check no existing submission for (bountyId, userId)
7. Store GitHubBountySubmission { status: 'pending' }
```

### Approve Submission (`PATCH /github-bounties/:id/submissions/:subId`)
```
1. Only creator can approve
2. Check bounty status === 'live'
3. Count approved submissions — if >= maxWinners → reject
4. status → 'approved'
5. if rewardType === 'LLM_KEY': call issueLlmKeyForSubmission()
6. if rewardType === 'USDC': TODO escrow distribute (Phase 2 enhancement)
7. if approved count === maxWinners → bounty status → 'completed'
```

### LLM Key for Submission
```typescript
// Reuse pattern from llm-key-reward.service.ts
issueLlmKeyForSubmission(submission, bounty)
  → POST LLM_SERVER_URL/api/v1/keys
  → Store api_key in GitHubBountySubmission.llmRewardApiKey (add field to model)
```

## Schema Additions (back to Phase 1)
Add to `GitHubBountySubmission`:
- `llmRewardApiKey String?`
- `llmRewardIssuedAt DateTime?`

## Validation (Zod)
```typescript
CreateBountySchema = z.object({
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  rewardAmount: z.number().positive(),
  rewardType: z.enum(['USDC', 'LLM_KEY']),
  questType: z.enum(['fcfs', 'leaderboard']).default('fcfs'),
  maxWinners: z.number().int().min(1).max(50).default(1),
  deadline: z.string().datetime().optional(),
  issueNumber: z.number().int().optional(),
  issueUrl: z.string().url().optional(),
})

SubmitPrSchema = z.object({
  prUrl: z.string().url().regex(/github\.com\/.+\/.+\/pull\/\d+/)
})
```

## Todo

- [ ] Add llmRewardApiKey + llmRewardIssuedAt to GitHubBountySubmission (migration)
- [ ] Implement all 9 endpoints in `github-bounty.routes.ts`
- [ ] Implement service functions in `github-bounty.service.ts`
- [ ] Implement PR verification logic
- [ ] Implement LLM key issuance for approved submissions
- [ ] Add Zod schemas
- [ ] Register routes in `app.ts`
- [ ] Write tests in `__tests__/github-bounty.test.ts`
