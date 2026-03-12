-- AlterTable: add web3 classification fields to clawhub_skills
ALTER TABLE "clawhub_skills" ADD COLUMN "is_web3" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clawhub_skills" ADD COLUMN "web3_auto_detected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clawhub_skills" ADD COLUMN "web3_admin_override" BOOLEAN;
ALTER TABLE "clawhub_skills" ADD COLUMN "web3_category" TEXT;
ALTER TABLE "clawhub_skills" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clawhub_skills" ADD COLUMN "featured_order" INTEGER;

-- CreateIndex
CREATE INDEX "clawhub_skills_is_web3_downloads_idx" ON "clawhub_skills"("is_web3", "downloads" DESC);

-- CreateTable: web3_skill_submissions
CREATE TABLE "web3_skill_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "github_url" TEXT,
    "logo_url" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "web3_skill_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "web3_skill_submissions_slug_key" ON "web3_skill_submissions"("slug");
CREATE INDEX "web3_skill_submissions_status_idx" ON "web3_skill_submissions"("status");
CREATE INDEX "web3_skill_submissions_category_idx" ON "web3_skill_submissions"("category");
CREATE INDEX "web3_skill_submissions_submitted_by_idx" ON "web3_skill_submissions"("submitted_by");

-- AddForeignKey
ALTER TABLE "web3_skill_submissions" ADD CONSTRAINT "web3_skill_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "web3_skill_submissions" ADD CONSTRAINT "web3_skill_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
