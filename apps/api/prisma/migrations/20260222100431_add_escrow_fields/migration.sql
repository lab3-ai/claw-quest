-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "escrowQuestId" TEXT,
ADD COLUMN     "sponsorWallet" TEXT,
ADD COLUMN     "tokenAddress" TEXT,
ADD COLUMN     "tokenDecimals" INTEGER;

-- AlterTable
ALTER TABLE "QuestParticipation" ADD COLUMN     "payoutTxHash" TEXT,
ADD COLUMN     "payoutWallet" TEXT;

-- CreateTable
CREATE TABLE "WalletLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletLink_userId_idx" ON "WalletLink"("userId");

-- CreateIndex
CREATE INDEX "WalletLink_address_idx" ON "WalletLink"("address");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLink_userId_address_key" ON "WalletLink"("userId", "address");

-- AddForeignKey
ALTER TABLE "WalletLink" ADD CONSTRAINT "WalletLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
