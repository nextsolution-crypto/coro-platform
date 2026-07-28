-- AlterTable
ALTER TABLE "ProjectActivity" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceMandate" BOOLEAN NOT NULL DEFAULT false;
