-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeConnectedAccountId" TEXT,
ADD COLUMN     "stripeConnectedOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectedAccountId_key" ON "User"("stripeConnectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
