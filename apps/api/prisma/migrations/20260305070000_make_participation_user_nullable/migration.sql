-- Make userId nullable for agent-only participations
ALTER TABLE "QuestParticipation" ALTER COLUMN "userId" DROP NOT NULL;

-- Add unique constraint for agentId per quest
CREATE UNIQUE INDEX IF NOT EXISTS "QuestParticipation_questId_agentId_key" ON "QuestParticipation"("questId", "agentId");
