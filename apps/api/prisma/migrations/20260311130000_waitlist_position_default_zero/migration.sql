-- Restore NOT NULL with default 0: position/effectivePosition are 0 until user joins via Telegram.
UPDATE "WaitlistEntry" SET "position" = 0 WHERE "position" IS NULL;
UPDATE "WaitlistEntry" SET "effectivePosition" = 0 WHERE "effectivePosition" IS NULL;
ALTER TABLE "WaitlistEntry" ALTER COLUMN "position" SET DEFAULT 0, ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "WaitlistEntry" ALTER COLUMN "effectivePosition" SET DEFAULT 0, ALTER COLUMN "effectivePosition" SET NOT NULL;
