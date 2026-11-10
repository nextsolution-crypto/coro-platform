-- DISPLAY-03: governed, immutable evacuation-plan publications.

ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_READ';
ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_CREATE';
ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_REVIEW';
ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_APPROVE';
ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_PUBLISH';
ALTER TYPE "DisplayPermission" ADD VALUE 'DISPLAY_PLAN_REVOKE';

CREATE TYPE "DisplayPlanPublicationStatus" AS ENUM (
  'DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED',
  'SUPERSEDED', 'REVOKED', 'SUSPENDED'
);
CREATE TYPE "DisplayPlanOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');
CREATE TYPE "DisplayPlanLanguage" AS ENUM ('FR', 'EN', 'BILINGUAL');

CREATE UNIQUE INDEX "ProjectFile_id_organizationId_buildingId_key"
  ON "ProjectFile"("id", "organizationId", "buildingId");
CREATE UNIQUE INDEX "DisplayLocation_id_org_building_floor_key"
  ON "DisplayLocation"("id", "organizationId", "buildingId", "floorId");

CREATE TABLE "DisplayPlanPublication" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "zoneId" TEXT,
  "locationId" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "creationRequestId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "sourceSha256" CHAR(64) NOT NULL,
  "sourceApprovedById" TEXT NOT NULL,
  "sourceApprovedAt" TIMESTAMP(3) NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "variantVersion" INTEGER NOT NULL DEFAULT 0,
  "variantStorageKey" TEXT,
  "variantSha256" CHAR(64),
  "variantMimeType" TEXT,
  "widthPixels" INTEGER,
  "heightPixels" INTEGER,
  "orientation" "DisplayPlanOrientation" NOT NULL,
  "language" "DisplayPlanLanguage" NOT NULL,
  "renderParameters" JSONB NOT NULL,
  "status" "DisplayPlanPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "suspendedById" TEXT,
  "suspendedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "supersededAt" TIMESTAMP(3),
  "supersededById" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayPlanPublication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayPlanPublication_source_version_check" CHECK ("sourceVersion" > 0),
  CONSTRAINT "DisplayPlanPublication_version_check" CHECK ("versionNumber" > 0),
  CONSTRAINT "DisplayPlanPublication_variant_version_check" CHECK ("variantVersion" >= 0),
  CONSTRAINT "DisplayPlanPublication_lock_version_check" CHECK ("lockVersion" >= 0),
  CONSTRAINT "DisplayPlanPublication_dimensions_pair_check" CHECK (("widthPixels" IS NULL) = ("heightPixels" IS NULL)),
  CONSTRAINT "DisplayPlanPublication_dimensions_check" CHECK ("widthPixels" IS NULL OR ("widthPixels" BETWEEN 320 AND 16384 AND "heightPixels" BETWEEN 320 AND 16384)),
  CONSTRAINT "DisplayPlanPublication_variant_pair_check" CHECK (("variantStorageKey" IS NULL) = ("variantSha256" IS NULL) AND ("variantSha256" IS NULL) = ("variantMimeType" IS NULL)),
  CONSTRAINT "DisplayPlanPublication_validity_check" CHECK ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" > "validFrom")
);

CREATE TABLE "DisplayPlanPublicationEvent" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "DisplayPlanPublicationStatus",
  "toStatus" "DisplayPlanPublicationStatus" NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT,
  "sourceVersion" INTEGER NOT NULL,
  "sourceSha256" CHAR(64) NOT NULL,
  "variantVersion" INTEGER NOT NULL,
  "variantSha256" CHAR(64),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayPlanPublicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisplayPlanPublication_locationId_versionNumber_key"
  ON "DisplayPlanPublication"("locationId", "versionNumber");
CREATE UNIQUE INDEX "DisplayPlanPublication_org_building_creation_request_key"
  ON "DisplayPlanPublication"("organizationId", "buildingId", "creationRequestId");
CREATE UNIQUE INDEX "DisplayPlanPublication_id_org_building_key"
  ON "DisplayPlanPublication"("id", "organizationId", "buildingId");
CREATE INDEX "DisplayPlanPublication_org_building_floor_status_idx"
  ON "DisplayPlanPublication"("organizationId", "buildingId", "floorId", "status");
CREATE INDEX "DisplayPlanPublication_file_version_status_idx"
  ON "DisplayPlanPublication"("projectFileId", "sourceVersion", "status");
CREATE INDEX "DisplayPlanPublication_location_status_published_idx"
  ON "DisplayPlanPublication"("locationId", "status", "publishedAt");
CREATE UNIQUE INDEX "DisplayPlanPublication_one_published_per_location_key"
  ON "DisplayPlanPublication"("locationId") WHERE "status" = 'PUBLISHED';
CREATE UNIQUE INDEX "DisplayPlanPublicationEvent_publication_request_key"
  ON "DisplayPlanPublicationEvent"("publicationId", "requestId");
CREATE INDEX "DisplayPlanPublicationEvent_org_building_created_idx"
  ON "DisplayPlanPublicationEvent"("organizationId", "buildingId", "createdAt");
CREATE INDEX "DisplayPlanPublicationEvent_publication_created_idx"
  ON "DisplayPlanPublicationEvent"("publicationId", "createdAt");

ALTER TABLE "DisplayPlanPublication"
  ADD CONSTRAINT "DisplayPlanPublication_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_building_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_floor_fkey" FOREIGN KEY ("floorId", "organizationId", "buildingId") REFERENCES "BuildingFloor"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_zone_fkey" FOREIGN KEY ("zoneId", "organizationId", "buildingId", "floorId") REFERENCES "BuildingZone"("id", "organizationId", "buildingId", "floorId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_location_fkey" FOREIGN KEY ("locationId", "organizationId", "buildingId", "floorId") REFERENCES "DisplayLocation"("id", "organizationId", "buildingId", "floorId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_project_file_fkey" FOREIGN KEY ("projectFileId", "organizationId", "buildingId") REFERENCES "ProjectFile"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_created_by_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_reviewed_by_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_approved_by_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_published_by_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_suspended_by_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_revoked_by_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublication_superseded_by_fkey" FOREIGN KEY ("supersededById") REFERENCES "DisplayPlanPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DisplayPlanPublicationEvent"
  ADD CONSTRAINT "DisplayPlanPublicationEvent_publication_fkey" FOREIGN KEY ("publicationId", "organizationId", "buildingId") REFERENCES "DisplayPlanPublication"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublicationEvent_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayPlanPublicationEvent_actor_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
