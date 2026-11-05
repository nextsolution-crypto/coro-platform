CREATE TYPE "PilotScenarioStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PilotRunEnvironment" AS ENUM ('QA', 'PRODUCTION_DEMO');
CREATE TYPE "PilotRunStatus" AS ENUM ('PLANNED', 'RUNNING', 'PASSED', 'FAILED', 'PARTIAL');
CREATE TYPE "PilotCheckStatus" AS ENUM ('NOT_RUN', 'PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE');
CREATE TYPE "PilotPhase" AS ENUM (
  'FOUNDATION',
  'CONFIGURATION',
  'DOCUMENT_GENERATION',
  'INTERNAL_REVIEW',
  'CLIENT_APPROVAL',
  'KNOWLEDGE_AI',
  'INCIDENT_SENTINELLE',
  'EXERCISE_REX',
  'RESILIENCE',
  'NETWORK',
  'FINANCIAL',
  'SECURITY_RECOVERY'
);

CREATE TABLE "PilotScenario" (
  "id" TEXT NOT NULL,
  "scenarioKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "PilotScenarioStatus" NOT NULL DEFAULT 'ACTIVE',
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotScenarioRun" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "environment" "PilotRunEnvironment" NOT NULL,
  "status" "PilotRunStatus" NOT NULL DEFAULT 'PLANNED',
  "sourceCommit" TEXT,
  "createdById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotScenarioRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotScenarioCheck" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "phase" "PilotPhase" NOT NULL,
  "checkKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "PilotCheckStatus" NOT NULL DEFAULT 'NOT_RUN',
  "notes" TEXT,
  "evidence" JSONB,
  "observedAt" TIMESTAMP(3),
  "observedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotScenarioCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilotScenario_scenarioKey_key" ON "PilotScenario"("scenarioKey");
CREATE INDEX "PilotScenario_organizationId_status_idx" ON "PilotScenario"("organizationId", "status");
CREATE INDEX "PilotScenario_buildingId_idx" ON "PilotScenario"("buildingId");
CREATE INDEX "PilotScenario_projectId_idx" ON "PilotScenario"("projectId");
CREATE UNIQUE INDEX "PilotScenarioRun_scenarioId_sequence_key" ON "PilotScenarioRun"("scenarioId", "sequence");
CREATE INDEX "PilotScenarioRun_scenarioId_status_idx" ON "PilotScenarioRun"("scenarioId", "status");
CREATE UNIQUE INDEX "PilotScenarioCheck_runId_checkKey_key" ON "PilotScenarioCheck"("runId", "checkKey");
CREATE INDEX "PilotScenarioCheck_runId_phase_status_idx" ON "PilotScenarioCheck"("runId", "phase", "status");

ALTER TABLE "PilotScenario" ADD CONSTRAINT "PilotScenario_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenario" ADD CONSTRAINT "PilotScenario_buildingId_fkey"
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenario" ADD CONSTRAINT "PilotScenario_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenario" ADD CONSTRAINT "PilotScenario_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenarioRun" ADD CONSTRAINT "PilotScenarioRun_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "PilotScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenarioRun" ADD CONSTRAINT "PilotScenarioRun_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenarioCheck" ADD CONSTRAINT "PilotScenarioCheck_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "PilotScenarioRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotScenarioCheck" ADD CONSTRAINT "PilotScenarioCheck_observedById_fkey"
  FOREIGN KEY ("observedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
