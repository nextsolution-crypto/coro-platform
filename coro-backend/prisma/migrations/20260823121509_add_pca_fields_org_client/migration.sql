-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "operatingHours" TEXT,
ADD COLUMN     "regulatoryRequirements" TEXT[],
ADD COLUMN     "sector" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "operatingHours" TEXT,
ADD COLUMN     "sector" TEXT;
