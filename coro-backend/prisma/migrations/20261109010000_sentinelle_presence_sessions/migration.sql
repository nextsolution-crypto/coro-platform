CREATE TYPE "PresenceSessionStatus" AS ENUM ('ISSUED', 'STARTED', 'IDENTIFIED', 'COMPLETED', 'EXPIRED');
CREATE TYPE "PresenceAction" AS ENUM ('CHECK_IN', 'CHECK_OUT');

CREATE TABLE "PresenceSession" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "kioskTokenId" TEXT NOT NULL,
  "entryLabel" TEXT,
  "challengeHash" TEXT NOT NULL,
  "challengeExpiresAt" TIMESTAMP(3) NOT NULL,
  "transactionExpiresAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "identifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "status" "PresenceSessionStatus" NOT NULL DEFAULT 'ISSUED',
  "employeeId" TEXT,
  "intendedAction" "PresenceAction",
  "idempotencyKey" TEXT,
  "occupancyRecordId" TEXT,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PresenceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PresenceDeviceSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresenceDeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PresenceKioskDisplay" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PresenceKioskDisplay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PresenceSession_challengeHash_key" ON "PresenceSession"("challengeHash");
CREATE UNIQUE INDEX "PresenceSession_idempotencyKey_key" ON "PresenceSession"("idempotencyKey");
CREATE INDEX "PresenceSession_buildingId_status_challengeExpiresAt_idx" ON "PresenceSession"("buildingId", "status", "challengeExpiresAt");
CREATE INDEX "PresenceSession_employeeId_createdAt_idx" ON "PresenceSession"("employeeId", "createdAt");
CREATE UNIQUE INDEX "PresenceDeviceSession_tokenHash_key" ON "PresenceDeviceSession"("tokenHash");
CREATE INDEX "PresenceDeviceSession_employeeId_revokedAt_expiresAt_idx" ON "PresenceDeviceSession"("employeeId", "revokedAt", "expiresAt");
CREATE INDEX "PresenceDeviceSession_buildingId_revokedAt_expiresAt_idx" ON "PresenceDeviceSession"("buildingId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "PresenceKioskDisplay_publicToken_key" ON "PresenceKioskDisplay"("publicToken");
CREATE INDEX "PresenceKioskDisplay_buildingId_isActive_idx" ON "PresenceKioskDisplay"("buildingId", "isActive");
CREATE INDEX "PresenceKioskDisplay_organizationId_idx" ON "PresenceKioskDisplay"("organizationId");

ALTER TABLE "PresenceSession" ADD CONSTRAINT "PresenceSession_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresenceSession" ADD CONSTRAINT "PresenceSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PresenceDeviceSession" ADD CONSTRAINT "PresenceDeviceSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresenceDeviceSession" ADD CONSTRAINT "PresenceDeviceSession_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresenceKioskDisplay" ADD CONSTRAINT "PresenceKioskDisplay_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Une personne ne peut avoir qu'une présence ouverte. Cette contrainte ferme
-- la course entre deux téléphones, deux bornes ou une répétition réseau.
CREATE UNIQUE INDEX "OccupancyRecord_one_open_employee_idx"
  ON "OccupancyRecord"("employeeId")
  WHERE "employeeId" IS NOT NULL AND "status" = 'IN';
