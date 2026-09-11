/*
  Warnings:

  - A unique constraint covering the columns `[ackToken]` on the table `IncidentTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,versionNumber]` on the table `ProjectVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DocumentSignature" ADD COLUMN     "projectVersionId" TEXT;

-- AlterTable
ALTER TABLE "IncidentEvent" ADD COLUMN     "isExercise" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "IncidentTask" ADD COLUMN     "ackToken" TEXT;

-- CreateIndex
CREATE INDEX "DocumentSignature_projectId_idx" ON "DocumentSignature"("projectId");

-- CreateIndex
CREATE INDEX "DocumentSignature_projectVersionId_idx" ON "DocumentSignature"("projectVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentTask_ackToken_key" ON "IncidentTask"("ackToken");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_versionNumber_key" ON "ProjectVersion"("projectId", "versionNumber");

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
