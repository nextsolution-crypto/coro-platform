-- AlterTable
ALTER TABLE "IncidentEvent" ADD COLUMN     "rexCompletedAt" TIMESTAMP(3),
ADD COLUMN     "rexCorrectiveActions" TEXT,
ADD COLUMN     "rexRecommendations" TEXT,
ADD COLUMN     "rexToImprove" TEXT,
ADD COLUMN     "rexWentWell" TEXT;
