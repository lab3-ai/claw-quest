-- CreateTable
CREATE TABLE "BotChatLog" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotChatLog_telegramId_createdAt_idx" ON "BotChatLog"("telegramId", "createdAt");

-- CreateIndex
CREATE INDEX "BotChatLog_type_idx" ON "BotChatLog"("type");
