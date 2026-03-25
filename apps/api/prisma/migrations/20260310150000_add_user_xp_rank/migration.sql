-- Add xp and rank columns to User (missing from previous migration)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rank" INTEGER NOT NULL DEFAULT 0;

-- Create index on xp for leaderboard queries
CREATE INDEX IF NOT EXISTS "User_xp_idx" ON "User"("xp" DESC);
