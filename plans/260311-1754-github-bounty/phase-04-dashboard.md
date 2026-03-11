# Phase 4 — Dashboard Pages

**Status:** pending | **Blocked by:** Phase 3

## Routes to Create

| File | Route | Auth | Description |
|------|-------|------|-------------|
| `github-bounties.tsx` | `/github-bounties` | public | Explore bounties |
| `github-bounties/new.tsx` | `/github-bounties/new` | protected | Create wizard |
| `github-bounties/$bountyId.tsx` | `/github-bounties/$bountyId` | public | Detail + submit PR |
| `_authenticated/github-bounties/mine.tsx` | `/github-bounties/mine` | protected | My bounties |

Also: `auth/github-callback.tsx` at `/auth/github/callback` for OAuth redirect.

## Page Designs

### Explore (`/github-bounties`)
- Grid of bounty cards: repo name, title, reward badge (USDC/LLM_KEY amount), status, deadline
- Filter: by rewardType, status
- "Create Bounty" CTA → `/github-bounties/new`

### Create Wizard (`/github-bounties/new`)
3-step accordion stepper (same pattern as quest create wizard):

**Step 1 — Repo**
- Input: GitHub repo URL
- On paste/submit: call `POST /github-bounties/analyze-repo`
- Loading state: "Analyzing repo with AI…"
- If `needsGithubAuth`: show "Connect GitHub" button → trigger OAuth
- Show suggestions as checkbox list with editable fields (title, reward, difficulty badge)

**Step 2 — Review & Edit**
- Selected suggestions shown as cards
- Editable: title, description, reward amount, reward type, deadline, maxWinners

**Step 3 — Publish**
- Summary + "Publish Bounties" button
- LLM_KEY: instant live
- USDC: show funding note (escrow in future phase)

### Detail (`/github-bounties/$bountyId`)
- Bounty header: repo link, title, reward, status badge, deadline countdown
- Description (markdown)
- "Submit PR" section:
  - If not GitHub-authed: "Connect GitHub to submit"
  - Else: input for PR URL + submit button
- Submissions list (if creator: show approve/reject buttons)

### My Bounties (`/github-bounties/mine`)
- Table of bounties with status, submissions count, actions
- Pending submissions count badge

## API Client Functions

Add to `apps/dashboard/src/lib/api.ts` (or separate `github-bounty-api.ts`):
```typescript
analyzeRepo(repoUrl)              // POST /github-bounties/analyze-repo
createBounties(bounties[])        // POST /github-bounties/bulk
getBounties(filters?)             // GET /github-bounties
getBounty(id)                     // GET /github-bounties/:id
submitPr(bountyId, prUrl)         // POST /github-bounties/:id/submit
getSubmissions(bountyId)          // GET /github-bounties/:id/submissions
updateSubmission(bountyId, subId, status) // PATCH .../submissions/:subId
```

## GitHub OAuth Callback

`apps/dashboard/src/routes/auth/github-callback.tsx`:
1. Extract `?code=&state=` from URL
2. POST to `API_BASE/auth/github/callback` (the backend handles exchange)
   - Or: redirect-based where backend handles everything and sends back to frontend
3. On success: redirect to `/github-bounties/new` or `/account`

## Todo

- [ ] Create explore page with bounty cards
- [ ] Create 3-step create wizard
- [ ] Create detail page with PR submit form
- [ ] Create mine page with submissions management
- [ ] Create github-callback route
- [ ] Add API client functions
- [ ] Wire up TanStack Query hooks
