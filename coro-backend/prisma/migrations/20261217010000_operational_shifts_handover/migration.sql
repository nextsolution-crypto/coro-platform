-- INC-RP-02B: operational shifts and governed handovers. Additive only.
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_READ';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_OPEN';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_EDIT_OWN';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_HANDOVER_PREPARE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_HANDOVER_ACKNOWLEDGE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_SUPERVISE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_EXCEPTION_CLOSE';
ALTER TYPE "PlatformPermission" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFT_ADMIN';

CREATE TYPE "OperationalShiftStatus" AS ENUM ('PLANNED', 'OPEN', 'HANDOVER_PENDING', 'CLOSED', 'CANCELLED');
CREATE TYPE "OperationalShiftParticipantRole" AS ENUM ('RESPONSIBLE', 'PARTICIPANT', 'REPLACEMENT', 'SUPERVISOR');
CREATE TYPE "OperationalShiftParticipantStatus" AS ENUM ('EXPECTED', 'ACTIVE', 'REPLACED', 'ABSENT', 'COMPLETED');
CREATE TYPE "OperationalHandoverStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'RESERVED', 'REFUSED', 'CLARIFICATION_REQUESTED');
CREATE TYPE "OperationalHandoverActionType" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'RESERVED', 'REFUSED', 'CLARIFICATION_REQUESTED', 'CLARIFIED');

CREATE TABLE "OperationalShift" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "securityPost" TEXT NOT NULL,
  "teamName" TEXT,
  "responsibleUserId" TEXT NOT NULL,
  "plannedStartAt" TIMESTAMP(3) NOT NULL,
  "plannedEndAt" TIMESTAMP(3) NOT NULL,
  "actualStartAt" TIMESTAMP(3),
  "actualEndAt" TIMESTAMP(3),
  "buildingTimeZone" TEXT NOT NULL,
  "status" "OperationalShiftStatus" NOT NULL DEFAULT 'PLANNED',
  "instructionsSnapshot" JSONB,
  "openingSnapshot" JSONB,
  "notes" TEXT,
  "closeReason" TEXT,
  "cancellationReason" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "creationIdempotencyKey" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "cancelledByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalShift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalShift_planned_time_check" CHECK ("plannedEndAt" > "plannedStartAt"),
  CONSTRAINT "OperationalShift_actual_time_check" CHECK ("actualEndAt" IS NULL OR "actualStartAt" IS NULL OR "actualEndAt" >= "actualStartAt"),
  CONSTRAINT "OperationalShift_cancel_reason_check" CHECK ("status" <> 'CANCELLED' OR length(trim("cancellationReason")) > 0)
);

CREATE TABLE "OperationalShiftParticipant" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" "OperationalShiftParticipantRole" NOT NULL,
  "status" "OperationalShiftParticipantStatus" NOT NULL DEFAULT 'EXPECTED',
  "replacedById" TEXT, "joinedAt" TIMESTAMP(3), "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalShiftParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalShiftHistory" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "fromStatus" "OperationalShiftStatus", "toStatus" "OperationalShiftStatus",
  "actorUserId" TEXT NOT NULL, "reason" TEXT, "metadata" JSONB, "idempotencyKey" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalShiftHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalHandover" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "outgoingShiftId" TEXT NOT NULL, "incomingShiftId" TEXT,
  "outgoingUserId" TEXT NOT NULL, "incomingUserId" TEXT,
  "status" "OperationalHandoverStatus" NOT NULL DEFAULT 'DRAFT',
  "snapshot" JSONB NOT NULL, "snapshotHash" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "lockVersion" INTEGER NOT NULL DEFAULT 0, "creationIdempotencyKey" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3), "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalHandover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalHandover_actor_separation_check" CHECK ("incomingUserId" IS NULL OR "incomingUserId" <> "outgoingUserId")
);

CREATE TABLE "OperationalHandoverAction" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "buildingId" TEXT NOT NULL,
  "handoverId" TEXT NOT NULL, "type" "OperationalHandoverActionType" NOT NULL,
  "actorUserId" TEXT NOT NULL, "reason" TEXT, "metadata" JSONB, "idempotencyKey" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalHandoverAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalHandoverAction_reason_check" CHECK ("type" NOT IN ('REFUSED','CLARIFICATION_REQUESTED') OR length(trim("reason")) > 0)
);

