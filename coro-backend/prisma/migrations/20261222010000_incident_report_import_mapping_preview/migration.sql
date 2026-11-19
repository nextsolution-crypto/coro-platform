CREATE TABLE "IncidentReportImportMapping" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "rules" JSONB NOT NULL,
  "rulesHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportImportMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReportImportPreview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "mappingId" TEXT NOT NULL,
  "sourceFileHash" TEXT NOT NULL,
  "mappingHash" TEXT NOT NULL,
  "summary" JSONB NOT NULL,
  "conflicts" JSONB NOT NULL,
  "createdByActorType" "CoroActorType" NOT NULL,
  "createdByActorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReportImportPreview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentReportImportMapping_organizationId_batchId_version_key" ON "IncidentReportImportMapping"("organizationId", "batchId", "version");
CREATE UNIQUE INDEX "IncidentReportImportMapping_id_organizationId_key" ON "IncidentReportImportMapping"("id", "organizationId");
CREATE INDEX "IncidentReportImportMapping_organizationId_batchId_isActive_idx" ON "IncidentReportImportMapping"("organizationId", "batchId", "isActive");
CREATE UNIQUE INDEX "IncidentReportImportPreview_organizationId_batchId_fileId_mappingHash_sourceFileHash_key" ON "IncidentReportImportPreview"("organizationId", "batchId", "fileId", "mappingHash", "sourceFileHash");
CREATE UNIQUE INDEX "IncidentReportImportPreview_id_organizationId_key" ON "IncidentReportImportPreview"("id", "organizationId");
CREATE INDEX "IncidentReportImportPreview_organizationId_batchId_createdAt_idx" ON "IncidentReportImportPreview"("organizationId", "batchId", "createdAt");

ALTER TABLE "IncidentReportImportMapping" ADD CONSTRAINT "IncidentReportImportMapping_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportPreview" ADD CONSTRAINT "IncidentReportImportPreview_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "IncidentReportImportBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportPreview" ADD CONSTRAINT "IncidentReportImportPreview_fileId_organizationId_fkey" FOREIGN KEY ("fileId", "organizationId") REFERENCES "IncidentReportImportFile"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReportImportPreview" ADD CONSTRAINT "IncidentReportImportPreview_mappingId_organizationId_fkey" FOREIGN KEY ("mappingId", "organizationId") REFERENCES "IncidentReportImportMapping"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

