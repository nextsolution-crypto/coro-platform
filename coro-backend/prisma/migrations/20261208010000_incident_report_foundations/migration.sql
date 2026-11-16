ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_READ';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_CREATE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_EDIT';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_REVIEW';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_APPROVE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_EXPORT';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORT_ADMIN';

CREATE TYPE "IncidentReportStatus" AS ENUM ('DRAFT','SUBMITTED','IN_REVIEW','APPROVED','PUBLISHED','SUPERSEDED','ARCHIVED');
CREATE TYPE "IncidentReportVersionStatus" AS ENUM ('DRAFT','SUBMITTED','REJECTED','APPROVED','PUBLISHED','SUPERSEDED');
CREATE TYPE "IncidentReportTemplateStatus" AS ENUM ('DRAFT','PUBLISHED','RETIRED');
CREATE TYPE "IncidentReportApprovalDecision" AS ENUM ('REVIEWED','APPROVED','REJECTED','CORRECTION_REQUESTED');
CREATE TYPE "IncidentReportAttachmentScanStatus" AS ENUM ('PENDING','CLEAN','INFECTED','FAILED');
CREATE TYPE "IncidentReportExportStatus" AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED');
CREATE TYPE "IncidentReportExternalMappingStatus" AS ENUM ('MAPPED','PARTIAL','UNMAPPED','CONFLICT','REJECTED');

CREATE UNIQUE INDEX "IncidentEvent_id_organizationId_key" ON "IncidentEvent"("id", "organizationId");

CREATE TABLE "IncidentReportTemplateVersion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "status" "IncidentReportTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "schemaVersion" TEXT NOT NULL,
  "formSchema" JSONB NOT NULL,
  "fieldCatalog" JSONB NOT NULL,
  "mappingMetadata" JSONB,
  "contentHash" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportTemplateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReportTemplateVersion_version_check" CHECK ("version" > 0)
);

CREATE TABLE "IncidentReportRetentionPolicy" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "retainForDays" INTEGER NOT NULL,
  "legalHoldAllowed" BOOLEAN NOT NULL DEFAULT true,
  "attachmentRetainDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentReportRetentionPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReportRetentionPolicy_days_check" CHECK ("retainForDays" > 0 AND ("attachmentRetainDays" IS NULL OR "attachmentRetainDays" > 0))
);

CREATE TABLE "IncidentReport" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "incidentEventId" TEXT,
  "templateVersionId" TEXT NOT NULL,
  "retentionPolicyId" TEXT NOT NULL,
  "reportNumber" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "IncidentReportStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "legalHold" BOOLEAN NOT NULL DEFAULT false,
  "retentionExpiresAt" TIMESTAMP(3),
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "submittedByActorType" "CoroActorType",
  "submittedByActorId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReport_version_check" CHECK ("currentVersionNumber" > 0),
  CONSTRAINT "IncidentReport_submit_actor_check" CHECK (("submittedByActorType" IS NULL) = ("submittedByActorId" IS NULL))
);

CREATE TABLE "IncidentReportVersion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "IncidentReportVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "content" JSONB NOT NULL,
  "legacyPayload" JSONB,
  "provenanceManifest" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "immutableAt" TIMESTAMP(3),
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReportVersion_number_check" CHECK ("versionNumber" > 0)
);

CREATE TABLE "IncidentReportAttachment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "reportVersionId" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "scanStatus" "IncidentReportAttachmentScanStatus" NOT NULL DEFAULT 'PENDING',
  "scannedAt" TIMESTAMP(3),
  "provenance" JSONB,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReportAttachment_size_check" CHECK ("sizeBytes" > 0)
);

