-- AlterTable: make ownerId nullable
ALTER TABLE "Agent" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable: add verification fields
ALTER TABLE "Agent" ADD COLUMN "verificationToken" TEXT,
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_verificationToken_key" ON "Agent"("verificationToken");

-- CreateIndex
CREATE INDEX "Agent_verificationToken_idx" ON "Agent"("verificationToken");

-- AlterTable: add requiredSkills to Quest
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];
