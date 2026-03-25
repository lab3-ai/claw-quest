-- AddColumn: earlyAccessAt to Quest
ALTER TABLE "Quest" ADD COLUMN "earlyAccessAt" TIMESTAMP(3);

-- Index for fast lookup
CREATE INDEX "Quest_earlyAccessAt_idx" ON "Quest"("earlyAccessAt");
