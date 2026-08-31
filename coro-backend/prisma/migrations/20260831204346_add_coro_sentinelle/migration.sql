-- CreateEnum
CREATE TYPE "OccupantType" AS ENUM ('EMPLOYE', 'VISITEUR', 'CONTRACTEUR');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "OccupancyRecord" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "type" "OccupantType" NOT NULL,
    "status" "OccupancyStatus" NOT NULL DEFAULT 'IN',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "reason" TEXT,
    "hostName" TEXT,
    "floor" TEXT,
    "qrToken" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccupancyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvacuationEvent" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT,
    "totalPresent" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvacuationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvacuationCheckIn" (
    "id" TEXT NOT NULL,
    "evacuationEventId" TEXT NOT NULL,
    "occupantRecordId" TEXT NOT NULL,
    "isAccountedFor" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvacuationCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingKioskToken" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingKioskToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingKioskToken_buildingId_key" ON "BuildingKioskToken"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingKioskToken_token_key" ON "BuildingKioskToken"("token");

-- AddForeignKey
ALTER TABLE "OccupancyRecord" ADD CONSTRAINT "OccupancyRecord_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvacuationEvent" ADD CONSTRAINT "EvacuationEvent_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvacuationCheckIn" ADD CONSTRAINT "EvacuationCheckIn_evacuationEventId_fkey" FOREIGN KEY ("evacuationEventId") REFERENCES "EvacuationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvacuationCheckIn" ADD CONSTRAINT "EvacuationCheckIn_occupantRecordId_fkey" FOREIGN KEY ("occupantRecordId") REFERENCES "OccupancyRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingKioskToken" ADD CONSTRAINT "BuildingKioskToken_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