CREATE TABLE "IncidentReportApproval" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "reportVersionId" TEXT NOT NULL,
  "decision" "IncidentReportApprovalDecision" NOT NULL,
  "comment" TEXT,
  "actorType" "CoroActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRoleSnapshot" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "IncidentReportApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportExport" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "reportVersionId" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" "IncidentReportExportStatus" NOT NULL DEFAULT 'PENDING',
  "storageKey" TEXT,
  "sha256" TEXT,
  "rendererVersion" TEXT NOT NULL,
  "sourceManifest" JSONB NOT NULL,
  "failureCode" TEXT,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "IncidentReportExport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalSourceReference" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "reportVersionId" TEXT,
  "sourceSystem" TEXT NOT NULL,
  "sourceSchemaVersion" TEXT,
  "sourceObjectType" TEXT NOT NULL,
  "sourceObjectId" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "originalValue" JSONB,
  "rawPayloadStorageKey" TEXT,
  "rawPayloadSha256" TEXT,
  "mappingVersion" TEXT,
  "mappingStatus" "IncidentReportExternalMappingStatus" NOT NULL DEFAULT 'UNMAPPED',
  "mappingEvidence" JSONB,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalSourceReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportAuditEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" "CoroActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentReportTemplateVersion_org_key_version_key" ON "IncidentReportTemplateVersion"("organizationId","templateKey","version");
CREATE UNIQUE INDEX "IncidentReportTemplateVersion_id_org_key" ON "IncidentReportTemplateVersion"("id","organizationId");
CREATE INDEX "IncidentReportTemplateVersion_org_type_status_idx" ON "IncidentReportTemplateVersion"("organizationId","reportType","status");
CREATE UNIQUE INDEX "IncidentReportRetentionPolicy_org_type_key" ON "IncidentReportRetentionPolicy"("organizationId","reportType");
CREATE UNIQUE INDEX "IncidentReportRetentionPolicy_id_org_key" ON "IncidentReportRetentionPolicy"("id","organizationId");
CREATE INDEX "IncidentReportRetentionPolicy_org_active_idx" ON "IncidentReportRetentionPolicy"("organizationId","isActive");
CREATE UNIQUE INDEX "IncidentReport_org_number_key" ON "IncidentReport"("organizationId","reportNumber");
CREATE UNIQUE INDEX "IncidentReport_id_org_key" ON "IncidentReport"("id","organizationId");
CREATE INDEX "IncidentReport_org_building_status_created_id_idx" ON "IncidentReport"("organizationId","buildingId","status","createdAt","id");
CREATE INDEX "IncidentReport_org_incident_idx" ON "IncidentReport"("organizationId","incidentEventId");
CREATE UNIQUE INDEX "IncidentReportVersion_report_number_key" ON "IncidentReportVersion"("reportId","versionNumber");
CREATE UNIQUE INDEX "IncidentReportVersion_id_org_key" ON "IncidentReportVersion"("id","organizationId");
CREATE INDEX "IncidentReportVersion_org_report_status_idx" ON "IncidentReportVersion"("organizationId","reportId","status");
CREATE UNIQUE INDEX "IncidentReportAttachment_org_storage_key" ON "IncidentReportAttachment"("organizationId","storageKey");
CREATE UNIQUE INDEX "IncidentReportAttachment_id_org_key" ON "IncidentReportAttachment"("id","organizationId");
CREATE INDEX "IncidentReportAttachment_org_report_version_idx" ON "IncidentReportAttachment"("organizationId","reportId","reportVersionId");
CREATE INDEX "IncidentReportAttachment_org_scan_idx" ON "IncidentReportAttachment"("organizationId","scanStatus");
CREATE UNIQUE INDEX "IncidentReportApproval_org_idempotency_key" ON "IncidentReportApproval"("organizationId","idempotencyKey");
CREATE UNIQUE INDEX "IncidentReportApproval_id_org_key" ON "IncidentReportApproval"("id","organizationId");
CREATE INDEX "IncidentReportApproval_org_report_version_decided_idx" ON "IncidentReportApproval"("organizationId","reportId","reportVersionId","decidedAt");
CREATE UNIQUE INDEX "IncidentReportExport_org_storage_key" ON "IncidentReportExport"("organizationId","storageKey");
CREATE UNIQUE INDEX "IncidentReportExport_id_org_key" ON "IncidentReportExport"("id","organizationId");
CREATE INDEX "IncidentReportExport_org_report_status_idx" ON "IncidentReportExport"("organizationId","reportId","status");
CREATE UNIQUE INDEX "ExternalSourceReference_source_key" ON "ExternalSourceReference"("organizationId","sourceSystem","sourceObjectType","sourceObjectId");
CREATE UNIQUE INDEX "ExternalSourceReference_id_org_key" ON "ExternalSourceReference"("id","organizationId");
CREATE INDEX "ExternalSourceReference_org_report_status_idx" ON "ExternalSourceReference"("organizationId","reportId","mappingStatus");
CREATE UNIQUE INDEX "IncidentReportAuditEvent_id_org_key" ON "IncidentReportAuditEvent"("id","organizationId");
CREATE INDEX "IncidentReportAuditEvent_org_report_time_idx" ON "IncidentReportAuditEvent"("organizationId","reportId","occurredAt");

