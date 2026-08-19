-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaCode" TEXT,
ADD COLUMN     "mfaCodeExpiry" TIMESTAMP(3);
