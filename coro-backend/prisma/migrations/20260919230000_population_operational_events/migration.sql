CREATE TYPE "PopulationOperationalEventStatus" AS ENUM (
  'ACTIVE',
  'ENDED',
  'CANCELLED'
);

CREATE TABLE "PopulationOperationalEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "emergencyScenarioId" TEXT NOT NULL,
  "incidentEventId" TEXT,
  "status" "PopulationOperationalEventStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedByType" "CoroActorType" NOT NULL,
  "startedById" TEXT NOT NULL,
  "endedAt" TIMESTAMP(3),
  "endedByType" "CoroActorType",
  "endedById" TEXT,
  "closeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PopulationOperationalEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PopulationAlert"
ADD COLUMN "operationalEventId" TEXT,
ADD COLUMN "cycleSequence" INTEGER;

CREATE INDEX "PopulationOperationalEvent_organizationId_idx"
ON "PopulationOperationalEvent"("organizationId");

CREATE INDEX "PopulationOperationalEvent_programId_idx"
ON "PopulationOperationalEvent"("programId");

CREATE INDEX "PopulationOperationalEvent_emergencyScenarioId_idx"
ON "PopulationOperationalEvent"("emergencyScenarioId");

CREATE INDEX "PopulationOperationalEvent_incidentEventId_idx"
ON "PopulationOperationalEvent"("incidentEventId");

CREATE INDEX "PopulationOperationalEvent_status_idx"
ON "PopulationOperationalEvent"("status");

CREATE INDEX "PopulationOperationalEvent_startedAt_idx"
ON "PopulationOperationalEvent"("startedAt");

CREATE INDEX "PopulationOperationalEvent_organizationId_programId_idx"
ON "PopulationOperationalEvent"("organizationId", "programId");

CREATE UNIQUE INDEX "PopulationOperationalEvent_one_active_per_program"
ON "PopulationOperationalEvent"("programId")
WHERE "status" = 'ACTIVE';

CREATE INDEX "PopulationAlert_operationalEventId_idx"
ON "PopulationAlert"("operationalEventId");

CREATE UNIQUE INDEX "PopulationAlert_operationalEventId_cycleSequence_key"
ON "PopulationAlert"("operationalEventId", "cycleSequence");

ALTER TABLE "PopulationOperationalEvent"
ADD CONSTRAINT "PopulationOperationalEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PopulationOperationalEvent"
ADD CONSTRAINT "PopulationOperationalEvent_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PopulationOperationalEvent"
ADD CONSTRAINT "PopulationOperationalEvent_emergencyScenarioId_fkey"
FOREIGN KEY ("emergencyScenarioId") REFERENCES "RueEmergencyScenario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PopulationOperationalEvent"
ADD CONSTRAINT "PopulationOperationalEvent_incidentEventId_fkey"
FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PopulationAlert"
ADD CONSTRAINT "PopulationAlert_operationalEventId_fkey"
FOREIGN KEY ("operationalEventId") REFERENCES "PopulationOperationalEvent"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
