-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordHandle" TEXT,
ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "xHandle" TEXT,
ADD COLUMN     "xId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_xId_key" ON "User"("xId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
