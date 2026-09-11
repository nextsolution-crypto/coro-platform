-- CreateEnum
CREATE TYPE "EmergencyRoleType" AS ENUM ('COORDINATOR', 'EPI', 'ASSEMBLY_WARDEN', 'SEARCHER', 'EXIT_WARDEN', 'PNA_ESCORT', 'FIRST_AIDER');

-- CreateEnum
CREATE TYPE "EmergencyAssignType" AS ENUM ('PRIMARY', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "QualificationType" AS ENUM ('FIRST_AID_CPR', 'AED', 'FIRE_EXTINGUISHER', 'EPI_TRAINING', 'HAZMAT', 'OTHER');

-- AlterTable
ALTER TABLE "BuildingEmployee" ADD COLUMN     "isEmergencyMember" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmployeeEmergencyRole" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "role" "EmergencyRoleType" NOT NULL,
    "assignType" "EmergencyAssignType" NOT NULL DEFAULT 'PRIMARY',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "zone" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEmergencyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeQualification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "QualificationType" NOT NULL,
    "certifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeQualification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmployeeEmergencyRole" ADD CONSTRAINT "EmployeeEmergencyRole_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEmergencyRole" ADD CONSTRAINT "EmployeeEmergencyRole_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeQualification" ADD CONSTRAINT "EmployeeQualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
