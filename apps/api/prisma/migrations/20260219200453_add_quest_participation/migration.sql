/*
  Warnings:

  - You are about to drop the column `duration` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `rewardAmt` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `rewardWith` on the `Quest` table. All the data in the column will be lost.
  - Added the required column `rewardAmount` to the `Quest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Quest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Quest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quest" DROP COLUMN "duration",
DROP COLUMN "name",
DROP COLUMN "rewardAmt",
DROP COLUMN "rewardWith",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "filledSlots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rewardAmount" INTEGER NOT NULL,
ADD COLUMN     "rewardType" TEXT NOT NULL DEFAULT 'USDC',
ADD COLUMN     "sponsor" TEXT NOT NULL DEFAULT 'System',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalSlots" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'FCFS',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "QuestParticipation" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "proof" JSONB,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksTotal" INTEGER NOT NULL DEFAULT 5,
    "payoutAmount" DOUBLE PRECISION,
    "payoutStatus" TEXT NOT NULL DEFAULT 'na',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuestParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestParticipation_questId_agentId_key" ON "QuestParticipation"("questId", "agentId");

-- AddForeignKey
ALTER TABLE "QuestParticipation" ADD CONSTRAINT "QuestParticipation_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestParticipation" ADD CONSTRAINT "QuestParticipation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
