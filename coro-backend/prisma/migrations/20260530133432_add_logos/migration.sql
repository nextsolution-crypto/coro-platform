-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "logoBase64" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyLogoB64" TEXT,
ADD COLUMN     "companyName" TEXT;
