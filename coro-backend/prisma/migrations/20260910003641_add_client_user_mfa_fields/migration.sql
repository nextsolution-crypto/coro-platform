-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "mfaCode" TEXT,
ADD COLUMN     "mfaCodeExpiry" TIMESTAMP(3);
