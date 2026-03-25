-- CreateTable: LlmModel catalog for LLMTOKEN_OPENROUTER reward quests

CREATE TABLE "LlmModel" (
    "id" TEXT NOT NULL,
    "openrouterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "inputPricePer1M" DECIMAL(10,4) NOT NULL,
    "outputPricePer1M" DECIMAL(10,4) NOT NULL,
    "contextWindow" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlmModel_openrouterId_key" ON "LlmModel"("openrouterId");

-- CreateIndex
CREATE INDEX "LlmModel_isActive_outputPricePer1M_idx" ON "LlmModel"("isActive", "outputPricePer1M");

-- AlterTable: Add LLM model fields to Quest
ALTER TABLE "Quest" ADD COLUMN "llmModelId" TEXT;
ALTER TABLE "Quest" ADD COLUMN "tokenBudgetPerWinner" DECIMAL(18,6);

-- CreateIndex
CREATE INDEX "Quest_llmModelId_idx" ON "Quest"("llmModelId");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_llmModelId_fkey" FOREIGN KEY ("llmModelId") REFERENCES "LlmModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
