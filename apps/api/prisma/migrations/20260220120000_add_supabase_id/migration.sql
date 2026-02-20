-- AlterTable
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
