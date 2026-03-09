-- AlterTable
ALTER TABLE "Quest" ADD COLUMN "tokenProvider" TEXT;
ALTER TABLE "Quest" ADD COLUMN "tokenAmount" DECIMAL(36,18);

-- AlterTable
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenProvider" TEXT;
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenAmount" DECIMAL(36,18);
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenApiKey" TEXT;
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenKeyId" TEXT;
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "QuestParticipation" ADD COLUMN "payoutTokenStatus" TEXT;
