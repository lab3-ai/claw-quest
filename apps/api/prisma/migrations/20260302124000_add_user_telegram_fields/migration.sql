-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramId" BIGINT,
ADD COLUMN     "telegramUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
