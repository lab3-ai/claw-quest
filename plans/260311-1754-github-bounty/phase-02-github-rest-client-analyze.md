# Phase 2 — GitHub REST Client + Analyze Repo

**Status:** pending | **Blocked by:** Phase 1

## Files

- `apps/api/src/modules/github-bounty/github-rest-client.ts` (new)
- `apps/api/src/modules/github-bounty/github-bounty.routes.ts` — add `POST /github-bounties/analyze-repo`
- `apps/api/src/modules/github-bounty/github-bounty.service.ts` — add `analyzeRepo()`

## github-rest-client.ts

```typescript
// Functions to export:
getRepo(owner, repo, token?)           // GET /repos/{owner}/{repo}
getRepoIssues(owner, repo, token?)     // GET /repos/{owner}/{repo}/issues?state=open&sort=reactions&per_page=20
getReadme(owner, repo, token?)         // GET /repos/{owner}/{repo}/readme → decode base64 content
getContributing(owner, repo, token?)   // GET /repos/{owner}/{repo}/contents/CONTRIBUTING.md → decode
```

- `token` = optional githubAccessToken for private repos / higher rate limits
- On 403/404 without token: throw `GithubAuthRequired` error → frontend prompts OAuth
- On 403 with token: throw `GithubAccessDenied`
- Rate limiting: unauthenticated = 60 req/hr; authenticated = 5000 req/hr

## POST /github-bounties/analyze-repo

**Auth:** protected (JWT)
**Body:** `{ repoUrl: string }` — e.g., `https://github.com/facebook/react`

**Logic:**
1. Parse `owner/repo` from URL
2. Fetch: `getRepo()`, `getRepoIssues()`, `getReadme()` in parallel
3. Try `getContributing()` (ignore 404)
4. If any 403 without githubAccessToken → return `{ needsGithubAuth: true }`
5. Build LLM prompt (see below)
6. Call llm-server `POST /chat/completions` with JSON mode
7. Parse + return `BountySuggestion[]`

**LLM prompt:**
```
Repo: {owner}/{name}
Stars: {n} | Language: {lang} | Description: {desc}
Open issues (by reactions):
  #{num} [{labels}] {title} ({reactions} 👍)
  ...
README (first 500 chars): {text}

Suggest 5-8 GitHub bounties to attract contributors.
Return JSON array: [{ title, description, issueNumber?, difficulty, suggestedReward, rewardType }]
difficulty: "easy"|"medium"|"hard"
suggestedReward: number (USD)
rewardType: "USDC"|"LLM_KEY"
```

**LLM server call** (reuse pattern from `llm-key-reward.service.ts`):
```typescript
fetch(`${LLM_SERVER_URL}/chat/completions`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${LLM_SERVER_SECRET_KEY}` },
  body: JSON.stringify({
    model: 'default',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })
})
```

**Response type:**
```typescript
type BountySuggestion = {
  title: string
  description: string
  issueNumber?: number
  difficulty: 'easy' | 'medium' | 'hard'
  suggestedReward: number
  rewardType: 'USDC' | 'LLM_KEY'
}
```

## Todo

- [ ] Create `github-rest-client.ts` with 4 functions
- [ ] Add `analyzeRepo()` to `github-bounty.service.ts`
- [ ] Add `POST /github-bounties/analyze-repo` route
- [ ] Handle `needsGithubAuth` 403 case
- [ ] Test with public repo (no token)
