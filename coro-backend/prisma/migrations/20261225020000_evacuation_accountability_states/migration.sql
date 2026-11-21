-- Dénombrement détaillé à l'évacuation (audit M5-04). Ajouts seulement :
-- compatible avec la version en cours, qui continue de lire isAccountedFor.
CREATE TYPE "EvacuationAccountabilityStatus" AS ENUM ('PENDING', 'PRESENT', 'SAFE_ELSEWHERE', 'INJURED', 'MISSING', 'FOUND');

ALTER TABLE "EvacuationCheckIn"
  ADD COLUMN "status" "EvacuationAccountabilityStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "lastKnownLocation" TEXT,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "reportedToFireAt" TIMESTAMP(3);

UPDATE "EvacuationCheckIn" SET "status" = 'PRESENT' WHERE "isAccountedFor" = true;

ALTER TABLE "EvacuationEvent"
  ADD COLUMN "resolvedBy" TEXT,
  ADD COLUMN "closureReason" TEXT;

CREATE TABLE "EvacuationAccountabilityEvent" (
  "id" TEXT NOT NULL,
  "checkinId" TEXT NOT NULL,
  "evacuationEventId" TEXT NOT NULL,
  "fromStatus" "EvacuationAccountabilityStatus" NOT NULL,
  "toStatus" "EvacuationAccountabilityStatus" NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'WARDEN',
  "note" TEXT,
  "lastKnownLocation" TEXT,
  "reportedToFire" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvacuationAccountabilityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EvacuationAccountabilityEvent_evacuationEventId_createdAt_idx" ON "EvacuationAccountabilityEvent"("evacuationEventId", "createdAt");
CREATE INDEX "EvacuationAccountabilityEvent_checkinId_createdAt_idx" ON "EvacuationAccountabilityEvent"("checkinId", "createdAt");

ALTER TABLE "EvacuationAccountabilityEvent" ADD CONSTRAINT "EvacuationAccountabilityEvent_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "EvacuationCheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
