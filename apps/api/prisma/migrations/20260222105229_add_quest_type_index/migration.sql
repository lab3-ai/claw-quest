/*
  Warnings:

  - A unique constraint covering the columns `[previewToken]` on the table `Quest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSessionId]` on the table `Quest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_ownerId_fkey";

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "creatorAgentId" TEXT,
ADD COLUMN     "cryptoChainId" INTEGER,
ADD COLUMN     "cryptoTxHash" TEXT,
ADD COLUMN     "fundedAmount" INTEGER,
ADD COLUMN     "fundedAt" TIMESTAMP(3),
ADD COLUMN     "fundingMethod" TEXT,
ADD COLUMN     "fundingStatus" TEXT NOT NULL DEFAULT 'unfunded',
ADD COLUMN     "previewToken" TEXT,
ADD COLUMN     "refundAmount" INTEGER,
ADD COLUMN     "refundStatus" TEXT,
ADD COLUMN     "refundTxHash" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ADD COLUMN     "tasks" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "clawhub_skills" (
    "id" UUID NOT NULL,
    "clawhub_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "summary" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "installs_all_time" INTEGER NOT NULL DEFAULT 0,
    "installs_current" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "versions" INTEGER NOT NULL DEFAULT 0,
    "owner_handle" TEXT,
    "owner_display_name" TEXT,
    "owner_image" TEXT,
    "latest_version" TEXT,
    "latest_version_id" TEXT,
    "badges" JSONB NOT NULL DEFAULT '{}',
    "tags" JSONB NOT NULL DEFAULT '{}',
    "parsed_clawdis" JSONB,
    "clawhub_created_at" TIMESTAMPTZ,
    "clawhub_updated_at" TIMESTAMPTZ,
    "crawled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clawhub_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clawhub_skills_clawhub_id_key" ON "clawhub_skills"("clawhub_id");

-- CreateIndex
CREATE UNIQUE INDEX "clawhub_skills_slug_key" ON "clawhub_skills"("slug");

-- CreateIndex
CREATE INDEX "clawhub_skills_downloads_idx" ON "clawhub_skills"("downloads" DESC);

-- CreateIndex
CREATE INDEX "clawhub_skills_stars_idx" ON "clawhub_skills"("stars" DESC);

-- CreateIndex
CREATE INDEX "clawhub_skills_owner_handle_idx" ON "clawhub_skills"("owner_handle");

-- CreateIndex
CREATE INDEX "clawhub_skills_crawled_at_idx" ON "clawhub_skills"("crawled_at");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_previewToken_key" ON "Quest"("previewToken");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_stripeSessionId_key" ON "Quest"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Quest_previewToken_idx" ON "Quest"("previewToken");

-- CreateIndex
CREATE INDEX "Quest_creatorAgentId_idx" ON "Quest"("creatorAgentId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
