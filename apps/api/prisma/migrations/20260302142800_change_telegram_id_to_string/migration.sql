-- AlterTable: Change User.telegramId from BIGINT to TEXT
-- Telegram user IDs can exceed PostgreSQL bigint max (9223372036854775807)
-- Since telegramId is only used for lookups (no arithmetic), TEXT is correct.

ALTER TABLE "User" ALTER COLUMN "telegramId" TYPE TEXT USING "telegramId"::TEXT;
