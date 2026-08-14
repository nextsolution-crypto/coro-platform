-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "exportedPdfEn" TEXT,
ADD COLUMN     "exportedPdfFr" TEXT;
