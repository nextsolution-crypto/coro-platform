ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'EXERCISE_REPORT_REVIEW';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'EXERCISE_REPORT_APPROVE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'EXERCISE_REPORT_PUBLISH';
ALTER TYPE "ExerciseReportStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ExerciseReportStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TABLE "ExerciseReport"
  ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewSubmittedById" TEXT,
  ADD COLUMN "reviewSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "publishedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "templateVersionId" TEXT;

ALTER TABLE "ExerciseReportVersion"
  ADD COLUMN "publishedById" TEXT,
  ADD COLUMN "documentSha256" TEXT,
  ADD COLUMN "pdfStorageKey" TEXT,
  ADD COLUMN "pdfSize" INTEGER,
  ADD COLUMN "templateCode" TEXT,
  ADD COLUMN "templateVersion" INTEGER;

CREATE TABLE "ExerciseReportTemplateVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT, "code" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL, "sections" JSONB NOT NULL, "contentSha256" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT NOT NULL,
  "publishedById" TEXT NOT NULL, "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publicationReason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseReportTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseReportTemplateAuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT, "templateVersionId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "operation" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "requestId" TEXT NOT NULL, "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousEventHash" TEXT, "eventHash" TEXT NOT NULL,
  CONSTRAINT "ExerciseReportTemplateAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseReportAuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL, "operation" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "authorization" TEXT NOT NULL, "reason" TEXT, "requestId" TEXT NOT NULL,
  "previousState" JSONB NOT NULL, "resultingState" JSONB NOT NULL, "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousEventHash" TEXT, "eventHash" TEXT NOT NULL,
  CONSTRAINT "ExerciseReportAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseReportTemplateVersion_organizationId_code_version_key" ON "ExerciseReportTemplateVersion"("organizationId", "code", "version");
CREATE INDEX "ExerciseReportTemplateVersion_organizationId_code_isActive_idx" ON "ExerciseReportTemplateVersion"("organizationId", "code", "isActive");
CREATE UNIQUE INDEX "ExerciseReportAuditEvent_eventHash_key" ON "ExerciseReportAuditEvent"("eventHash");
CREATE INDEX "ExerciseReportAuditEvent_organizationId_reportId_occurredAt_idx" ON "ExerciseReportAuditEvent"("organizationId", "reportId", "occurredAt");
CREATE UNIQUE INDEX "ExerciseReportAuditEvent_reportId_requestId_operation_key" ON "ExerciseReportAuditEvent"("reportId", "requestId", "operation");
CREATE UNIQUE INDEX "ExerciseReportTemplateAuditEvent_eventHash_key" ON "ExerciseReportTemplateAuditEvent"("eventHash");
CREATE UNIQUE INDEX "ExerciseReportTemplateAuditEvent_templateVersionId_requestId_operation_key" ON "ExerciseReportTemplateAuditEvent"("templateVersionId", "requestId", "operation");
CREATE INDEX "ExerciseReportTemplateAuditEvent_organizationId_occurredAt_idx" ON "ExerciseReportTemplateAuditEvent"("organizationId", "occurredAt");

ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_reviewSubmittedById_fkey" FOREIGN KEY ("reviewSubmittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportVersion" ADD CONSTRAINT "ExerciseReportVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportTemplateVersion" ADD CONSTRAINT "ExerciseReportTemplateVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportTemplateVersion" ADD CONSTRAINT "ExerciseReportTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportTemplateVersion" ADD CONSTRAINT "ExerciseReportTemplateVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportTemplateAuditEvent" ADD CONSTRAINT "ExerciseReportTemplateAuditEvent_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ExerciseReportTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportTemplateAuditEvent" ADD CONSTRAINT "ExerciseReportTemplateAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportAuditEvent" ADD CONSTRAINT "ExerciseReportAuditEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseReportAuditEvent" ADD CONSTRAINT "ExerciseReportAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
