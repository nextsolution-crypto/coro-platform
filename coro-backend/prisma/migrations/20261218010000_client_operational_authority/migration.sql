CREATE TYPE "ClientOperationalPermission" AS ENUM (
  'INCIDENT_REPORT_READ', 'INCIDENT_REPORT_CREATE', 'INCIDENT_REPORT_EDIT',
  'INCIDENT_REPORT_REVIEW', 'INCIDENT_REPORT_APPROVE', 'INCIDENT_REPORT_EXPORT',
  'INCIDENT_REPORT_ADMIN', 'OPERATIONAL_LOG_READ', 'OPERATIONAL_LOG_CREATE',
  'OPERATIONAL_LOG_EDIT', 'OPERATIONAL_LOG_ADMIN', 'OPERATIONAL_SHIFT_READ',
  'OPERATIONAL_SHIFT_OPEN', 'OPERATIONAL_SHIFT_EDIT_OWN',
  'OPERATIONAL_HANDOVER_PREPARE', 'OPERATIONAL_HANDOVER_ACKNOWLEDGE',
  'OPERATIONAL_SHIFT_SUPERVISE', 'OPERATIONAL_SHIFT_EXCEPTION_CLOSE',
  'OPERATIONAL_SHIFT_ADMIN', 'OPERATIONAL_DIRECTIVE_READ',
  'OPERATIONAL_DIRECTIVE_CREATE', 'OPERATIONAL_DIRECTIVE_EDIT',
  'OPERATIONAL_DIRECTIVE_REVIEW', 'OPERATIONAL_DIRECTIVE_APPROVE',
  'OPERATIONAL_DIRECTIVE_PUBLISH', 'OPERATIONAL_DIRECTIVE_REVOKE',
  'OPERATIONAL_DIRECTIVE_ACKNOWLEDGE', 'OPERATIONAL_FOLLOWUP_READ',
  'OPERATIONAL_FOLLOWUP_CREATE', 'OPERATIONAL_FOLLOWUP_ASSIGN',
  'OPERATIONAL_FOLLOWUP_EXECUTE', 'OPERATIONAL_FOLLOWUP_VERIFY',
  'OPERATIONAL_FOLLOWUP_CLOSE', 'OPERATIONAL_FOLLOWUP_ADMIN',
  'CLIENT_OPERATIONAL_AUTHORITY_MANAGE'
);

ALTER TABLE "ClientUser"
  ADD COLUMN "operationalPermissions" "ClientOperationalPermission"[] NOT NULL DEFAULT ARRAY[]::"ClientOperationalPermission"[];

CREATE TABLE "ClientOperationalBuildingAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
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
  CONSTRAINT "ClientOperationalBuildingAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientOperationalBuildingAssignment_period_check"
    CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  CONSTRAINT "ClientOperationalBuildingAssignment_revocation_check"
    CHECK (
      ("status" = 'ACTIVE' AND "revokedAt" IS NULL AND "revokedByUserId" IS NULL AND "revocationReason" IS NULL)
      OR
      ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByUserId" IS NOT NULL AND length(trim("revocationReason")) > 0)
    )
);

CREATE UNIQUE INDEX "ClientOperationalBuildingAssignment_organizationId_buildingId_clientUserId_key"
  ON "ClientOperationalBuildingAssignment"("organizationId", "buildingId", "clientUserId");
CREATE UNIQUE INDEX "ClientOperationalBuildingAssignment_id_organizationId_key"
  ON "ClientOperationalBuildingAssignment"("id", "organizationId");
CREATE INDEX "ClientOperationalBuildingAssignment_organizationId_clientUserId_status_idx"
  ON "ClientOperationalBuildingAssignment"("organizationId", "clientUserId", "status");

ALTER TABLE "ClientOperationalBuildingAssignment"
  ADD CONSTRAINT "ClientOperationalBuildingAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClientOperationalBuildingAssignment_buildingId_organizationId_fkey"
  FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClientOperationalBuildingAssignment_clientUserId_organizationId_fkey"
  FOREIGN KEY ("clientUserId", "organizationId") REFERENCES "ClientUser"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClientOperationalBuildingAssignment_grantedByUserId_organizationId_fkey"
  FOREIGN KEY ("grantedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClientOperationalBuildingAssignment_revokedByUserId_organizationId_fkey"
  FOREIGN KEY ("revokedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
