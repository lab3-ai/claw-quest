-- AlterTable: make telegramId nullable and add accessToken field
ALTER TABLE "WaitlistEntry" ALTER COLUMN "telegramId" DROP NOT NULL;
ALTER TABLE "WaitlistEntry" ADD COLUMN "accessToken" TEXT;
CREATE UNIQUE INDEX "WaitlistEntry_accessToken_key" ON "WaitlistEntry"("accessToken");
