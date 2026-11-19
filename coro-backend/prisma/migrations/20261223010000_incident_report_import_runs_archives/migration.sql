CREATE TYPE "IncidentReportImportRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "IncidentReportImportItemStatus" AS ENUM ('IMPORTED', 'DUPLICATE', 'CONFLICT', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "IncidentReportHistoricalRecordStatus" AS ENUM ('ACTIVE', 'ROLLED_BACK');

CREATE TABLE "IncidentReportImportRun" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL, "fileId" TEXT NOT NULL, "mappingId" TEXT NOT NULL,
  "status" "IncidentReportImportRunStatus" NOT NULL DEFAULT 'PENDING',
  "cursor" INTEGER NOT NULL DEFAULT 0, "totalRecords" INTEGER NOT NULL,
  "importedCount" INTEGER NOT NULL DEFAULT 0, "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0, "failedCount" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL, "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "rolledBackAt" TIMESTAMP(3),
  "createdByActorType" "CoroActorType" NOT NULL, "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentReportImportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportImportItem" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "runId" TEXT NOT NULL,
  "sourceRow" INTEGER NOT NULL, "sourceObjectId" TEXT NOT NULL, "sourceHash" TEXT NOT NULL,
  "status" "IncidentReportImportItemStatus" NOT NULL, "historicalRecordId" TEXT,
  "errorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportImportItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportHistoricalRecord" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "importBatchId" TEXT NOT NULL, "importRunId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL, "sourceObjectType" TEXT NOT NULL, "sourceObjectId" TEXT NOT NULL,
  "sourceSchemaVersion" TEXT, "sourceHash" TEXT NOT NULL,
  "mappedContent" JSONB NOT NULL, "originalContent" JSONB NOT NULL, "provenanceManifest" JSONB NOT NULL,
  "status" "IncidentReportHistoricalRecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "rolledBackAt" TIMESTAMP(3),
  CONSTRAINT "IncidentReportHistoricalRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentReportImportRun_organizationId_idempotencyKey_key" ON "IncidentReportImportRun"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "IncidentReportImportRun_id_organizationId_key" ON "IncidentReportImportRun"("id", "organizationId");
CREATE INDEX "IncidentReportImportRun_organizationId_buildingId_status_createdAt_idx" ON "IncidentReportImportRun"("organizationId", "buildingId", "status", "createdAt");
CREATE UNIQUE INDEX "IncidentReportImportItem_organizationId_runId_sourceRow_key" ON "IncidentReportImportItem"("organizationId", "runId", "sourceRow");
CREATE UNIQUE INDEX "IncidentReportImportItem_id_organizationId_key" ON "IncidentReportImportItem"("id", "organizationId");
CREATE INDEX "IncidentReportImportItem_organizationId_runId_status_idx" ON "IncidentReportImportItem"("organizationId", "runId", "status");
CREATE UNIQUE INDEX "IncidentReportHistoricalRecord_organizationId_sourceSystem_sourceObjectType_sourceObjectId_key" ON "IncidentReportHistoricalRecord"("organizationId", "sourceSystem", "sourceObjectType", "sourceObjectId");
CREATE UNIQUE INDEX "IncidentReportHistoricalRecord_id_organizationId_key" ON "IncidentReportHistoricalRecord"("id", "organizationId");
CREATE INDEX "IncidentReportHistoricalRecord_organizationId_buildingId_status_importedAt_idx" ON "IncidentReportHistoricalRecord"("organizationId", "buildingId", "status", "importedAt");
CREATE INDEX "IncidentReportHistoricalRecord_organizationId_importRunId_idx" ON "IncidentReportHistoricalRecord"("organizationId", "importRunId");

ALTER TABLE "IncidentReportImportRun" ADD CONSTRAINT "IncidentReportImportRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportRun" ADD CONSTRAINT "IncidentReportImportRun_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportRun" ADD CONSTRAINT "IncidentReportImportRun_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportRun" ADD CONSTRAINT "IncidentReportImportRun_fileId_organizationId_fkey" FOREIGN KEY ("fileId", "organizationId") REFERENCES "IncidentReportImportFile"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportRun" ADD CONSTRAINT "IncidentReportImportRun_mappingId_organizationId_fkey" FOREIGN KEY ("mappingId", "organizationId") REFERENCES "IncidentReportImportMapping"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportItem" ADD CONSTRAINT "IncidentReportImportItem_runId_organizationId_fkey" FOREIGN KEY ("runId", "organizationId") REFERENCES "IncidentReportImportRun"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportHistoricalRecord" ADD CONSTRAINT "IncidentReportHistoricalRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportHistoricalRecord" ADD CONSTRAINT "IncidentReportHistoricalRecord_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportHistoricalRecord" ADD CONSTRAINT "IncidentReportHistoricalRecord_importBatchId_organizationId_fkey" FOREIGN KEY ("importBatchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportHistoricalRecord" ADD CONSTRAINT "IncidentReportHistoricalRecord_importRunId_organizationId_fkey" FOREIGN KEY ("importRunId", "organizationId") REFERENCES "IncidentReportImportRun"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportItem" ADD CONSTRAINT "IncidentReportImportItem_historicalRecordId_organizationId_fkey" FOREIGN KEY ("historicalRecordId", "organizationId") REFERENCES "IncidentReportHistoricalRecord"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

