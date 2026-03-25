# Phase 1 — DB Migration + GitHub OAuth

**Status:** pending | **Priority:** critical (blocks all other phases)

## Requirements

### DB Migration
Add to `apps/api/prisma/schema.prisma`:

```prisma
model GitHubBounty {
  id            String    @id @default(uuid())
  creatorUserId String
  repoOwner     String
  repoName      String
  issueNumber   Int?
  issueUrl      String?
  title         String
  description   String    @db.Text
  rewardAmount  Decimal   @db.Decimal(18, 6)
  rewardType    String    // USDC | LLM_KEY
  status        String    @default("draft") // draft | live | completed | cancelled
  questType     String    @default("fcfs")  // fcfs | leaderboard
  maxWinners    Int       @default(1)
  deadline      DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  creator       User      @relation(fields: [creatorUserId], references: [id])
  submissions   GitHubBountySubmission[]

  @@index([creatorUserId])
  @@index([status])
}

model GitHubBountySubmission {
  id        String   @id @default(uuid())
  bountyId  String
  userId    String?
  agentId   String?
  prUrl     String
  prNumber  Int
  status    String   @default("pending") // pending | approved | rejected
  createdAt DateTime @default(now())
  bounty    GitHubBounty @relation(fields: [bountyId], references: [id])
  user      User?        @relation(fields: [userId], references: [id])
  agent     Agent?       @relation(fields: [agentId], references: [id])

  @@index([bountyId])
  @@index([userId])
}
```

User model additions:
```prisma
githubId          String?  @unique
githubHandle      String?
githubAccessToken String?  // encrypted at rest via Prisma middleware or app-level
```

Also add reverse relations:
- `User.githubBounties GitHubBounty[]`
- `User.githubBountySubmissions GitHubBountySubmission[]`
- `Agent.githubBountySubmissions GitHubBountySubmission[]`

### GitHub OAuth Routes (`/auth/github/authorize` + `/auth/github/callback`)

**Scope strategy:**
- Bounty creator: `repo` scope (to read private repo issues via their token)
- PR submitter: `read:user` scope (just to verify github handle)

**Flow:**
```
GET /auth/github/authorize?scope=repo|read:user
→ Redirect to GitHub OAuth (state = JWT-signed userId + scope)
→ GitHub redirects to /auth/github/callback?code=&state=
→ Exchange code for token
→ Store: User.githubId, githubHandle, githubAccessToken
→ Redirect to frontend with success
```

**Env vars needed:**
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL` (e.g., `https://api.clawquest.ai/auth/github/callback`)

Update `.env.example` with these vars.

## Implementation Steps

1. Add models to `apps/api/prisma/schema.prisma`
2. Run `pnpm db:migrate` → name migration `add_github_bounty`
3. Run `pnpm --filter api exec prisma generate`
4. Add `/auth/github/authorize` GET route in `auth.routes.ts`
5. Add `/auth/github/callback` GET route in `auth.routes.ts`
6. Update `.env.example`

## Todo

- [ ] Add GitHubBounty model to schema
- [ ] Add GitHubBountySubmission model to schema
- [ ] Add githubId, githubHandle, githubAccessToken to User
- [ ] Run migration
- [ ] Regenerate Prisma client
- [ ] Implement /auth/github/authorize
- [ ] Implement /auth/github/callback
- [ ] Update .env.example

## Security

- `githubAccessToken` stored in DB — encrypt in app-layer before storing (use `crypto.createCipheriv` AES-256-GCM with `ENCRYPTION_KEY` env var, same pattern if already used, else new)
- State param in OAuth must be JWT-signed to prevent CSRF
- `read:user` scope for submitters (minimal privilege)
