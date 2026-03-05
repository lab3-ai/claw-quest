-- AlterTable: make userId nullable on QuestCollaborator (pending invites have no user yet)
ALTER TABLE "QuestCollaborator" ALTER COLUMN "userId" DROP NOT NULL;

-- Drop the unique constraint on (questId, userId) since userId can be null
DROP INDEX IF EXISTS "QuestCollaborator_questId_userId_key";

-- Re-create as a partial unique index (only enforced when userId is not null)
CREATE UNIQUE INDEX "QuestCollaborator_questId_userId_key" ON "QuestCollaborator"("questId", "userId") WHERE "userId" IS NOT NULL;
