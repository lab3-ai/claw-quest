-- AddColumn: isActive to Agent
ALTER TABLE "Agent" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

-- Index for fast lookup of active agent per user
CREATE INDEX "Agent_ownerId_isActive_idx" ON "Agent"("ownerId", "isActive");
