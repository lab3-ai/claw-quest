-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "totalFunded" DECIMAL(36,18) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuestCollaborator" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "invitedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestDeposit" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "escrowQuestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" TEXT,
    "walletAddress" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestCollaborator_inviteToken_key" ON "QuestCollaborator"("inviteToken");

-- CreateIndex
CREATE INDEX "QuestCollaborator_questId_idx" ON "QuestCollaborator"("questId");

-- CreateIndex
CREATE INDEX "QuestCollaborator_inviteToken_idx" ON "QuestCollaborator"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "QuestCollaborator_questId_userId_key" ON "QuestCollaborator"("questId", "userId");

-- CreateIndex
CREATE INDEX "QuestDeposit_questId_idx" ON "QuestDeposit"("questId");

-- CreateIndex
CREATE INDEX "QuestDeposit_escrowQuestId_idx" ON "QuestDeposit"("escrowQuestId");

-- CreateIndex
CREATE INDEX "QuestDeposit_userId_idx" ON "QuestDeposit"("userId");

-- AddForeignKey
ALTER TABLE "QuestCollaborator" ADD CONSTRAINT "QuestCollaborator_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCollaborator" ADD CONSTRAINT "QuestCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDeposit" ADD CONSTRAINT "QuestDeposit_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDeposit" ADD CONSTRAINT "QuestDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill totalFunded for existing funded quests
UPDATE "Quest"
SET "totalFunded" = "rewardAmount"
WHERE "fundingStatus" = 'confirmed'
  AND "totalFunded" = 0;
