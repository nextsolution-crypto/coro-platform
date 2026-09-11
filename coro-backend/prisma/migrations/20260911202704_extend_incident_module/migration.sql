/*
  Warnings:

  - The values [FIRE,EVACUATION,SECURITY,LOCKDOWN] on the enum `IncidentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IncidentType_new" AS ENUM ('SMOKE_DISCOVERY', 'FIRE_ALERT', 'FIRE_ALARM', 'GAS_LEAK', 'ACTIVE_THREAT', 'MEDICAL', 'TOXIC_GAS', 'SUSPICIOUS_PACKAGE', 'POWER_OUTAGE', 'HAZMAT', 'BOMB_THREAT', 'LITHIUM_BATTERY', 'FLOODING', 'VIOLENT_WINDS', 'OTHER');
ALTER TABLE "IncidentEvent" ALTER COLUMN "type" TYPE "IncidentType_new" USING ("type"::text::"IncidentType_new");
ALTER TYPE "IncidentType" RENAME TO "IncidentType_old";
ALTER TYPE "IncidentType_new" RENAME TO "IncidentType";
DROP TYPE "public"."IncidentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "IncidentEvent" ADD COLUMN     "assemblyPoint" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "procedureCode" TEXT,
ADD COLUMN     "procedureSnapshot" JSONB;

-- AlterTable
ALTER TABLE "IncidentTask" ADD COLUMN     "isCoordinatorStep" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepId" TEXT,
ADD COLUMN     "stepOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stepText" TEXT;
