-- Add username to User (nullable, unique)
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Rename Agent.name to Agent.agentname (preserve data)
ALTER TABLE "Agent" RENAME COLUMN "name" TO "agentname";
