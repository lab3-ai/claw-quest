-- AlterTable
ALTER TABLE "User" ADD COLUMN     "xAccessToken" TEXT,
ADD COLUMN     "xRefreshToken" TEXT,
ADD COLUMN     "xTokenExpiry" TIMESTAMP(3);
