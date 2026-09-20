CREATE TYPE "PopulationEvidenceStatus" AS ENUM ('FINALIZED', 'SUPERSEDED');

CREATE SEQUENCE "PopulationEvidenceReferenceSeq";

CREATE FUNCTION population_evidence_reference()
RETURNS TEXT
LANGUAGE SQL
VOLATILE
AS $$
  SELECT 'CORO-SP-' ||
    to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY') || '-' ||
    lpad(nextval('"PopulationEvidenceReferenceSeq"')::text, 6, '0')
$$;

CREATE TABLE "PopulationEvidenceRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "operationalEventId" TEXT NOT NULL,
  "reference" TEXT NOT NULL DEFAULT population_evidence_reference(),
  "schemaVersion" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "PopulationEvidenceStatus" NOT NULL DEFAULT 'FINALIZED',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedByType" "CoroActorType" NOT NULL,
  "generatedById" TEXT NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedByType" "CoroActorType" NOT NULL,
  "finalizedById" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "snapshotSha256" TEXT NOT NULL,
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PopulationEvidenceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopulationEvidenceRecord_reference_key" ON "PopulationEvidenceRecord"("reference");
CREATE UNIQUE INDEX "PopulationEvidenceRecord_supersedesId_key" ON "PopulationEvidenceRecord"("supersedesId");
CREATE UNIQUE INDEX "PopulationEvidenceRecord_operationalEventId_version_key" ON "PopulationEvidenceRecord"("operationalEventId", "version");
CREATE INDEX "PopulationEvidenceRecord_organizationId_buildingId_idx" ON "PopulationEvidenceRecord"("organizationId", "buildingId");
CREATE INDEX "PopulationEvidenceRecord_programId_idx" ON "PopulationEvidenceRecord"("programId");
CREATE INDEX "PopulationEvidenceRecord_status_idx" ON "PopulationEvidenceRecord"("status");
CREATE INDEX "PopulationEvidenceRecord_createdAt_idx" ON "PopulationEvidenceRecord"("createdAt");

ALTER TABLE "PopulationEvidenceRecord" ADD CONSTRAINT "PopulationEvidenceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceRecord" ADD CONSTRAINT "PopulationEvidenceRecord_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceRecord" ADD CONSTRAINT "PopulationEvidenceRecord_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceRecord" ADD CONSTRAINT "PopulationEvidenceRecord_operationalEventId_fkey" FOREIGN KEY ("operationalEventId") REFERENCES "PopulationOperationalEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceRecord" ADD CONSTRAINT "PopulationEvidenceRecord_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "PopulationEvidenceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_population_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'FINALIZED PopulationEvidenceRecord is immutable';
END;
$$;

CREATE TRIGGER "PopulationEvidenceRecord_immutable"
BEFORE UPDATE OR DELETE ON "PopulationEvidenceRecord"
FOR EACH ROW
WHEN (OLD."status" = 'FINALIZED')
EXECUTE FUNCTION reject_population_evidence_mutation();
