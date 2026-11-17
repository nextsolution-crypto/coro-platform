ALTER TABLE "IncidentReportExport"
  ADD COLUMN "pageFormat" TEXT NOT NULL DEFAULT 'LETTER',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr-CA',
  ADD COLUMN "requestIdempotencyKey" TEXT;

UPDATE "IncidentReportExport" SET "requestIdempotencyKey" = "id"
WHERE "requestIdempotencyKey" IS NULL;

ALTER TABLE "IncidentReportExport"
  ALTER COLUMN "requestIdempotencyKey" SET NOT NULL;

ALTER TABLE "IncidentReportExport"
  ADD CONSTRAINT "IncidentReportExport_pageFormat_check"
    CHECK ("pageFormat" IN ('LETTER', 'A4')),
  ADD CONSTRAINT "IncidentReportExport_locale_check"
    CHECK ("locale" IN ('fr-CA', 'en-CA'));

CREATE UNIQUE INDEX "IncidentReportExport_organizationId_requestIdempotencyKey_key"
  ON "IncidentReportExport"("organizationId", "requestIdempotencyKey");
