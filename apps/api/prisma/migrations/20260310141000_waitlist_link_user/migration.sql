-- Add userId to WaitlistEntry to link a waitlist entry to a registered User
ALTER TABLE "WaitlistEntry" ADD COLUMN "userId" TEXT UNIQUE;

-- Foreign key to User
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for fast lookup
CREATE INDEX "WaitlistEntry_userId_idx" ON "WaitlistEntry"("userId");
