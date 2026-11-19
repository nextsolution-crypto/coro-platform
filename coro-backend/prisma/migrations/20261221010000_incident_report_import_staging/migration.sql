CREATE TYPE "IncidentReportImportBatchStatus" AS ENUM (
  'STAGED', 'ANALYZED', 'MAPPING', 'READY', 'IMPORTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK'
);

CREATE TYPE "IncidentReportImportFileStatus" AS ENUM ('STAGED', 'ANALYZED', 'INVALID');

CREATE TABLE "IncidentReportImportBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceSchemaVersion" TEXT,
  "status" "IncidentReportImportBatchStatus" NOT NULL DEFAULT 'STAGED',
  "idempotencyKey" TEXT NOT NULL,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentReportImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportImportFile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "scanStatus" "IncidentReportAttachmentScanStatus" NOT NULL,
  "status" "IncidentReportImportFileStatus" NOT NULL DEFAULT 'STAGED',
  "detectedEncoding" TEXT,
  "headers" JSONB,
  "recordCount" INTEGER,
  "analysis" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "analyzedAt" TIMESTAMP(3),
  CONSTRAINT "IncidentReportImportFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportImportEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" "CoroActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportImportEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentReportImportBatch_organizationId_idempotencyKey_key" ON "IncidentReportImportBatch"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "IncidentReportImportBatch_id_organizationId_key" ON "IncidentReportImportBatch"("id", "organizationId");
CREATE INDEX "IncidentReportImportBatch_organizationId_buildingId_status_createdAt_idx" ON "IncidentReportImportBatch"("organizationId", "buildingId", "status", "createdAt");
CREATE UNIQUE INDEX "IncidentReportImportFile_organizationId_storageKey_key" ON "IncidentReportImportFile"("organizationId", "storageKey");
CREATE UNIQUE INDEX "IncidentReportImportFile_organizationId_batchId_sha256_key" ON "IncidentReportImportFile"("organizationId", "batchId", "sha256");
CREATE UNIQUE INDEX "IncidentReportImportFile_id_organizationId_key" ON "IncidentReportImportFile"("id", "organizationId");
CREATE INDEX "IncidentReportImportFile_organizationId_batchId_status_idx" ON "IncidentReportImportFile"("organizationId", "batchId", "status");
CREATE UNIQUE INDEX "IncidentReportImportEvent_organizationId_idempotencyKey_key" ON "IncidentReportImportEvent"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "IncidentReportImportEvent_id_organizationId_key" ON "IncidentReportImportEvent"("id", "organizationId");
CREATE INDEX "IncidentReportImportEvent_organizationId_batchId_occurredAt_idx" ON "IncidentReportImportEvent"("organizationId", "batchId", "occurredAt");

ALTER TABLE "IncidentReportImportBatch" ADD CONSTRAINT "IncidentReportImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportBatch" ADD CONSTRAINT "IncidentReportImportBatch_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportFile" ADD CONSTRAINT "IncidentReportImportFile_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportEvent" ADD CONSTRAINT "IncidentReportImportEvent_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

