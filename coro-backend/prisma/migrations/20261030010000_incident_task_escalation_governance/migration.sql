-- P-4.2: governed incident task acknowledgment and escalation state.
CREATE TYPE "IncidentTaskSeverity" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');
CREATE TYPE "IncidentTaskEscalationStatus" AS ENUM ('PENDING', 'LEVEL_1', 'LEVEL_2', 'OPERATOR_QUEUE', 'ACKNOWLEDGED', 'CANCELLED');

ALTER TABLE "IncidentTask"
  ADD COLUMN "severity" "IncidentTaskSeverity" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "ackDeadlineAt" TIMESTAMP(3),
  ADD COLUMN "ackPolicySnapshot" JSONB,
  ADD COLUMN "alternateEmployeeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acknowledgmentSubjectType" "CoroActorType",
  ADD COLUMN "acknowledgmentSubjectId" TEXT,
  ADD COLUMN "escalationStatus" "IncidentTaskEscalationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "escalationCycle" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "missedAcknowledgmentAt" TIMESTAMP(3),
  ADD COLUMN "nextEscalationAt" TIMESTAMP(3),
  ADD COLUMN "operatorQueuedAt" TIMESTAMP(3),
  ADD COLUMN "escalationCancelledAt" TIMESTAMP(3),
  ADD COLUMN "escalationCancellationReason" TEXT;

ALTER TABLE "IncidentTask"
  ADD CONSTRAINT "IncidentTask_escalationLevel_check" CHECK ("escalationLevel" BETWEEN 0 AND 3),
  ADD CONSTRAINT "IncidentTask_alternateEmployeeIds_check" CHECK (cardinality("alternateEmployeeIds") <= 2);

CREATE INDEX "IncidentTask_escalationStatus_nextEscalationAt_idx"
  ON "IncidentTask"("escalationStatus", "nextEscalationAt");
CREATE INDEX "IncidentTask_incidentEventId_escalationStatus_idx"
  ON "IncidentTask"("incidentEventId", "escalationStatus");

COMMENT ON COLUMN "IncidentTask"."ackPolicySnapshot" IS
  'Immutable per-cycle acknowledgment policy snapshot; defaults are operational configuration, not regulatory claims.';
