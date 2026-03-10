-- AddColumn: Quest.llmKeyRewardEnabled
ALTER TABLE "Quest" ADD COLUMN "llmKeyRewardEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn: QuestParticipation.llmRewardApiKey
ALTER TABLE "QuestParticipation" ADD COLUMN "llmRewardApiKey" TEXT;

-- AddColumn: QuestParticipation.llmRewardIssuedAt
ALTER TABLE "QuestParticipation" ADD COLUMN "llmRewardIssuedAt" TIMESTAMP(3);
