-- Sentinelle Population: scientific lineage and operational perimeter approval.
-- Existing zones remain readable but are not implicitly approved for LIVE alerts.

CREATE TYPE "RueImpactZonePurpose" AS ENUM (
  'MODELED_IMPACT',
  'PUBLIC_NOTIFICATION',
  'SHELTER_IN_PLACE',
  'EVACUATION',
  'EXCLUSION',
  'RESPONDER_STAGING',
  'OTHER'
);

ALTER TABLE "RueEmergencyScenario"
  ADD COLUMN "dispersionModelName" TEXT,
  ADD COLUMN "dispersionModelVersion" TEXT,
  ADD COLUMN "dispersionStudyTitle" TEXT,
  ADD COLUMN "dispersionStudyReference" TEXT,
  ADD COLUMN "dispersionStudyDate" TIMESTAMP(3),
  ADD COLUMN "toxicEndpointName" TEXT,
  ADD COLUMN "toxicEndpointConcentrationPpm" DOUBLE PRECISION,
  ADD COLUMN "toxicEndpointAveragingTimeSeconds" INTEGER,
  ADD COLUMN "windSpeedMetersPerSecond" DOUBLE PRECISION,
  ADD COLUMN "atmosphericStabilityClass" TEXT,
  ADD COLUMN "releaseDurationSeconds" INTEGER,
  ADD COLUMN "receptorHeightMeters" DOUBLE PRECISION,
  ADD COLUMN "dispersionAssumptions" TEXT,
  ADD COLUMN "dispersionLimitations" TEXT,
  ADD COLUMN "dispersionReviewedAt" TIMESTAMP(3),
  ADD COLUMN "dispersionReviewedByType" "CoroActorType",
  ADD COLUMN "dispersionReviewedById" TEXT,
  ADD COLUMN "dispersionSourceFileId" TEXT;

ALTER TABLE "RueImpactZone"
  ADD COLUMN "purpose" "RueImpactZonePurpose" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "approvedForAlerting" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alertingApprovedAt" TIMESTAMP(3),
  ADD COLUMN "alertingApprovedByType" "CoroActorType",
  ADD COLUMN "alertingApprovedById" TEXT;

CREATE INDEX "RueEmergencyScenario_dispersionSourceFileId_idx"
  ON "RueEmergencyScenario"("dispersionSourceFileId");

ALTER TABLE "RueEmergencyScenario"
  ADD CONSTRAINT "RueEmergencyScenario_dispersionSourceFileId_fkey"
  FOREIGN KEY ("dispersionSourceFileId") REFERENCES "ProjectFile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
