-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN "activityId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectActivity_id_projectId_organizationId_key"
ON "ProjectActivity"("id", "projectId", "organizationId");

-- CreateIndex
CREATE INDEX "ProjectTask_activityId_idx" ON "ProjectTask"("activityId");

-- CreateIndex
CREATE INDEX "ProjectTask_activityId_projectId_organizationId_idx"
ON "ProjectTask"("activityId", "projectId", "organizationId");

-- AddForeignKey
ALTER TABLE "ProjectTask"
ADD CONSTRAINT "ProjectTask_activityId_projectId_organizationId_fkey"
FOREIGN KEY ("activityId", "projectId", "organizationId")
REFERENCES "ProjectActivity"("id", "projectId", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
