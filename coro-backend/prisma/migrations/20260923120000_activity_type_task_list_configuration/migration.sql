CREATE TYPE "ActivityTypeTaskListMode" AS ENUM ('APPEND', 'REPLACE', 'DISABLE');

CREATE TABLE "ActivityTypeTaskListPolicy" (
    "id" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "mode" "ActivityTypeTaskListMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityTypeTaskListPolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActivityTypeTaskListPolicy_global_mode_check"
      CHECK ("organizationId" IS NOT NULL OR "mode" = 'REPLACE')
);

CREATE TABLE "ActivityTypeTaskList" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "taskListId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityTypeTaskList_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActivityTypeTaskList_display_order_check"
      CHECK ("displayOrder" BETWEEN 0 AND 100000)
);

CREATE INDEX "ActivityTypeTaskListPolicy_organizationId_activityTypeId_idx"
ON "ActivityTypeTaskListPolicy"("organizationId", "activityTypeId");
CREATE UNIQUE INDEX "ActivityTypeTaskListPolicy_activityTypeId_organizationId_key"
ON "ActivityTypeTaskListPolicy"("activityTypeId", "organizationId");
CREATE UNIQUE INDEX "ActivityTypeTaskListPolicy_global_activityTypeId_key"
ON "ActivityTypeTaskListPolicy"("activityTypeId") WHERE "organizationId" IS NULL;
CREATE INDEX "ActivityTypeTaskList_taskListId_idx" ON "ActivityTypeTaskList"("taskListId");
CREATE UNIQUE INDEX "ActivityTypeTaskList_policyId_taskListId_key"
ON "ActivityTypeTaskList"("policyId", "taskListId");
CREATE UNIQUE INDEX "ActivityTypeTaskList_policyId_displayOrder_key"
ON "ActivityTypeTaskList"("policyId", "displayOrder");

ALTER TABLE "ActivityTypeTaskListPolicy"
ADD CONSTRAINT "ActivityTypeTaskListPolicy_activityTypeId_fkey"
FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityTypeTaskListPolicy"
ADD CONSTRAINT "ActivityTypeTaskListPolicy_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityTypeTaskList"
ADD CONSTRAINT "ActivityTypeTaskList_policyId_fkey"
FOREIGN KEY ("policyId") REFERENCES "ActivityTypeTaskListPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityTypeTaskList"
ADD CONSTRAINT "ActivityTypeTaskList_taskListId_fkey"
FOREIGN KEY ("taskListId") REFERENCES "TaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
