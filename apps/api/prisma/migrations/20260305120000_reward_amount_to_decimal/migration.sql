-- AlterTable
-- Convert rewardAmount from INTEGER to DECIMAL(36,18) so decimal values (e.g. 0.01) are stored correctly.
ALTER TABLE "Quest" ALTER COLUMN "rewardAmount" SET DATA TYPE DECIMAL(36,18) USING "rewardAmount"::numeric(36,18);
ALTER TABLE "Quest" ALTER COLUMN "rewardAmount" SET DEFAULT 0;
