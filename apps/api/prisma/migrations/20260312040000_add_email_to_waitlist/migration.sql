-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
