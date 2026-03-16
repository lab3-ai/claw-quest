-- CreateTable
CREATE TABLE "SkillChallenge" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "questId" TEXT,
    "agentId" TEXT,
    "params" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "verifiedAt" TIMESTAMPTZ(6),
    "result" JSONB,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillChallenge_token_key" ON "SkillChallenge"("token");

-- CreateIndex
CREATE INDEX "SkillChallenge_token_idx" ON "SkillChallenge"("token");

-- CreateIndex
CREATE INDEX "SkillChallenge_agentId_idx" ON "SkillChallenge"("agentId");

-- CreateIndex
CREATE INDEX "SkillChallenge_skillSlug_idx" ON "SkillChallenge"("skillSlug");

-- AddForeignKey
ALTER TABLE "SkillChallenge" ADD CONSTRAINT "SkillChallenge_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillChallenge" ADD CONSTRAINT "SkillChallenge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