CREATE UNIQUE INDEX "OperationalShift_id_organizationId_key" ON "OperationalShift"("id", "organizationId");
CREATE UNIQUE INDEX "OperationalShift_organizationId_creationIdempotencyKey_key" ON "OperationalShift"("organizationId", "creationIdempotencyKey");
CREATE INDEX "OperationalShift_organizationId_buildingId_status_plannedStartAt_idx" ON "OperationalShift"("organizationId", "buildingId", "status", "plannedStartAt");
CREATE INDEX "OperationalShift_organizationId_responsibleUserId_status_idx" ON "OperationalShift"("organizationId", "responsibleUserId", "status");
CREATE UNIQUE INDEX "OperationalShiftParticipant_shiftId_userId_key" ON "OperationalShiftParticipant"("shiftId", "userId");
CREATE UNIQUE INDEX "OperationalShiftParticipant_id_organizationId_key" ON "OperationalShiftParticipant"("id", "organizationId");
CREATE INDEX "OperationalShiftParticipant_organizationId_buildingId_userId_status_idx" ON "OperationalShiftParticipant"("organizationId", "buildingId", "userId", "status");
CREATE UNIQUE INDEX "OperationalShiftHistory_organizationId_idempotencyKey_key" ON "OperationalShiftHistory"("organizationId", "idempotencyKey");
CREATE INDEX "OperationalShiftHistory_organizationId_shiftId_occurredAt_idx" ON "OperationalShiftHistory"("organizationId", "shiftId", "occurredAt");
CREATE UNIQUE INDEX "OperationalHandover_id_organizationId_key" ON "OperationalHandover"("id", "organizationId");
CREATE UNIQUE INDEX "OperationalHandover_organizationId_creationIdempotencyKey_key" ON "OperationalHandover"("organizationId", "creationIdempotencyKey");
CREATE INDEX "OperationalHandover_organizationId_buildingId_status_createdAt_idx" ON "OperationalHandover"("organizationId", "buildingId", "status", "createdAt");
CREATE UNIQUE INDEX "OperationalHandoverAction_organizationId_idempotencyKey_key" ON "OperationalHandoverAction"("organizationId", "idempotencyKey");
CREATE INDEX "OperationalHandoverAction_organizationId_handoverId_occurredAt_idx" ON "OperationalHandoverAction"("organizationId", "handoverId", "occurredAt");

ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_responsibleUserId_organizationId_fkey" FOREIGN KEY ("responsibleUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_createdByUserId_organizationId_fkey" FOREIGN KEY ("createdByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_closedByUserId_organizationId_fkey" FOREIGN KEY ("closedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShift" ADD CONSTRAINT "OperationalShift_cancelledByUserId_organizationId_fkey" FOREIGN KEY ("cancelledByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalShiftParticipant" ADD CONSTRAINT "OperationalShiftParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftParticipant" ADD CONSTRAINT "OperationalShiftParticipant_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftParticipant" ADD CONSTRAINT "OperationalShiftParticipant_shiftId_organizationId_fkey" FOREIGN KEY ("shiftId", "organizationId") REFERENCES "OperationalShift"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftParticipant" ADD CONSTRAINT "OperationalShiftParticipant_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalShiftHistory" ADD CONSTRAINT "OperationalShiftHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftHistory" ADD CONSTRAINT "OperationalShiftHistory_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftHistory" ADD CONSTRAINT "OperationalShiftHistory_shiftId_organizationId_fkey" FOREIGN KEY ("shiftId", "organizationId") REFERENCES "OperationalShift"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalShiftHistory" ADD CONSTRAINT "OperationalShiftHistory_actorUserId_organizationId_fkey" FOREIGN KEY ("actorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_outgoingShiftId_organizationId_fkey" FOREIGN KEY ("outgoingShiftId", "organizationId") REFERENCES "OperationalShift"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_incomingShiftId_organizationId_fkey" FOREIGN KEY ("incomingShiftId", "organizationId") REFERENCES "OperationalShift"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_outgoingUserId_organizationId_fkey" FOREIGN KEY ("outgoingUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandover" ADD CONSTRAINT "OperationalHandover_incomingUserId_organizationId_fkey" FOREIGN KEY ("incomingUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalHandoverAction" ADD CONSTRAINT "OperationalHandoverAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandoverAction" ADD CONSTRAINT "OperationalHandoverAction_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandoverAction" ADD CONSTRAINT "OperationalHandoverAction_handoverId_organizationId_fkey" FOREIGN KEY ("handoverId", "organizationId") REFERENCES "OperationalHandover"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalHandoverAction" ADD CONSTRAINT "OperationalHandoverAction_actorUserId_organizationId_fkey" FOREIGN KEY ("actorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalLogEntry" ADD COLUMN "shiftId" TEXT;
CREATE INDEX "OperationalLogEntry_organizationId_shiftId_eventAt_idx" ON "OperationalLogEntry"("organizationId", "shiftId", "eventAt");
ALTER TABLE "OperationalLogEntry" ADD CONSTRAINT "OperationalLogEntry_shiftId_organizationId_fkey" FOREIGN KEY ("shiftId", "organizationId") REFERENCES "OperationalShift"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "coro_operational_handover_snapshot_immutable"() RETURNS trigger AS $$
BEGIN
  IF NEW."snapshot" IS DISTINCT FROM OLD."snapshot" OR NEW."snapshotHash" IS DISTINCT FROM OLD."snapshotHash" OR NEW."version" IS DISTINCT FROM OLD."version" THEN
    RAISE EXCEPTION 'operational handover snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "OperationalHandover_snapshot_immutable" BEFORE UPDATE ON "OperationalHandover" FOR EACH ROW EXECUTE FUNCTION "coro_operational_handover_snapshot_immutable"();

CREATE OR REPLACE FUNCTION "coro_operational_evidence_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'operational evidence is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "OperationalShiftHistory_append_only" BEFORE UPDATE OR DELETE ON "OperationalShiftHistory" FOR EACH ROW EXECUTE FUNCTION "coro_operational_evidence_append_only"();
CREATE TRIGGER "OperationalHandoverAction_append_only" BEFORE UPDATE OR DELETE ON "OperationalHandoverAction" FOR EACH ROW EXECUTE FUNCTION "coro_operational_evidence_append_only"();
