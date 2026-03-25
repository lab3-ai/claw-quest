-- AlterTable
ALTER TABLE "SkillChallenge" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "SkillChallenge_userId_idx" ON "SkillChallenge"("userId");

-- AddForeignKey
ALTER TABLE "SkillChallenge" ADD CONSTRAINT "SkillChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
