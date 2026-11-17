-- Additive Lot 3/4 metadata. Existing reports and attachments remain valid.
ALTER TABLE "IncidentReport"
  ADD COLUMN "reviewerUserId" TEXT,
  ADD COLUMN "reviewAssignedAt" TIMESTAMP(3);

ALTER TABLE "IncidentReportAttachment"
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedByActorId" TEXT,
  ADD COLUMN "revocationReason" TEXT;

CREATE INDEX "IncidentReport_organizationId_reviewerUserId_status_idx"
  ON "IncidentReport"("organizationId", "reviewerUserId", "status");
