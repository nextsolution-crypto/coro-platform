CREATE TYPE "ProjectTaskListInstantiationSource" AS ENUM ('ACTIVITY_TYPE_CONFIG');

ALTER TABLE "ProjectTaskList"
ADD COLUMN "activityId" TEXT,
ADD COLUMN "instantiationSource" "ProjectTaskListInstantiationSource",
ADD COLUMN "sourceActivityTypeTaskListId" TEXT;

CREATE INDEX "ProjectTaskList_activityId_idx" ON "ProjectTaskList"("activityId");
CREATE INDEX "ProjectTaskList_activityId_taskListId_idx" ON "ProjectTaskList"("activityId", "taskListId");
CREATE UNIQUE INDEX "ProjectTaskList_activity_config_unique"
ON "ProjectTaskList"("activityId", "taskListId")
WHERE "activityId" IS NOT NULL AND "instantiationSource" = 'ACTIVITY_TYPE_CONFIG';

ALTER TABLE "ProjectTaskList"
ADD CONSTRAINT "ProjectTaskList_activityId_projectId_organizationId_fkey"
FOREIGN KEY ("activityId", "projectId", "organizationId")
REFERENCES "ProjectActivity"("id", "projectId", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
