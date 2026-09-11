-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FIRE', 'EVACUATION', 'MEDICAL', 'SECURITY', 'HAZMAT', 'LOCKDOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'CONTAINED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentTaskStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT NOT NULL,
    "description" TEXT,
    "occupantsSnapshot" JSONB NOT NULL,
    "teamSnapshot" JSONB NOT NULL,
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTask" (
    "id" TEXT NOT NULL,
    "incidentEventId" TEXT NOT NULL,
    "employeeId" TEXT,
    "role" "EmergencyRoleType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IncidentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "notifiedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLog" (
    "id" TEXT NOT NULL,
    "incidentEventId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "details" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTask" ADD CONSTRAINT "IncidentTask_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTask" ADD CONSTRAINT "IncidentTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLog" ADD CONSTRAINT "IncidentLog_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
