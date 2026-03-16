-- Fix missing Agent columns on production database
-- This migration adds columns that should exist but are missing on production

-- Add activationCode column if it doesn't exist (should have been in init migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'activationCode'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "activationCode" TEXT;
    END IF;
END $$;

-- Add unique constraint on activationCode if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Agent_activationCode_key'
    ) THEN
        CREATE UNIQUE INDEX "Agent_activationCode_key" ON "Agent"("activationCode");
    END IF;
END $$;

-- Add claimedAt column if it doesn't exist (should have been in 20260221140000_schema_updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'claimedAt'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "claimedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add claimedVia column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'claimedVia'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "claimedVia" TEXT;
    END IF;
END $$;

-- Add claimEmail column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'claimEmail'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "claimEmail" TEXT;
    END IF;
END $$;

-- Add verificationToken column if it doesn't exist (should have been in 20260221120000_agent_self_register)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'verificationToken'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "verificationToken" TEXT;
    END IF;
END $$;

-- Add unique constraint on verificationToken if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Agent_verificationToken_key'
    ) THEN
        CREATE UNIQUE INDEX "Agent_verificationToken_key" ON "Agent"("verificationToken");
    END IF;
END $$;

-- Add index on verificationToken if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Agent_verificationToken_idx'
    ) THEN
        CREATE INDEX "Agent_verificationToken_idx" ON "Agent"("verificationToken");
    END IF;
END $$;

-- Add verificationExpiresAt column if it doesn't exist (should have been in 20260221120000_agent_self_register)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'verificationExpiresAt'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "verificationExpiresAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add claimedXHandle column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agent' AND column_name = 'claimedXHandle'
    ) THEN
        ALTER TABLE "Agent" ADD COLUMN "claimedXHandle" TEXT;
    END IF;
END $$;

-- Add unique constraint on claimedXHandle if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Agent_claimedXHandle_key'
    ) THEN
        CREATE UNIQUE INDEX "Agent_claimedXHandle_key" ON "Agent"("claimedXHandle") WHERE "claimedXHandle" IS NOT NULL;
    END IF;
END $$;

-- Add positionBonus column to WaitlistEntry if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'WaitlistEntry' AND column_name = 'positionBonus'
    ) THEN
        ALTER TABLE "WaitlistEntry" ADD COLUMN "positionBonus" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add referralBonus column to WaitlistEntry if it doesn't exist (should have been in 20260310140000)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'WaitlistEntry' AND column_name = 'referralBonus'
    ) THEN
        ALTER TABLE "WaitlistEntry" ADD COLUMN "referralBonus" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add effectivePosition column to WaitlistEntry if it doesn't exist (should have been in 20260310140000)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'WaitlistEntry' AND column_name = 'effectivePosition'
    ) THEN
        ALTER TABLE "WaitlistEntry" ADD COLUMN "effectivePosition" INTEGER NOT NULL DEFAULT 0;
        -- Backfill effectivePosition = position for existing rows
        UPDATE "WaitlistEntry" SET "effectivePosition" = "position";
        -- Add index on effectivePosition
        CREATE INDEX IF NOT EXISTS "WaitlistEntry_effectivePosition_idx" ON "WaitlistEntry"("effectivePosition");
    END IF;
END $$;
