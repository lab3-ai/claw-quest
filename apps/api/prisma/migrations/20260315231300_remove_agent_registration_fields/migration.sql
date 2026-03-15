-- AlterTable
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "activationCode",
DROP COLUMN IF EXISTS "verificationToken",
DROP COLUMN IF EXISTS "verificationExpiresAt",
DROP COLUMN IF EXISTS "claimedAt",
DROP COLUMN IF EXISTS "claimedVia",
DROP COLUMN IF EXISTS "claimEmail",
DROP COLUMN IF EXISTS "claimedXHandle";

-- DropIndex
DROP INDEX IF EXISTS "Agent_activationCode_key";
DROP INDEX IF EXISTS "Agent_verificationToken_key";
DROP INDEX IF EXISTS "Agent_claimedXHandle_key";
DROP INDEX IF EXISTS "Agent_verificationToken_idx";
