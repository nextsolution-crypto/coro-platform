CREATE TYPE "CorrectiveActionPermission" AS ENUM ('CORRECTIVE_ACTION_CREATE', 'CORRECTIVE_ACTION_EDIT', 'CORRECTIVE_ACTION_COMPLETE');
CREATE TYPE "CorrectiveActionAssigneeType" AS ENUM ('CLIENT_USER', 'USER', 'EXTERNAL');
CREATE TYPE "CorrectiveActionAuditEventType" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'STATUS_CHANGED', 'CANCELLED', 'SOURCE_LINKED');
ALTER TABLE "ClientUser" ADD COLUMN "correctiveActionPermissions" "CorrectiveActionPermission"[] NOT NULL DEFAULT ARRAY[]::"CorrectiveActionPermission"[];
CREATE SEQUENCE "corrective_action_reference_seq";
CREATE FUNCTION corrective_action_reference() RETURNS text LANGUAGE sql AS $$ SELECT 'AC-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-' || LPAD(nextval('corrective_action_reference_seq')::text, 6, '0') $$;
ALTER TABLE "CorrectiveAction"
 ADD COLUMN "reference" TEXT,
 ADD COLUMN "clientIntentId" TEXT,
 ADD COLUMN "assigneeType" "CorrectiveActionAssigneeType",
 ADD COLUMN "assigneeId" TEXT,
 ADD COLUMN "assigneeDisplayNameSnapshot" TEXT,
 ADD COLUMN "visibility" "OperationalReviewConfidentiality" NOT NULL DEFAULT 'BUILDING_TEAM',
 ADD COLUMN "reviewRecommendationId" TEXT,
 ADD COLUMN "createdByType" "CoroActorType",
 ADD COLUMN "createdById" TEXT,
 ADD COLUMN "updatedByType" "CoroActorType",
 ADD COLUMN "updatedById" TEXT;
ALTER TABLE "CorrectiveAction" ALTER COLUMN "reference" SET DEFAULT corrective_action_reference();
CREATE UNIQUE INDEX "CorrectiveAction_reference_key" ON "CorrectiveAction"("reference");
CREATE UNIQUE INDEX "CorrectiveAction_clientIntentId_key" ON "CorrectiveAction"("clientIntentId");
CREATE INDEX "CorrectiveAction_reviewRecommendationId_idx" ON "CorrectiveAction"("reviewRecommendationId");
CREATE UNIQUE INDEX "ReviewRecommendation_id_organizationId_key" ON "ReviewRecommendation"("id", "organizationId");
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_reviewRecommendation_fkey" FOREIGN KEY ("reviewRecommendationId", "organizationId") REFERENCES "ReviewRecommendation"("id", "organizationId") ON DELETE RESTRICT;
CREATE TABLE "CorrectiveActionAuditEvent" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "correctiveActionId" TEXT NOT NULL,
 "eventType" "CorrectiveActionAuditEventType" NOT NULL, "actorType" "CoroActorType" NOT NULL, "actorId" TEXT NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "metadata" JSONB,
 CONSTRAINT "CorrectiveActionAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CorrectiveActionAuditEvent_action_occurred_idx" ON "CorrectiveActionAuditEvent"("correctiveActionId", "occurredAt");
CREATE INDEX "CorrectiveActionAuditEvent_organizationId_idx" ON "CorrectiveActionAuditEvent"("organizationId");
ALTER TABLE "CorrectiveActionAuditEvent" ADD CONSTRAINT "CorrectiveActionAuditEvent_action_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction"("id") ON DELETE RESTRICT;
CREATE FUNCTION protect_corrective_action_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'CorrectiveActionAuditEvent is append-only'; END $$;
CREATE TRIGGER "CorrectiveActionAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "CorrectiveActionAuditEvent" FOR EACH ROW EXECUTE FUNCTION protect_corrective_action_audit();
