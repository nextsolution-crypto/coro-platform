CREATE TYPE "OperationalReviewReportSupersessionReason" AS ENUM ('TECHNICAL_CORRECTION');

ALTER TABLE "OperationalReviewReport"
  ADD COLUMN "supersedesReportId" TEXT,
  ADD COLUMN "supersessionReason" "OperationalReviewReportSupersessionReason",
  ADD COLUMN "supersessionComment" TEXT,
  ADD CONSTRAINT "OperationalReviewReport_supersession_fields_check" CHECK (
    ("supersedesReportId" IS NULL AND "supersessionReason" IS NULL AND "supersessionComment" IS NULL)
    OR ("supersedesReportId" IS NOT NULL AND "supersessionReason" IS NOT NULL
        AND "supersessionComment" IS NOT NULL AND length(btrim("supersessionComment")) > 0)
  );

CREATE UNIQUE INDEX "OperationalReviewReport_supersedesReportId_key"
  ON "OperationalReviewReport"("supersedesReportId");
ALTER TABLE "OperationalReviewReport"
  ADD CONSTRAINT "OperationalReviewReport_supersedesReportId_fkey"
  FOREIGN KEY ("supersedesReportId") REFERENCES "OperationalReviewReport"("id") ON DELETE RESTRICT;

CREATE FUNCTION validate_operational_review_report_supersession() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predecessor "OperationalReviewReport"%ROWTYPE;
BEGIN
  IF NEW."supersedesReportId" IS NULL THEN
    IF NEW."reportVersion" <> 1 THEN RAISE EXCEPTION 'First report version must be 1'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO predecessor FROM "OperationalReviewReport" WHERE "id" = NEW."supersedesReportId" FOR SHARE;
  IF NOT FOUND OR predecessor."status" <> 'FINALIZED'
    OR (predecessor."organizationId", predecessor."operationalReviewId", predecessor."reviewVersion", predecessor."language", predecessor."format")
      IS DISTINCT FROM
       (NEW."organizationId", NEW."operationalReviewId", NEW."reviewVersion", NEW."language", NEW."format")
    OR NEW."reportVersion" <> predecessor."reportVersion" + 1
  THEN RAISE EXCEPTION 'Invalid report supersession series'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "OperationalReviewReport_supersession_guard"
BEFORE INSERT ON "OperationalReviewReport" FOR EACH ROW
EXECUTE FUNCTION validate_operational_review_report_supersession();

CREATE FUNCTION protect_operational_review_report_supersession_fields() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."supersedesReportId", NEW."supersessionReason", NEW."supersessionComment")
    IS DISTINCT FROM (OLD."supersedesReportId", OLD."supersessionReason", OLD."supersessionComment")
  THEN RAISE EXCEPTION 'Report supersession identity is immutable'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "OperationalReviewReport_supersession_fields_guard"
BEFORE UPDATE ON "OperationalReviewReport" FOR EACH ROW
EXECUTE FUNCTION protect_operational_review_report_supersession_fields();
