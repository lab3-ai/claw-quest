-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "drawTime" TIMESTAMP(3),
ADD COLUMN     "network" TEXT,
ALTER COLUMN "rewardAmount" SET DEFAULT 0;
