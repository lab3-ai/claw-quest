-- AlterTable: add GitHub fields to User
ALTER TABLE "User" ADD COLUMN "githubId" TEXT;
ALTER TABLE "User" ADD COLUMN "githubHandle" TEXT;
ALTER TABLE "User" ADD COLUMN "githubAccessToken" TEXT;

-- CreateIndex: unique constraint on githubId
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateTable: GitHubBounty
CREATE TABLE "GitHubBounty" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "issueNumber" INTEGER,
    "issueUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardAmount" DECIMAL(18,6) NOT NULL,
    "rewardType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "questType" TEXT NOT NULL DEFAULT 'fcfs',
    "maxWinners" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "fundingStatus" TEXT NOT NULL DEFAULT 'unfunded',
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "escrowQuestId" TEXT,
    "llmKeyTokenLimit" INTEGER DEFAULT 1000000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubBounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GitHubBountySubmission
CREATE TABLE "GitHubBountySubmission" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "prUrl" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "llmRewardApiKey" TEXT,
    "llmRewardIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubBountySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubBounty_stripeSessionId_key" ON "GitHubBounty"("stripeSessionId");
CREATE INDEX "GitHubBounty_creatorUserId_idx" ON "GitHubBounty"("creatorUserId");
CREATE INDEX "GitHubBounty_status_idx" ON "GitHubBounty"("status");
CREATE INDEX "GitHubBounty_repoOwner_repoName_idx" ON "GitHubBounty"("repoOwner", "repoName");

CREATE UNIQUE INDEX "GitHubBountySubmission_bountyId_userId_key" ON "GitHubBountySubmission"("bountyId", "userId");
CREATE UNIQUE INDEX "GitHubBountySubmission_bountyId_agentId_key" ON "GitHubBountySubmission"("bountyId", "agentId");
CREATE INDEX "GitHubBountySubmission_bountyId_idx" ON "GitHubBountySubmission"("bountyId");
CREATE INDEX "GitHubBountySubmission_userId_idx" ON "GitHubBountySubmission"("userId");

-- AddForeignKey
ALTER TABLE "GitHubBounty" ADD CONSTRAINT "GitHubBounty_creatorUserId_fkey"
    FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GitHubBountySubmission" ADD CONSTRAINT "GitHubBountySubmission_bountyId_fkey"
    FOREIGN KEY ("bountyId") REFERENCES "GitHubBounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GitHubBountySubmission" ADD CONSTRAINT "GitHubBountySubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GitHubBountySubmission" ADD CONSTRAINT "GitHubBountySubmission_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
