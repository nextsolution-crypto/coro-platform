CREATE TABLE "PopulationEvidenceManifest" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "operationalEventId" TEXT NOT NULL,
  "evidenceRecordId" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedByType" "CoroActorType" NOT NULL,
  "generatedById" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "manifestSha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PopulationEvidenceManifest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopulationEvidenceManifest_evidenceRecordId_version_key" ON "PopulationEvidenceManifest"("evidenceRecordId", "version");
CREATE INDEX "PopulationEvidenceManifest_organizationId_buildingId_idx" ON "PopulationEvidenceManifest"("organizationId", "buildingId");
CREATE INDEX "PopulationEvidenceManifest_programId_idx" ON "PopulationEvidenceManifest"("programId");
CREATE INDEX "PopulationEvidenceManifest_operationalEventId_idx" ON "PopulationEvidenceManifest"("operationalEventId");
CREATE INDEX "PopulationEvidenceManifest_createdAt_idx" ON "PopulationEvidenceManifest"("createdAt");

ALTER TABLE "PopulationEvidenceManifest" ADD CONSTRAINT "PopulationEvidenceManifest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceManifest" ADD CONSTRAINT "PopulationEvidenceManifest_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceManifest" ADD CONSTRAINT "PopulationEvidenceManifest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceManifest" ADD CONSTRAINT "PopulationEvidenceManifest_operationalEventId_fkey" FOREIGN KEY ("operationalEventId") REFERENCES "PopulationOperationalEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceManifest" ADD CONSTRAINT "PopulationEvidenceManifest_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "PopulationEvidenceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_population_evidence_manifest_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PopulationEvidenceManifest is immutable';
END;
$$;

CREATE TRIGGER "PopulationEvidenceManifest_immutable"
BEFORE UPDATE OR DELETE ON "PopulationEvidenceManifest"
FOR EACH ROW EXECUTE FUNCTION reject_population_evidence_manifest_mutation();
