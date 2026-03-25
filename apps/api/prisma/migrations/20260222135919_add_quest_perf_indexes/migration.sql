-- CreateIndex
CREATE INDEX "Quest_creatorUserId_idx" ON "Quest"("creatorUserId");

-- CreateIndex
CREATE INDEX "Quest_status_createdAt_idx" ON "Quest"("status", "createdAt");
