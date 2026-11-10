CREATE TYPE "DisplayPdfRenderJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "DisplayPdfRenderJob" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "sourceProjectFileId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "sourceSha256" CHAR(64) NOT NULL,
  "sourceStorageKey" TEXT NOT NULL,
  "sourceMimeType" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL DEFAULT 1,
  "targetDpi" INTEGER NOT NULL DEFAULT 300,
  "status" "DisplayPdfRenderJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "claimedBy" TEXT,
  "claimedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureDetail" TEXT,
  "engine" TEXT,
  "engineVersion" TEXT,
  "outputStorageKey" TEXT,
  "outputSha256" CHAR(64),
  "outputMimeType" TEXT,
  "widthPixels" INTEGER,
  "heightPixels" INTEGER,
  "renderMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayPdfRenderJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayPdfRenderJob_page_check" CHECK ("pageNumber" >= 1),
  CONSTRAINT "DisplayPdfRenderJob_dpi_check" CHECK ("targetDpi" BETWEEN 72 AND 300),
  CONSTRAINT "DisplayPdfRenderJob_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" BETWEEN 1 AND 3)
);

CREATE UNIQUE INDEX "DisplayPdfRenderJob_publicationId_requestId_key" ON "DisplayPdfRenderJob"("publicationId", "requestId");
CREATE INDEX "DisplayPdfRenderJob_status_nextAttemptAt_createdAt_idx" ON "DisplayPdfRenderJob"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "DisplayPdfRenderJob_organizationId_buildingId_publicationId_idx" ON "DisplayPdfRenderJob"("organizationId", "buildingId", "publicationId");

ALTER TABLE "DisplayPdfRenderJob" ADD CONSTRAINT "DisplayPdfRenderJob_publicationId_organizationId_buildingId_fkey"
  FOREIGN KEY ("publicationId", "organizationId", "buildingId") REFERENCES "DisplayPlanPublication"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayPdfRenderJob" ADD CONSTRAINT "DisplayPdfRenderJob_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayPdfRenderJob" ADD CONSTRAINT "DisplayPdfRenderJob_buildingId_organizationId_fkey"
  FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayPdfRenderJob" ADD CONSTRAINT "DisplayPdfRenderJob_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
