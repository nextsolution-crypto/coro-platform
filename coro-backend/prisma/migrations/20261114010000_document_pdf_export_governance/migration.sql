CREATE TYPE "DocumentPdfExportStatus" AS ENUM ('PROCESSING', 'AVAILABLE', 'FAILED');

CREATE TABLE "DocumentPdfExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reviewRequestId" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "sourceHash" CHAR(64) NOT NULL,
    "language" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "status" "DocumentPdfExportStatus" NOT NULL DEFAULT 'PROCESSING',
    "artifacts" JSONB,
    "templateVersion" TEXT NOT NULL DEFAULT 'organization-document/v1',
    "generatorVersion" TEXT NOT NULL DEFAULT 'puppeteer-pdf-lib/v1',
    "generationStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationLeaseUntil" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentPdfExport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentPdfExport_projectId_idempotencyKey_key" ON "DocumentPdfExport"("projectId", "idempotencyKey");
CREATE INDEX "DocumentPdfExport_projectId_status_createdAt_idx" ON "DocumentPdfExport"("projectId", "status", "createdAt");
CREATE INDEX "DocumentPdfExport_organizationId_requestedById_createdAt_idx" ON "DocumentPdfExport"("organizationId", "requestedById", "createdAt");
CREATE INDEX "DocumentPdfExport_status_generationLeaseUntil_idx" ON "DocumentPdfExport"("status", "generationLeaseUntil");
CREATE INDEX "DocumentPdfExport_reviewRequestId_idx" ON "DocumentPdfExport"("reviewRequestId");
CREATE INDEX "DocumentPdfExport_projectVersionId_idx" ON "DocumentPdfExport"("projectVersionId");

ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_reviewRequestId_fkey" FOREIGN KEY ("reviewRequestId") REFERENCES "DocumentReviewRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentPdfExport" ADD CONSTRAINT "DocumentPdfExport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
