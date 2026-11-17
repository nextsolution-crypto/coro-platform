ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_LOG_READ';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_LOG_CREATE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_LOG_EDIT';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_LOG_ADMIN';

CREATE TYPE "OperationalLogPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "OperationalLogEntryStatus" AS ENUM ('OPEN', 'FOLLOW_UP', 'RESOLVED', 'ARCHIVED');
CREATE TYPE "OperationalLogAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "OperationalLogBuildingAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OperationalLogAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "grantedByUserId" TEXT NOT NULL,
  "grantReason" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalLogBuildingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalLogEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "floorId" TEXT,
  "zoneId" TEXT,
  "incidentEventId" TEXT,
  "incidentReportId" TEXT,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorUserId" TEXT NOT NULL,
  "shiftReference" TEXT,
  "locationLabel" TEXT,
  "activityType" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "priority" "OperationalLogPriority" NOT NULL DEFAULT 'NORMAL',
  "description" TEXT NOT NULL,
  "people" JSONB,
  "vehicles" JSONB,
  "equipment" JSONB,
  "actionsTaken" JSONB,
  "status" "OperationalLogEntryStatus" NOT NULL DEFAULT 'OPEN',
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpSummary" TEXT,
  "creationIdempotencyKey" TEXT NOT NULL,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalLogEntryRevision" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "beforeSnapshot" JSONB NOT NULL,
  "afterSnapshot" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalLogEntryRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalLogAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalLogAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalLogBuildingAssignment_organizationId_buildingId_userId_key" ON "OperationalLogBuildingAssignment"("organizationId", "buildingId", "userId");
CREATE UNIQUE INDEX "OperationalLogBuildingAssignment_id_organizationId_key" ON "OperationalLogBuildingAssignment"("id", "organizationId");
CREATE INDEX "OperationalLogBuildingAssignment_organizationId_userId_status_idx" ON "OperationalLogBuildingAssignment"("organizationId", "userId", "status");
CREATE UNIQUE INDEX "OperationalLogEntry_organizationId_creationIdempotencyKey_key" ON "OperationalLogEntry"("organizationId", "creationIdempotencyKey");
CREATE UNIQUE INDEX "OperationalLogEntry_id_organizationId_key" ON "OperationalLogEntry"("id", "organizationId");
CREATE INDEX "OperationalLogEntry_organizationId_buildingId_eventAt_id_idx" ON "OperationalLogEntry"("organizationId", "buildingId", "eventAt", "id");
CREATE INDEX "OperationalLogEntry_organizationId_buildingId_status_priority_eventAt_idx" ON "OperationalLogEntry"("organizationId", "buildingId", "status", "priority", "eventAt");
CREATE INDEX "OperationalLogEntry_organizationId_incidentReportId_idx" ON "OperationalLogEntry"("organizationId", "incidentReportId");
CREATE UNIQUE INDEX "OperationalLogEntryRevision_entryId_revisionNumber_key" ON "OperationalLogEntryRevision"("entryId", "revisionNumber");
CREATE UNIQUE INDEX "OperationalLogEntryRevision_organizationId_idempotencyKey_key" ON "OperationalLogEntryRevision"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "OperationalLogEntryRevision_id_organizationId_key" ON "OperationalLogEntryRevision"("id", "organizationId");
CREATE INDEX "OperationalLogEntryRevision_organizationId_entryId_createdAt_idx" ON "OperationalLogEntryRevision"("organizationId", "entryId", "createdAt");
CREATE UNIQUE INDEX "OperationalLogAuditEvent_organizationId_idempotencyKey_key" ON "OperationalLogAuditEvent"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "OperationalLogAuditEvent_id_organizationId_key" ON "OperationalLogAuditEvent"("id", "organizationId");
CREATE INDEX "OperationalLogAuditEvent_organizationId_entryId_occurredAt_idx" ON "OperationalLogAuditEvent"("organizationId", "entryId", "occurredAt");

ALTER TABLE "OperationalLogBuildingAssignment" ADD CONSTRAINT "OperationalLogBuildingAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogBuildingAssignment" ADD CONSTRAINT "OperationalLogBuildingAssignment_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogBuildingAssignment" ADD CONSTRAINT "OperationalLogBuildingAssignment_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogBuildingAssignment" ADD CONSTRAINT "OperationalLogBuildingAssignment_grantedByUserId_organizationId_fkey" FOREIGN KEY ("grantedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogBuildingAssignment" ADD CONSTRAINT "OperationalLogBuildingAssignment_revokedByUserId_organizationId_fkey" FOREIGN KEY ("revokedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_floorId_organizationId_buildingId_fkey" FOREIGN KEY ("floorId", "organizationId", "buildingId") REFERENCES "BuildingFloor"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_zoneId_organizationId_buildingId_floorId_fkey" FOREIGN KEY ("zoneId", "organizationId", "buildingId", "floorId") REFERENCES "BuildingZone"("id", "organizationId", "buildingId", "floorId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_incidentEventId_organizationId_fkey" FOREIGN KEY ("incidentEventId", "organizationId") REFERENCES "IncidentEvent"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_incidentReportId_organizationId_fkey" FOREIGN KEY ("incidentReportId", "organizationId") REFERENCES "IncidentReport"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_authorUserId_organizationId_fkey" FOREIGN KEY ("authorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntryRevision" ADD CONSTRAINT "OperationalLogEntryRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntryRevision" ADD CONSTRAINT "OperationalLogEntryRevision_entryId_organizationId_fkey" FOREIGN KEY ("entryId", "organizationId") REFERENCES "OperationalLogEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogEntryRevision" ADD CONSTRAINT "OperationalLogEntryRevision_authorUserId_organizationId_fkey" FOREIGN KEY ("authorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogAuditEvent" ADD CONSTRAINT "OperationalLogAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogAuditEvent" ADD CONSTRAINT "OperationalLogAuditEvent_entryId_organizationId_fkey" FOREIGN KEY ("entryId", "organizationId") REFERENCES "OperationalLogEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalLogAuditEvent" ADD CONSTRAINT "OperationalLogAuditEvent_actorUserId_organizationId_fkey" FOREIGN KEY ("actorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
