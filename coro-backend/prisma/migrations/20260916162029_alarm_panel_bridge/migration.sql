-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IncidentStatus" ADD VALUE 'PRE_ALERT';
ALTER TYPE "IncidentStatus" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "BuildingAlarmToken" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingAlarmToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingAlarmToken_buildingId_key" ON "BuildingAlarmToken"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingAlarmToken_token_key" ON "BuildingAlarmToken"("token");

-- AddForeignKey
ALTER TABLE "BuildingAlarmToken" ADD CONSTRAINT "BuildingAlarmToken_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
