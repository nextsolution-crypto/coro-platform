-- CreateEnum
CREATE TYPE "ProjectMandateServiceStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProjectMandateServiceRecurrenceMode" AS ENUM ('ONCE', 'ANNUAL');

-- Add the composite candidate key used by the tenant/project-safe service relation.
ALTER TABLE "ProjectMandate"
ADD CONSTRAINT "ProjectMandate_id_projectId_organizationId_key"
UNIQUE ("id", "projectId", "organizationId");

-- CreateTable
CREATE TABLE "ProjectMandateService" (
    "id" TEXT NOT NULL,
    "projectMandateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "commercialStatus" "ProjectMandateServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "recurrenceMode" "ProjectMandateServiceRecurrenceMode" NOT NULL DEFAULT 'ONCE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "nameFRSnapshot" TEXT NOT NULL,
    "nameENSnapshot" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "removedById" TEXT,

    CONSTRAINT "ProjectMandateService_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectMandateService_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "ProjectMandateService_status_removed_at_check" CHECK (
        ("commercialStatus" = 'ACTIVE' AND "removedAt" IS NULL)
        OR
        ("commercialStatus" = 'REMOVED' AND "removedAt" IS NOT NULL)
    )
);

-- AlterTable
ALTER TABLE "ProjectActivity" ADD COLUMN "mandateServiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMandateService_id_projectId_organizationId_key"
ON "ProjectMandateService"("id", "projectId", "organizationId");

-- CreateIndex
CREATE INDEX "ProjectMandateService_organizationId_projectId_commercialStatus_idx"
ON "ProjectMandateService"("organizationId", "projectId", "commercialStatus");

-- CreateIndex
CREATE INDEX "ProjectMandateService_projectMandateId_commercialStatus_displayOrder_idx"
ON "ProjectMandateService"("projectMandateId", "commercialStatus", "displayOrder");

-- CreateIndex
CREATE INDEX "ProjectMandateService_activityTypeId_idx"
ON "ProjectMandateService"("activityTypeId");

-- CreateIndex
CREATE INDEX "ProjectActivity_mandateServiceId_idx"
ON "ProjectActivity"("mandateServiceId");

-- CreateIndex
CREATE INDEX "ProjectActivity_mandateServiceId_status_idx"
ON "ProjectActivity"("mandateServiceId", "status");

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_projectMandateId_projectId_organizationId_fkey"
FOREIGN KEY ("projectMandateId", "projectId", "organizationId")
REFERENCES "ProjectMandate"("id", "projectId", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_activityTypeId_fkey"
FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandateService"
ADD CONSTRAINT "ProjectMandateService_removedById_fkey"
FOREIGN KEY ("removedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivity"
ADD CONSTRAINT "ProjectActivity_mandateServiceId_projectId_organizationId_fkey"
FOREIGN KEY ("mandateServiceId", "projectId", "organizationId")
REFERENCES "ProjectMandateService"("id", "projectId", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
