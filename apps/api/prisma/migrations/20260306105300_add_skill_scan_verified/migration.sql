-- AlterTable
ALTER TABLE "AgentSkill" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentSkill" ADD COLUMN "platform" TEXT;
ALTER TABLE "AgentSkill" ADD COLUMN "scannedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN "requireVerified" BOOLEAN NOT NULL DEFAULT false;
