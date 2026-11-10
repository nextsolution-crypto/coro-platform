ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_CLIENT_PLAN_READ';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_CLIENT_PREVIEW';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_CLIENT_LOCATION_READ';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_CLIENT_OBSERVATION_SUBMIT';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_CLIENT_OBSERVATION_READ';

CREATE TYPE "DisplayCorrectionCategory" AS ENUM ('EXTINGUISHER_MOVED','EXIT_CHANGED','DOOR_BLOCKED','NEW_PARTITION','ROOM_NUMBER_CHANGED','ROUTE_CHANGED','SAFETY_EQUIPMENT_MISSING','DOCUMENT_INFORMATION_INCORRECT','OTHER');
CREATE TYPE "DisplayCorrectionPriority" AS ENUM ('INFORMATION','MINOR','MAJOR','CRITICAL');
CREATE TYPE "DisplayCorrectionStatus" AS ENUM ('SUBMITTED','UNDER_REVIEW','MORE_INFO_REQUIRED','ACCEPTED','REJECTED','CORRECTION_IN_PROGRESS','RESOLVED','CLOSED');

CREATE TABLE "DisplayCorrectionObservation" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "publicationVersion" INTEGER NOT NULL,
  "variantVersion" INTEGER NOT NULL,
  "variantSha256" CHAR(64) NOT NULL,
  "category" "DisplayCorrectionCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "suggestedPriority" "DisplayCorrectionPriority" NOT NULL,
  "status" "DisplayCorrectionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "normalizedX" DOUBLE PRECISION,
  "normalizedY" DOUBLE PRECISION,
  "submittedByClientUserId" TEXT NOT NULL,
  "submissionRequestId" TEXT NOT NULL,
  "clientVisibleResponse" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayCorrectionObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayCorrectionObservation_coordinates_check" CHECK (("normalizedX" IS NULL AND "normalizedY" IS NULL) OR ("normalizedX" BETWEEN 0 AND 1 AND "normalizedY" BETWEEN 0 AND 1))
);

CREATE TABLE "DisplayCorrectionObservationEvent" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "status" "DisplayCorrectionStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "actorClientUserId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayCorrectionObservationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisplayCorrectionObservation_reference_key" ON "DisplayCorrectionObservation"("reference");
CREATE UNIQUE INDEX "DisplayCorrectionObservation_submittedByClientUserId_submissionRequestId_key" ON "DisplayCorrectionObservation"("submittedByClientUserId","submissionRequestId");
CREATE UNIQUE INDEX "DisplayCorrectionObservation_id_organizationId_buildingId_key" ON "DisplayCorrectionObservation"("id","organizationId","buildingId");
CREATE INDEX "DisplayCorrectionObservation_organizationId_clientId_buildingId_status_updatedAt_idx" ON "DisplayCorrectionObservation"("organizationId","clientId","buildingId","status","updatedAt");
CREATE INDEX "DisplayCorrectionObservation_publicationId_publicationVersion_variantVersion_idx" ON "DisplayCorrectionObservation"("publicationId","publicationVersion","variantVersion");
CREATE INDEX "DisplayCorrectionObservationEvent_observationId_createdAt_idx" ON "DisplayCorrectionObservationEvent"("observationId","createdAt");
CREATE INDEX "DisplayCorrectionObservationEvent_organizationId_buildingId_createdAt_idx" ON "DisplayCorrectionObservationEvent"("organizationId","buildingId","createdAt");

ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_clientId_organizationId_fkey" FOREIGN KEY ("clientId","organizationId") REFERENCES "Client"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_buildingId_clientId_organizationId_fkey" FOREIGN KEY ("buildingId","clientId","organizationId") REFERENCES "Building"("id","clientId","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_floorId_organizationId_buildingId_fkey" FOREIGN KEY ("floorId","organizationId","buildingId") REFERENCES "BuildingFloor"("id","organizationId","buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_locationId_organizationId_buildingId_floorId_fkey" FOREIGN KEY ("locationId","organizationId","buildingId","floorId") REFERENCES "DisplayLocation"("id","organizationId","buildingId","floorId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_publicationId_organizationId_buildingId_fkey" FOREIGN KEY ("publicationId","organizationId","buildingId") REFERENCES "DisplayPlanPublication"("id","organizationId","buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservation" ADD CONSTRAINT "DisplayCorrectionObservation_submittedByClientUserId_organizationId_fkey" FOREIGN KEY ("submittedByClientUserId","organizationId") REFERENCES "ClientUser"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservationEvent" ADD CONSTRAINT "DisplayCorrectionObservationEvent_observationId_organizationId_buildingId_fkey" FOREIGN KEY ("observationId","organizationId","buildingId") REFERENCES "DisplayCorrectionObservation"("id","organizationId","buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservationEvent" ADD CONSTRAINT "DisplayCorrectionObservationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisplayCorrectionObservationEvent" ADD CONSTRAINT "DisplayCorrectionObservationEvent_actorClientUserId_organizationId_fkey" FOREIGN KEY ("actorClientUserId","organizationId") REFERENCES "ClientUser"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
