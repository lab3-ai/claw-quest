-- Make userId nullable for agent-only participations
ALTER TABLE "QuestParticipation" ALTER COLUMN "userId" DROP NOT NULL;
