ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'EVIDENCE_ADDED';
ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'EVIDENCE_WITHDRAWN';
ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'COMPLETED';
CREATE TYPE "CorrectiveActionEvidenceType" AS ENUM ('NOTE', 'DOCUMENT', 'PHOTO', 'LINK', 'SYSTEM_REFERENCE');
CREATE TYPE "CorrectiveActionEvidenceStatus" AS ENUM ('PENDING', 'ACTIVE', 'WITHDRAWN');
CREATE TYPE "CorrectiveActionSystemReferenceType" AS ENUM ('POPULATION_EVIDENCE', 'EXERCISE_REPORT', 'INCIDENT');
ALTER TABLE "CorrectiveAction" ADD COLUMN "completedByType" "CoroActorType", ADD COLUMN "completedById" TEXT, ADD COLUMN "completionComment" TEXT;
CREATE UNIQUE INDEX "CorrectiveAction_id_organizationId_key" ON "CorrectiveAction"("id", "organizationId");

CREATE TABLE "CorrectiveActionEvidence" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "correctiveActionId" TEXT NOT NULL, "clientIntentId" TEXT NOT NULL,
  "type" "CorrectiveActionEvidenceType" NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "status" "CorrectiveActionEvidenceStatus" NOT NULL DEFAULT 'PENDING', "storageKey" TEXT, "originalFileName" TEXT,
  "mimeType" TEXT, "fileSize" INTEGER, "sha256" TEXT, "externalUrl" TEXT,
  "systemReferenceType" "CorrectiveActionSystemReferenceType", "systemReferenceId" TEXT, "noteText" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "submittedByType" "CoroActorType" NOT NULL,
  "submittedById" TEXT NOT NULL, "withdrawnAt" TIMESTAMP(3), "withdrawnByType" "CoroActorType", "withdrawnById" TEXT,
  "withdrawalReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorrectiveActionEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorrectiveActionEvidence_action_org_fkey" FOREIGN KEY ("correctiveActionId", "organizationId") REFERENCES "CorrectiveAction"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CorrectiveActionEvidence_type_check" CHECK (
    ("type" = 'NOTE' AND "noteText" IS NOT NULL AND "storageKey" IS NULL AND "externalUrl" IS NULL AND "systemReferenceType" IS NULL AND "systemReferenceId" IS NULL) OR
    ("type" IN ('DOCUMENT', 'PHOTO') AND "storageKey" IS NOT NULL AND "originalFileName" IS NOT NULL AND "mimeType" IS NOT NULL AND "fileSize" IS NOT NULL AND "sha256" IS NOT NULL AND "noteText" IS NULL AND "externalUrl" IS NULL AND "systemReferenceType" IS NULL AND "systemReferenceId" IS NULL) OR
    ("type" = 'LINK' AND "externalUrl" IS NOT NULL AND "storageKey" IS NULL AND "noteText" IS NULL AND "systemReferenceType" IS NULL AND "systemReferenceId" IS NULL) OR
    ("type" = 'SYSTEM_REFERENCE' AND "systemReferenceType" IS NOT NULL AND "systemReferenceId" IS NOT NULL AND "storageKey" IS NULL AND "noteText" IS NULL AND "externalUrl" IS NULL)),
  CONSTRAINT "CorrectiveActionEvidence_withdrawal_check" CHECK (("status" <> 'WITHDRAWN' AND "withdrawnAt" IS NULL AND "withdrawnByType" IS NULL AND "withdrawnById" IS NULL AND "withdrawalReason" IS NULL) OR ("status" = 'WITHDRAWN' AND "withdrawnAt" IS NOT NULL AND "withdrawnByType" IS NOT NULL AND "withdrawnById" IS NOT NULL AND length(trim("withdrawalReason")) > 0)),
  CONSTRAINT "CorrectiveActionEvidence_sha256_check" CHECK ("sha256" IS NULL OR "sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "CorrectiveActionEvidence_file_size_check" CHECK ("fileSize" IS NULL OR "fileSize" > 0)
);
CREATE UNIQUE INDEX "CorrectiveActionEvidence_storageKey_key" ON "CorrectiveActionEvidence"("storageKey");
CREATE UNIQUE INDEX "CorrectiveActionEvidence_organizationId_clientIntentId_key" ON "CorrectiveActionEvidence"("organizationId", "clientIntentId");
CREATE INDEX "CorrectiveActionEvidence_action_status_submitted_idx" ON "CorrectiveActionEvidence"("correctiveActionId", "status", "submittedAt");
CREATE INDEX "CorrectiveActionEvidence_organizationId_idx" ON "CorrectiveActionEvidence"("organizationId");
CREATE INDEX "CorrectiveActionEvidence_system_reference_idx" ON "CorrectiveActionEvidence"("systemReferenceType", "systemReferenceId");

CREATE FUNCTION prevent_corrective_action_evidence_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'CorrectiveActionEvidence is append-only'; END IF;
  IF OLD."status" = 'PENDING' AND NEW."status" = 'ACTIVE' AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN RETURN NEW; END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'WITHDRAWN' AND
    (to_jsonb(NEW) - ARRAY['status','withdrawnAt','withdrawnByType','withdrawnById','withdrawalReason']::text[]) =
    (to_jsonb(OLD) - ARRAY['status','withdrawnAt','withdrawnByType','withdrawnById','withdrawalReason']::text[]) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'CorrectiveActionEvidence content is immutable';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "CorrectiveActionEvidence_immutable" BEFORE UPDATE OR DELETE ON "CorrectiveActionEvidence" FOR EACH ROW EXECUTE FUNCTION prevent_corrective_action_evidence_mutation();
