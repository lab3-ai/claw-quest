-- AlterTable: add sponsorId to Quest table
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "sponsorId" TEXT;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Quest_sponsorId_idx" ON "Quest"("sponsorId");
