-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordAccessToken" TEXT,
ADD COLUMN     "discordRefreshToken" TEXT,
ADD COLUMN     "discordTokenExpiry" TIMESTAMP(3);
