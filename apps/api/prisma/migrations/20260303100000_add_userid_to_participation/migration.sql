-- Step 1: Add userId as nullable
ALTER TABLE "QuestParticipation" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill userId from Agent.ownerId
UPDATE "QuestParticipation" qp
SET "userId" = a."ownerId"
FROM "Agent" a
WHERE qp."agentId" = a."id" AND a."ownerId" IS NOT NULL;

-- Step 3: Delete orphan participations with no traceable user
DELETE FROM "QuestParticipation" WHERE "userId" IS NULL;

-- Step 4: Deduplicate — keep only the latest participation per (questId, userId)
DELETE FROM "QuestParticipation"
WHERE id NOT IN (
  SELECT DISTINCT ON ("questId", "userId") id
  FROM "QuestParticipation"
  ORDER BY "questId", "userId", "joinedAt" DESC
);

-- Step 5: Make userId non-nullable
ALTER TABLE "QuestParticipation" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Make agentId nullable
ALTER TABLE "QuestParticipation" ALTER COLUMN "agentId" DROP NOT NULL;

-- Step 7: Drop old unique constraint
DROP INDEX IF EXISTS "QuestParticipation_questId_agentId_key";

-- Step 8: Add new unique constraint (one participation per user per quest)
CREATE UNIQUE INDEX "QuestParticipation_questId_userId_key" ON "QuestParticipation"("questId", "userId");

-- Step 9: Add foreign key for userId -> User
ALTER TABLE "QuestParticipation" ADD CONSTRAINT "QuestParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
