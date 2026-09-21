CREATE TYPE "OperationalReviewReportStatus" AS ENUM ('GENERATING', 'FINALIZED');

CREATE TABLE "OperationalReviewReport" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "operationalReviewId" TEXT NOT NULL,
  "reviewVersion" INTEGER NOT NULL,
  "reportVersion" INTEGER NOT NULL DEFAULT 1,
  "format" TEXT NOT NULL DEFAULT 'PDF',
  "language" TEXT NOT NULL DEFAULT 'FR',
  "status" "OperationalReviewReportStatus" NOT NULL DEFAULT 'GENERATING',
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "generatedByType" "CoroActorType" NOT NULL,
  "generatedById" TEXT NOT NULL,
  "generatorVersion" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileSize" INTEGER,
  "reportSha256" TEXT,
  "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
  "renderData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  CONSTRAINT "OperationalReviewReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalReviewReport_versions_check" CHECK ("reviewVersion" > 0 AND "reportVersion" > 0),
  CONSTRAINT "OperationalReviewReport_format_check" CHECK ("format" = 'PDF'),
  CONSTRAINT "OperationalReviewReport_language_check" CHECK ("language" IN ('FR', 'EN')),
  CONSTRAINT "OperationalReviewReport_size_check" CHECK ("fileSize" IS NULL OR "fileSize" > 0),
  CONSTRAINT "OperationalReviewReport_sha_check" CHECK ("reportSha256" IS NULL OR "reportSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "OperationalReviewReport_final_check" CHECK (
    "status" <> 'FINALIZED' OR ("fileSize" IS NOT NULL AND "reportSha256" IS NOT NULL AND "finalizedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "OperationalReviewReport_storageKey_key" ON "OperationalReviewReport"("storageKey");
CREATE UNIQUE INDEX "OperationalReviewReport_identity_key" ON "OperationalReviewReport"("operationalReviewId", "reviewVersion", "reportVersion", "language", "format");
CREATE INDEX "OperationalReviewReport_organizationId_idx" ON "OperationalReviewReport"("organizationId");
CREATE INDEX "OperationalReviewReport_status_leaseExpiresAt_idx" ON "OperationalReviewReport"("status", "leaseExpiresAt");
ALTER TABLE "OperationalReviewReport" ADD CONSTRAINT "OperationalReviewReport_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
ALTER TABLE "OperationalReviewReport" ADD CONSTRAINT "OperationalReviewReport_review_fkey" FOREIGN KEY ("operationalReviewId", "organizationId") REFERENCES "OperationalReview"("id", "organizationId") ON DELETE RESTRICT;

CREATE FUNCTION protect_operational_review_report() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE review_status "OperationalReviewStatus"; review_version INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'OperationalReviewReport is write-once'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."status" = 'FINALIZED' THEN RAISE EXCEPTION 'FINALIZED OperationalReviewReport is immutable'; END IF;
    IF (NEW."id", NEW."organizationId", NEW."operationalReviewId", NEW."reviewVersion", NEW."reportVersion", NEW."format", NEW."language", NEW."generatedAt", NEW."generatedByType", NEW."generatedById", NEW."generatorVersion", NEW."storageKey", NEW."renderData", NEW."createdAt")
      IS DISTINCT FROM
       (OLD."id", OLD."organizationId", OLD."operationalReviewId", OLD."reviewVersion", OLD."reportVersion", OLD."format", OLD."language", OLD."generatedAt", OLD."generatedByType", OLD."generatedById", OLD."generatorVersion", OLD."storageKey", OLD."renderData", OLD."createdAt")
    THEN RAISE EXCEPTION 'OperationalReviewReport identity and render data are immutable'; END IF;
    RETURN NEW;
  END IF;
  SELECT "status", "version" INTO review_status, review_version FROM "OperationalReview"
  WHERE "id" = NEW."operationalReviewId" AND "organizationId" = NEW."organizationId" FOR SHARE;
  IF review_status IS DISTINCT FROM 'FINALIZED' OR review_version IS DISTINCT FROM NEW."reviewVersion" THEN
    RAISE EXCEPTION 'OperationalReviewReport requires matching FINALIZED review version';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "OperationalReviewReport_guard" BEFORE INSERT OR UPDATE OR DELETE ON "OperationalReviewReport"
FOR EACH ROW EXECUTE FUNCTION protect_operational_review_report();
