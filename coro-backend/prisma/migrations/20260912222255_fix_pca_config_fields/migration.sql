-- AlterTable
ALTER TABLE "PcaConfig" ADD COLUMN     "absenteeismThreshold" TEXT,
ADD COLUMN     "criticalITSystems" JSONB,
ADD COLUMN     "criticalSuppliers" JSONB,
ALTER COLUMN "pcaBuildingIds" SET DEFAULT ARRAY[]::TEXT[];
