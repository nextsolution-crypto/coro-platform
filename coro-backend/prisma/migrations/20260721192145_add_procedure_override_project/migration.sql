/*
  Warnings:

  - A unique constraint covering the columns `[procedureId,organizationId,projectId]` on the table `ProcedureOverride` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProcedureOverride_procedureId_organizationId_key";

-- AlterTable
ALTER TABLE "ProcedureOverride" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureOverride_procedureId_organizationId_projectId_key" ON "ProcedureOverride"("procedureId", "organizationId", "projectId");

-- AddForeignKey
ALTER TABLE "ProcedureOverride" ADD CONSTRAINT "ProcedureOverride_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
