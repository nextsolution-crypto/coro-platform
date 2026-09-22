ALTER TYPE "CorrectiveActionPermission" ADD VALUE 'CORRECTIVE_ACTION_REPORT_GENERATE';

CREATE TYPE "CorrectiveActionTrackingReportStatus" AS ENUM ('SNAPSHOT_READY', 'GENERATING', 'FINALIZED');

CREATE TABLE "CorrectiveActionTrackingReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "operationalReviewId" TEXT NOT NULL,
  "reviewVersion" INTEGER NOT NULL,
  "reportVersion" INTEGER NOT NULL,
  "clientIntentId" TEXT NOT NULL,
  "snapshotAt" TIMESTAMP(3) NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'FR',
  "format" TEXT NOT NULL DEFAULT 'PDF',
  "status" "CorrectiveActionTrackingReportStatus" NOT NULL DEFAULT 'SNAPSHOT_READY',
  "generatedByType" "CoroActorType" NOT NULL,
  "generatedById" TEXT NOT NULL,
  "renderData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorrectiveActionTrackingReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorrectiveActionTrackingReport_review_fkey" FOREIGN KEY ("operationalReviewId", "organizationId") REFERENCES "OperationalReview"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CorrectiveActionTrackingReport_organizationId_clientIntentId_key" ON "CorrectiveActionTrackingReport"("organizationId", "clientIntentId");
CREATE UNIQUE INDEX "CorrectiveActionTrackingReport_operationalReviewId_reviewVersion_reportVersion_language_format_key" ON "CorrectiveActionTrackingReport"("operationalReviewId", "reviewVersion", "reportVersion", "language", "format");
CREATE INDEX "CorrectiveActionTrackingReport_organizationId_operationalReviewId_idx" ON "CorrectiveActionTrackingReport"("organizationId", "operationalReviewId");

CREATE FUNCTION protect_corrective_action_tracking_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tracking snapshot deletion forbidden'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW."operationalReviewId" IS DISTINCT FROM OLD."operationalReviewId" OR NEW."reviewVersion" IS DISTINCT FROM OLD."reviewVersion"
     OR NEW."reportVersion" IS DISTINCT FROM OLD."reportVersion" OR NEW."clientIntentId" IS DISTINCT FROM OLD."clientIntentId"
     OR NEW."snapshotAt" IS DISTINCT FROM OLD."snapshotAt" OR NEW."language" IS DISTINCT FROM OLD."language"
     OR NEW."format" IS DISTINCT FROM OLD."format" OR NEW."generatedByType" IS DISTINCT FROM OLD."generatedByType"
     OR NEW."generatedById" IS DISTINCT FROM OLD."generatedById" OR NEW."renderData" IS DISTINCT FROM OLD."renderData"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Tracking snapshot is immutable';
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
    (OLD."status" = 'SNAPSHOT_READY' AND NEW."status" = 'GENERATING') OR
    (OLD."status" = 'GENERATING' AND NEW."status" IN ('SNAPSHOT_READY', 'FINALIZED'))
  ) THEN RAISE EXCEPTION 'Invalid tracking report transition'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "CorrectiveActionTrackingReport_immutable"
BEFORE UPDATE OR DELETE ON "CorrectiveActionTrackingReport"
FOR EACH ROW EXECUTE FUNCTION protect_corrective_action_tracking_snapshot();