ALTER TABLE "IncidentReportTemplateVersion" ADD CONSTRAINT "IncidentReportTemplateVersion_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportRetentionPolicy" ADD CONSTRAINT "IncidentReportRetentionPolicy_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_building_org_fkey" FOREIGN KEY ("buildingId","organizationId") REFERENCES "Building"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_incident_org_fkey" FOREIGN KEY ("incidentEventId","organizationId") REFERENCES "IncidentEvent"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_template_org_fkey" FOREIGN KEY ("templateVersionId","organizationId") REFERENCES "IncidentReportTemplateVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_retention_org_fkey" FOREIGN KEY ("retentionPolicyId","organizationId") REFERENCES "IncidentReportRetentionPolicy"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportVersion" ADD CONSTRAINT "IncidentReportVersion_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportVersion" ADD CONSTRAINT "IncidentReportVersion_template_org_fkey" FOREIGN KEY ("templateVersionId","organizationId") REFERENCES "IncidentReportTemplateVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAttachment" ADD CONSTRAINT "IncidentReportAttachment_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAttachment" ADD CONSTRAINT "IncidentReportAttachment_version_org_fkey" FOREIGN KEY ("reportVersionId","organizationId") REFERENCES "IncidentReportVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportApproval" ADD CONSTRAINT "IncidentReportApproval_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportApproval" ADD CONSTRAINT "IncidentReportApproval_version_org_fkey" FOREIGN KEY ("reportVersionId","organizationId") REFERENCES "IncidentReportVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportExport" ADD CONSTRAINT "IncidentReportExport_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportExport" ADD CONSTRAINT "IncidentReportExport_version_org_fkey" FOREIGN KEY ("reportVersionId","organizationId") REFERENCES "IncidentReportVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "ExternalSourceReference" ADD CONSTRAINT "ExternalSourceReference_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "ExternalSourceReference" ADD CONSTRAINT "ExternalSourceReference_version_org_fkey" FOREIGN KEY ("reportVersionId","organizationId") REFERENCES "IncidentReportVersion"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAuditEvent" ADD CONSTRAINT "IncidentReportAuditEvent_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "IncidentReportAuditEvent" ADD CONSTRAINT "IncidentReportAuditEvent_report_org_fkey" FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId") ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION incident_report_version_immutable_guard() RETURNS trigger AS $$
BEGIN
  IF OLD."immutableAt" IS NOT NULL AND (
    NEW."content" IS DISTINCT FROM OLD."content" OR
    NEW."legacyPayload" IS DISTINCT FROM OLD."legacyPayload" OR
    NEW."provenanceManifest" IS DISTINCT FROM OLD."provenanceManifest" OR
    NEW."contentHash" IS DISTINCT FROM OLD."contentHash" OR
    NEW."templateVersionId" IS DISTINCT FROM OLD."templateVersionId" OR
    NEW."versionNumber" IS DISTINCT FROM OLD."versionNumber" OR
    NEW."createdByActorType" IS DISTINCT FROM OLD."createdByActorType" OR
    NEW."createdByActorId" IS DISTINCT FROM OLD."createdByActorId"
  ) THEN
    RAISE EXCEPTION 'incident report version is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IncidentReportVersion_immutable_guard"
BEFORE UPDATE ON "IncidentReportVersion"
FOR EACH ROW EXECUTE FUNCTION incident_report_version_immutable_guard();
