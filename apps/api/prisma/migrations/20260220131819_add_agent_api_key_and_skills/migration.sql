/*
  Warnings:

  - A unique constraint covering the columns `[agentApiKey]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "agentApiKey" TEXT;

-- CreateTable
CREATE TABLE "AgentSkill" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "publisher" TEXT,
    "meta" JSONB,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSkill_agentId_idx" ON "AgentSkill"("agentId");

-- CreateIndex
CREATE INDEX "AgentSkill_name_idx" ON "AgentSkill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSkill_agentId_name_key" ON "AgentSkill"("agentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agentApiKey_key" ON "Agent"("agentApiKey");

-- CreateIndex
CREATE INDEX "Agent_agentApiKey_idx" ON "Agent"("agentApiKey");

-- AddForeignKey
ALTER TABLE "AgentSkill" ADD CONSTRAINT "AgentSkill_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
