-- P-4.1 additive incident command governance. No existing grant is expanded.
CREATE TYPE "IncidentPermission" AS ENUM ('INCIDENT_READ', 'INCIDENT_TASK_PARTICIPATE', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND', 'PCA_ACTIVATE');
CREATE TYPE "PcaActivationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'REVOKED');
CREATE TYPE "IncidentNotificationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED', 'EXHAUSTED', 'CANCELLED');
CREATE TYPE "IncidentAuthorityAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_READ';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_TASK_PARTICIPATE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_SUPERVISE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_COMMAND';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'PCA_ACTIVATE';

ALTER TABLE "ClientUser" ADD COLUMN "incidentPermissions" "IncidentPermission"[] NOT NULL DEFAULT ARRAY[]::"IncidentPermission"[];
ALTER TABLE "IncidentEvent" ADD COLUMN "publicAccessExpiresAt" TIMESTAMP(3), ADD COLUMN "publicAccessRevokedAt" TIMESTAMP(3), ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IncidentTask" ADD COLUMN "ackExpiresAt" TIMESTAMP(3), ADD COLUMN "ackRevokedAt" TIMESTAMP(3), ADD COLUMN "ackUsedAt" TIMESTAMP(3), ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "reassignedAt" TIMESTAMP(3), ADD COLUMN "reassignedByType" "CoroActorType", ADD COLUMN "reassignedById" TEXT;

CREATE TABLE "PcaActivation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
  "incidentEventId" TEXT, "status" "PcaActivationStatus" NOT NULL DEFAULT 'ACTIVE', "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "activatedByType" "CoroActorType" NOT NULL, "activatedById" TEXT NOT NULL, "activationReason" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedByType" "CoroActorType", "closedById" TEXT,
  "closedAt" TIMESTAMP(3), "closureReason" TEXT, "revokedByType" "CoroActorType", "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3), "revocationReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PcaActivation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PcaActivation_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PcaActivation_one_active_per_building_idx" ON "PcaActivation" ("organizationId", "buildingId") WHERE "status" = 'ACTIVE';
CREATE INDEX "PcaActivation_organizationId_buildingId_status_idx" ON "PcaActivation"("organizationId", "buildingId", "status");
CREATE INDEX "PcaActivation_incidentEventId_idx" ON "PcaActivation"("incidentEventId");
CREATE INDEX "PcaActivation_projectId_idx" ON "PcaActivation"("projectId");

CREATE TABLE "IncidentNotificationDelivery" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "incidentEventId" TEXT NOT NULL, "channel" TEXT NOT NULL,
  "recipientHash" TEXT NOT NULL, "encryptedEnvelope" TEXT NOT NULL, "encryptionKeyId" TEXT NOT NULL, "purpose" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "status" "IncidentNotificationStatus" NOT NULL DEFAULT 'QUEUED', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3, "providerMessageId" TEXT, "providerAcceptedAt" TIMESTAMP(3), "providerDeliveredAt" TIMESTAMP(3),
  "lastErrorCode" TEXT, "lastErrorAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "acknowledgedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "cancellationReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IncidentNotificationDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentNotificationDelivery_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentNotificationDelivery_idempotencyKey_key" ON "IncidentNotificationDelivery"("idempotencyKey");
CREATE INDEX "IncidentNotificationDelivery_organizationId_incidentEventId_idx" ON "IncidentNotificationDelivery"("organizationId", "incidentEventId");
CREATE INDEX "IncidentNotificationDelivery_status_nextAttemptAt_idx" ON "IncidentNotificationDelivery"("status", "nextAttemptAt");

CREATE TABLE "IncidentAuthorityAssignment" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL, "incidentEventId" TEXT,
  "subjectType" "CoroActorType" NOT NULL, "subjectId" TEXT NOT NULL, "operationalRole" TEXT NOT NULL,
  "permissions" "IncidentPermission"[] NOT NULL, "status" "IncidentAuthorityAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedByType" "CoroActorType" NOT NULL, "grantedById" TEXT NOT NULL, "grantReason" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedByType" "CoroActorType", "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3), "revocationReason" TEXT, "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentAuthorityAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentAuthorityAssignment_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentAuthorityAssignment_active_scope_idx" ON "IncidentAuthorityAssignment"("organizationId", "buildingId", COALESCE("incidentEventId", ''), "subjectType", "subjectId") WHERE "status" = 'ACTIVE';
CREATE INDEX "IncidentAuthorityAssignment_organizationId_buildingId_status_idx" ON "IncidentAuthorityAssignment"("organizationId", "buildingId", "status");
CREATE INDEX "IncidentAuthorityAssignment_incidentEventId_subjectType_subjectId_status_idx" ON "IncidentAuthorityAssignment"("incidentEventId", "subjectType", "subjectId", "status");

CREATE TABLE "IncidentAuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL, "incidentEventId" TEXT NOT NULL,
  "operation" TEXT NOT NULL, "actorType" "CoroActorType" NOT NULL, "actorId" TEXT NOT NULL,
  "authorizationAssignmentId" TEXT, "authorizationPermission" "IncidentPermission", "reason" TEXT, "requestId" TEXT,
  "previousState" JSONB, "resultingState" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousEventHash" TEXT, "eventHash" TEXT NOT NULL,
  CONSTRAINT "IncidentAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentAuditEvent_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IncidentAuditEvent_eventHash_key" ON "IncidentAuditEvent"("eventHash");
CREATE INDEX "IncidentAuditEvent_organizationId_incidentEventId_occurredAt_idx" ON "IncidentAuditEvent"("organizationId", "incidentEventId", "occurredAt");
CREATE INDEX "IncidentAuditEvent_actorType_actorId_occurredAt_idx" ON "IncidentAuditEvent"("actorType", "actorId", "occurredAt");
CREATE INDEX "IncidentAuditEvent_requestId_idx" ON "IncidentAuditEvent"("requestId");

CREATE OR REPLACE FUNCTION deny_incident_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'IncidentAuditEvent is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "IncidentAuditEvent_append_only_update" BEFORE UPDATE ON "IncidentAuditEvent" FOR EACH ROW EXECUTE FUNCTION deny_incident_audit_mutation();
CREATE TRIGGER "IncidentAuditEvent_append_only_delete" BEFORE DELETE ON "IncidentAuditEvent" FOR EACH ROW EXECUTE FUNCTION deny_incident_audit_mutation();
