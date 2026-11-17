ALTER TABLE "IncidentReport" ADD COLUMN "creationIdempotencyKey" TEXT;
ALTER TABLE "IncidentReportAuditEvent" ADD COLUMN "idempotencyKey" TEXT;

UPDATE "IncidentReport"
SET "creationIdempotencyKey" = 'legacy:' || "id"
WHERE "creationIdempotencyKey" IS NULL;

ALTER TABLE "IncidentReport" ALTER COLUMN "creationIdempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "IncidentReport_organizationId_creationIdempotencyKey_key"
ON "IncidentReport"("organizationId", "creationIdempotencyKey");

CREATE UNIQUE INDEX "IncidentReportAuditEvent_organizationId_idempotencyKey_key"
ON "IncidentReportAuditEvent"("organizationId", "idempotencyKey");
