-- Agent: add claim tracking fields
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "claimedVia" TEXT;
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "claimEmail" TEXT;

-- TelegramLink: drop unique on telegramId, add index instead
-- (allow one Telegram user to claim multiple agents)
DROP INDEX IF EXISTS "TelegramLink_telegramId_key";
CREATE INDEX IF NOT EXISTS "TelegramLink_telegramId_idx" ON "TelegramLink"("telegramId");

-- TelegramLink: update FK to cascade on delete
ALTER TABLE "TelegramLink" DROP CONSTRAINT IF EXISTS "TelegramLink_agentId_fkey";
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quest: add ownership/claim fields
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "creatorTelegramId" BIGINT;
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "creatorEmail" TEXT;
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "creatorUserId" TEXT;
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "claimToken" TEXT;
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "claimTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Quest_claimToken_key" ON "Quest"("claimToken");
CREATE INDEX IF NOT EXISTS "Quest_claimToken_idx" ON "Quest"("claimToken");
CREATE INDEX IF NOT EXISTS "Quest_creatorTelegramId_idx" ON "Quest"("creatorTelegramId");

-- QuestParticipation: cascade on delete
ALTER TABLE "QuestParticipation" DROP CONSTRAINT IF EXISTS "QuestParticipation_questId_fkey";
ALTER TABLE "QuestParticipation" ADD CONSTRAINT "QuestParticipation_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestParticipation" DROP CONSTRAINT IF EXISTS "QuestParticipation_agentId_fkey";
ALTER TABLE "QuestParticipation" ADD CONSTRAINT "QuestParticipation_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentSkill: cascade on delete
ALTER TABLE "AgentSkill" DROP CONSTRAINT IF EXISTS "AgentSkill_agentId_fkey";
ALTER TABLE "AgentSkill" ADD CONSTRAINT "AgentSkill_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentLog: cascade on delete
ALTER TABLE "AgentLog" DROP CONSTRAINT IF EXISTS "AgentLog_agentId_fkey";
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
