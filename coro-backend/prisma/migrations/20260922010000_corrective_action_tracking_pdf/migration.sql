ALTER TABLE "CorrectiveActionTrackingReport"
  ADD COLUMN "snapshotCreatedByType" "CoroActorType",
  ADD COLUMN "snapshotCreatedById" TEXT,
  ADD COLUMN "generatedAt" TIMESTAMP(3),
  ADD COLUMN "generatorVersion" TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "reportSha256" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "finalizedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CorrectiveActionTrackingReport_storageKey_key" ON "CorrectiveActionTrackingReport"("storageKey");

ALTER TABLE "CorrectiveActionTrackingReport" ADD CONSTRAINT "CorrectiveActionTrackingReport_materialization_check" CHECK (
  ("status" = 'SNAPSHOT_READY' AND "generatedAt" IS NULL AND "generatorVersion" IS NULL AND "storageKey" IS NULL AND "fileSize" IS NULL AND "reportSha256" IS NULL AND "leaseExpiresAt" IS NULL AND "finalizedAt" IS NULL)
  OR ("status" = 'GENERATING' AND "snapshotCreatedByType" IS NOT NULL AND "snapshotCreatedById" IS NOT NULL
      AND "generatedAt" IS NOT NULL AND "generatorVersion" IS NOT NULL AND "storageKey" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "finalizedAt" IS NULL
      AND (("fileSize" IS NULL AND "reportSha256" IS NULL) OR ("fileSize" IS NOT NULL AND "fileSize" > 0 AND "reportSha256" IS NOT NULL AND "reportSha256" ~ '^[0-9a-f]{64}$')))
  OR ("status" = 'FINALIZED' AND "snapshotCreatedByType" IS NOT NULL AND "snapshotCreatedById" IS NOT NULL
      AND "generatedAt" IS NOT NULL AND "generatorVersion" IS NOT NULL AND "storageKey" IS NOT NULL AND "fileSize" IS NOT NULL AND "fileSize" > 0 AND "reportSha256" IS NOT NULL AND "reportSha256" ~ '^[0-9a-f]{64}$' AND "finalizedAt" IS NOT NULL)
);

DROP TRIGGER "CorrectiveActionTrackingReport_immutable" ON "CorrectiveActionTrackingReport";
CREATE OR REPLACE FUNCTION protect_corrective_action_tracking_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tracking report deletion forbidden'; END IF;
  IF OLD."status" = 'FINALIZED' THEN RAISE EXCEPTION 'FINALIZED tracking report is immutable'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW."operationalReviewId" IS DISTINCT FROM OLD."operationalReviewId" OR NEW."reviewVersion" IS DISTINCT FROM OLD."reviewVersion"
     OR NEW."reportVersion" IS DISTINCT FROM OLD."reportVersion" OR NEW."clientIntentId" IS DISTINCT FROM OLD."clientIntentId"
     OR NEW."snapshotAt" IS DISTINCT FROM OLD."snapshotAt" OR NEW."language" IS DISTINCT FROM OLD."language"
     OR NEW."format" IS DISTINCT FROM OLD."format" OR NEW."renderData" IS DISTINCT FROM OLD."renderData"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN RAISE EXCEPTION 'Tracking snapshot is immutable'; END IF;
  IF OLD."status" = 'SNAPSHOT_READY' THEN
    IF NEW."status" <> 'GENERATING' OR NEW."snapshotCreatedByType" IS DISTINCT FROM COALESCE(OLD."snapshotCreatedByType", OLD."generatedByType")
       OR NEW."snapshotCreatedById" IS DISTINCT FROM COALESCE(OLD."snapshotCreatedById", OLD."generatedById") THEN
      RAISE EXCEPTION 'Invalid tracking materialization reservation';
    END IF;
  ELSIF OLD."status" = 'GENERATING' THEN
    IF NEW."status" NOT IN ('GENERATING', 'FINALIZED') OR NEW."snapshotCreatedByType" IS DISTINCT FROM OLD."snapshotCreatedByType"
       OR NEW."snapshotCreatedById" IS DISTINCT FROM OLD."snapshotCreatedById"
       OR NEW."generatedByType" IS DISTINCT FROM OLD."generatedByType" OR NEW."generatedById" IS DISTINCT FROM OLD."generatedById"
       OR NEW."generatedAt" IS DISTINCT FROM OLD."generatedAt" OR NEW."generatorVersion" IS DISTINCT FROM OLD."generatorVersion"
       OR NEW."storageKey" IS DISTINCT FROM OLD."storageKey"
       OR (OLD."reportSha256" IS NOT NULL AND NEW."reportSha256" IS DISTINCT FROM OLD."reportSha256")
       OR (OLD."fileSize" IS NOT NULL AND NEW."fileSize" IS DISTINCT FROM OLD."fileSize") THEN
      RAISE EXCEPTION 'Invalid tracking materialization update';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CorrectiveActionTrackingReport_immutable"
BEFORE UPDATE OR DELETE ON "CorrectiveActionTrackingReport"
FOR EACH ROW EXECUTE FUNCTION protect_corrective_action_tracking_snapshot();
