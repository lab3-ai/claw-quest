-- Add referralBonus and effectivePosition to WaitlistEntry
ALTER TABLE "WaitlistEntry" ADD COLUMN "referralBonus" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WaitlistEntry" ADD COLUMN "effectivePosition" INTEGER NOT NULL DEFAULT 0;

-- Backfill effectivePosition = position for existing rows
UPDATE "WaitlistEntry" SET "effectivePosition" = "position";

-- Add index on effectivePosition
CREATE INDEX "WaitlistEntry_effectivePosition_idx" ON "WaitlistEntry"("effectivePosition");

-- Add userType to User (xp already exists)
ALTER TABLE "User" ADD COLUMN "userType" TEXT NOT NULL DEFAULT 'standard';
