/*
  Warnings:

  - A unique constraint covering the columns `[questId,agentId]` on the table `QuestParticipation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "QuestParticipation" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Chain" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "nativeCurrency" JSONB NOT NULL,
    "explorerUrl" TEXT NOT NULL,
    "isTestnet" BOOLEAN NOT NULL DEFAULT false,
    "isEscrowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainRpc" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainRpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowContract" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChainRpc_chainId_isActive_priority_idx" ON "ChainRpc"("chainId", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ChainRpc_chainId_url_key" ON "ChainRpc"("chainId", "url");

-- CreateIndex
CREATE INDEX "EscrowContract_chainId_isActive_idx" ON "EscrowContract"("chainId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowContract_chainId_address_key" ON "EscrowContract"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "QuestParticipation_questId_agentId_key" ON "QuestParticipation"("questId", "agentId");

-- AddForeignKey
ALTER TABLE "ChainRpc" ADD CONSTRAINT "ChainRpc_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowContract" ADD CONSTRAINT "EscrowContract_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
