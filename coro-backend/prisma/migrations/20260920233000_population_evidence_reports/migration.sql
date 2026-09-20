CREATE TYPE "PopulationEvidenceReportStatus" AS ENUM ('GENERATING', 'FINALIZED');

CREATE TABLE "PopulationEvidenceReport" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "operationalEventId" TEXT NOT NULL,
  "evidenceRecordId" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "format" TEXT NOT NULL DEFAULT 'PDF',
  "language" TEXT NOT NULL DEFAULT 'FR',
  "status" "PopulationEvidenceReportStatus" NOT NULL DEFAULT 'GENERATING',
  "generationStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generationLeaseUntil" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "generatedByType" "CoroActorType" NOT NULL,
  "generatedById" TEXT NOT NULL,
  "generatorVersion" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileSize" INTEGER,
  "reportSha256" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PopulationEvidenceReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopulationEvidenceReport_storageKey_key" ON "PopulationEvidenceReport"("storageKey");
CREATE UNIQUE INDEX "PopulationEvidenceReport_evidenceRecordId_version_language_format_key" ON "PopulationEvidenceReport"("evidenceRecordId", "version", "language", "format");
CREATE INDEX "PopulationEvidenceReport_organizationId_buildingId_idx" ON "PopulationEvidenceReport"("organizationId", "buildingId");
CREATE INDEX "PopulationEvidenceReport_programId_idx" ON "PopulationEvidenceReport"("programId");
CREATE INDEX "PopulationEvidenceReport_operationalEventId_idx" ON "PopulationEvidenceReport"("operationalEventId");
CREATE INDEX "PopulationEvidenceReport_status_generationLeaseUntil_idx" ON "PopulationEvidenceReport"("status", "generationLeaseUntil");

ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_operationalEventId_fkey" FOREIGN KEY ("operationalEventId") REFERENCES "PopulationOperationalEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "PopulationEvidenceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationEvidenceReport" ADD CONSTRAINT "PopulationEvidenceReport_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "PopulationEvidenceManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_finalized_population_evidence_report_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'FINALIZED' THEN
    RAISE EXCEPTION 'FINALIZED PopulationEvidenceReport is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "PopulationEvidenceReport_immutable"
BEFORE UPDATE OR DELETE ON "PopulationEvidenceReport"
FOR EACH ROW EXECUTE FUNCTION reject_finalized_population_evidence_report_mutation();
