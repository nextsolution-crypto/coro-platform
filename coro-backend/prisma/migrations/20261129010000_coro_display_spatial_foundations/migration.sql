-- DISPLAY-02A: additive canonical spatial foundations.
-- Existing Building.floors remains unchanged; no spatial rows are backfilled.

CREATE TYPE "SpatialResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "DisplayPermission" AS ENUM (
  'DISPLAY_READ',
  'DISPLAY_DEVICE_MANAGE',
  'DISPLAY_CONTENT_MANAGE',
  'DISPLAY_COMMAND',
  'DISPLAY_EMERGENCY_ACTIVATE',
  'DISPLAY_EMERGENCY_RESET',
  'DISPLAY_AUDIT_READ'
);

ALTER TABLE "User"
  ADD COLUMN "displayPermissions" "DisplayPermission"[] NOT NULL DEFAULT ARRAY[]::"DisplayPermission"[],
  ADD COLUMN "displayBuildingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ClientUser"
  ADD COLUMN "displayPermissions" "DisplayPermission"[] NOT NULL DEFAULT ARRAY[]::"DisplayPermission"[],
  ADD COLUMN "displayBuildingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "BuildingFloor" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "levelNumber" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "SpatialResourceStatus" NOT NULL DEFAULT 'ACTIVE',
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuildingFloor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BuildingFloor_levelNumber_check" CHECK ("levelNumber" IS NULL OR "levelNumber" BETWEEN -20 AND 300),
  CONSTRAINT "BuildingFloor_sortOrder_check" CHECK ("sortOrder" BETWEEN -10000 AND 10000),
  CONSTRAINT "BuildingFloor_lockVersion_check" CHECK ("lockVersion" >= 0)
);

CREATE TABLE "BuildingZone" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "geometry" JSONB,
  "status" "SpatialResourceStatus" NOT NULL DEFAULT 'ACTIVE',
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuildingZone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BuildingZone_geometry_object_check" CHECK ("geometry" IS NULL OR jsonb_typeof("geometry") = 'object'),
  CONSTRAINT "BuildingZone_lockVersion_check" CHECK ("lockVersion" >= 0)
);

CREATE TABLE "DisplayLocation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "zoneId" TEXT,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "positionX" DOUBLE PRECISION,
  "positionY" DOUBLE PRECISION,
  "orientationDegrees" DOUBLE PRECISION,
  "youAreHereX" DOUBLE PRECISION,
  "youAreHereY" DOUBLE PRECISION,
  "status" "SpatialResourceStatus" NOT NULL DEFAULT 'ACTIVE',
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayLocation_position_pair_check" CHECK (("positionX" IS NULL) = ("positionY" IS NULL)),
  CONSTRAINT "DisplayLocation_you_are_here_pair_check" CHECK (("youAreHereX" IS NULL) = ("youAreHereY" IS NULL)),
  CONSTRAINT "DisplayLocation_position_x_check" CHECK ("positionX" IS NULL OR "positionX" BETWEEN 0 AND 1),
  CONSTRAINT "DisplayLocation_position_y_check" CHECK ("positionY" IS NULL OR "positionY" BETWEEN 0 AND 1),
  CONSTRAINT "DisplayLocation_you_are_here_x_check" CHECK ("youAreHereX" IS NULL OR "youAreHereX" BETWEEN 0 AND 1),
  CONSTRAINT "DisplayLocation_you_are_here_y_check" CHECK ("youAreHereY" IS NULL OR "youAreHereY" BETWEEN 0 AND 1),
  CONSTRAINT "DisplayLocation_orientation_check" CHECK ("orientationDegrees" IS NULL OR "orientationDegrees" BETWEEN 0 AND 360),
  CONSTRAINT "DisplayLocation_lockVersion_check" CHECK ("lockVersion" >= 0)
);

CREATE UNIQUE INDEX "BuildingFloor_buildingId_code_key" ON "BuildingFloor"("buildingId", "code");
CREATE UNIQUE INDEX "BuildingFloor_id_organizationId_buildingId_key" ON "BuildingFloor"("id", "organizationId", "buildingId");
CREATE INDEX "BuildingFloor_organizationId_buildingId_status_sortOrder_idx" ON "BuildingFloor"("organizationId", "buildingId", "status", "sortOrder");

CREATE UNIQUE INDEX "BuildingZone_floorId_code_key" ON "BuildingZone"("floorId", "code");
CREATE UNIQUE INDEX "BuildingZone_id_organizationId_buildingId_floorId_key" ON "BuildingZone"("id", "organizationId", "buildingId", "floorId");
CREATE INDEX "BuildingZone_organizationId_buildingId_floorId_status_idx" ON "BuildingZone"("organizationId", "buildingId", "floorId", "status");

CREATE UNIQUE INDEX "DisplayLocation_buildingId_code_key" ON "DisplayLocation"("buildingId", "code");
CREATE INDEX "DisplayLocation_org_building_floor_zone_status_idx" ON "DisplayLocation"("organizationId", "buildingId", "floorId", "zoneId", "status");

ALTER TABLE "BuildingFloor"
  ADD CONSTRAINT "BuildingFloor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BuildingFloor_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BuildingZone"
  ADD CONSTRAINT "BuildingZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BuildingZone_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BuildingZone_floorId_organizationId_buildingId_fkey" FOREIGN KEY ("floorId", "organizationId", "buildingId") REFERENCES "BuildingFloor"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DisplayLocation"
  ADD CONSTRAINT "DisplayLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayLocation_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayLocation_floorId_organizationId_buildingId_fkey" FOREIGN KEY ("floorId", "organizationId", "buildingId") REFERENCES "BuildingFloor"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayLocation_zoneId_organizationId_buildingId_floorId_fkey" FOREIGN KEY ("zoneId", "organizationId", "buildingId", "floorId") REFERENCES "BuildingZone"("id", "organizationId", "buildingId", "floorId") ON DELETE RESTRICT ON UPDATE CASCADE;
