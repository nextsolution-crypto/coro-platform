ALTER TYPE "CorrectiveActionPermission" ADD VALUE 'CORRECTIVE_ACTION_VERIFY';
ALTER TYPE "CorrectiveActionPermission" ADD VALUE 'CORRECTIVE_ACTION_CLOSE';
ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'VERIFICATION_ACCEPTED';
ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'VERIFICATION_REJECTED';
ALTER TYPE "CorrectiveActionAuditEventType" ADD VALUE 'CLOSED';
CREATE TYPE "CorrectiveActionVerificationVerdict" AS ENUM ('ACCEPTED', 'REJECTED');

ALTER TABLE "CorrectiveAction"
  ADD COLUMN "verifiedAt" TIMESTAMP(3), ADD COLUMN "verifiedByType" "CoroActorType", ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "closedByType" "CoroActorType", ADD COLUMN "closedById" TEXT,
  ADD COLUMN "closureComment" TEXT;

CREATE TABLE "CorrectiveActionVerification" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "correctiveActionId" TEXT NOT NULL,
  "clientIntentId" TEXT NOT NULL, "attemptNumber" INTEGER NOT NULL,
  "verdict" "CorrectiveActionVerificationVerdict" NOT NULL, "comment" TEXT,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "verifiedByType" "CoroActorType" NOT NULL,
  "verifiedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorrectiveActionVerification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorrectiveActionVerification_action_org_fkey" FOREIGN KEY ("correctiveActionId", "organizationId") REFERENCES "CorrectiveAction"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CorrectiveActionVerification_attempt_check" CHECK ("attemptNumber" > 0),
  CONSTRAINT "CorrectiveActionVerification_rejected_comment_check" CHECK ("verdict" <> 'REJECTED' OR length(trim("comment")) > 0)
);
CREATE UNIQUE INDEX "CorrectiveActionVerification_org_intent_key" ON "CorrectiveActionVerification"("organizationId", "clientIntentId");
CREATE UNIQUE INDEX "CorrectiveActionVerification_action_attempt_key" ON "CorrectiveActionVerification"("correctiveActionId", "attemptNumber");
CREATE INDEX "CorrectiveActionVerification_organizationId_idx" ON "CorrectiveActionVerification"("organizationId");

CREATE FUNCTION prevent_corrective_action_verification_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'CorrectiveActionVerification is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "CorrectiveActionVerification_immutable" BEFORE UPDATE OR DELETE ON "CorrectiveActionVerification" FOR EACH ROW EXECUTE FUNCTION prevent_corrective_action_verification_mutation();

CREATE FUNCTION prevent_closed_corrective_action_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'CLOSED' THEN RAISE EXCEPTION 'CLOSED CorrectiveAction is immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "CorrectiveAction_closed_immutable" BEFORE UPDATE OR DELETE ON "CorrectiveAction" FOR EACH ROW EXECUTE FUNCTION prevent_closed_corrective_action_mutation();

CREATE FUNCTION prevent_frozen_corrective_action_evidence() RETURNS trigger AS $$
DECLARE action_status TEXT;
BEGIN
  SELECT "status" INTO action_status FROM "CorrectiveAction" WHERE "id" = NEW."correctiveActionId" AND "organizationId" = NEW."organizationId";
  IF action_status IN ('VERIFIED', 'CLOSED') THEN RAISE EXCEPTION 'Evidence is frozen after verification'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "CorrectiveActionEvidence_frozen" BEFORE INSERT OR UPDATE ON "CorrectiveActionEvidence" FOR EACH ROW EXECUTE FUNCTION prevent_frozen_corrective_action_evidence();
