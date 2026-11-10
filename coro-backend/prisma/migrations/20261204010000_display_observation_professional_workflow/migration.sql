ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_READ';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_QUALIFY';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_ASSIGN';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_DECIDE';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_RESPOND';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_RESOLVE';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_CLOSE';
ALTER TYPE "DisplayPermission" ADD VALUE IF NOT EXISTS 'DISPLAY_OBSERVATION_AUDIT_READ';

ALTER TABLE "DisplayCorrectionObservation"
  ADD COLUMN "professionalPriority" "DisplayCorrectionPriority",
  ADD COLUMN "qualifiedCategory" "DisplayCorrectionCategory",
  ADD COLUMN "qualifiedAt" TIMESTAMP(3),
  ADD COLUMN "qualifiedByUserId" TEXT,
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "assignedByUserId" TEXT,
  ADD COLUMN "decisionAt" TIMESTAMP(3),
  ADD COLUMN "decidedByUserId" TEXT,
  ADD COLUMN "correctionReferenceType" TEXT,
  ADD COLUMN "correctionReferenceId" TEXT,
  ADD COLUMN "correctionEvidence" TEXT,
  ADD COLUMN "resolutionValidatedAt" TIMESTAMP(3),
  ADD COLUMN "resolutionValidatedById" TEXT;

ALTER TABLE "DisplayCorrectionObservationEvent"
  ALTER COLUMN "actorClientUserId" DROP NOT NULL,
  ADD COLUMN "actorUserId" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "fromStatus" "DisplayCorrectionStatus",
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "lockVersion" INTEGER;

CREATE TABLE "DisplayCorrectionObservationMessage" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "visibility" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayCorrectionObservationMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DisplayCorrectionObservation"
  ADD CONSTRAINT "DisplayCorrectionObservation_qualifiedByUserId_fkey" FOREIGN KEY ("qualifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservation_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservation_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservation_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservation_resolutionValidatedById_fkey" FOREIGN KEY ("resolutionValidatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DisplayCorrectionObservationEvent"
  ADD CONSTRAINT "DisplayCorrectionObservationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservationEvent_exactly_one_actor_check" CHECK (num_nonnulls("actorClientUserId", "actorUserId") = 1),
  ADD CONSTRAINT "DisplayCorrectionObservationEvent_reason_plain_text_check" CHECK ("reason" IS NULL OR (char_length(btrim("reason")) BETWEEN 3 AND 2000 AND "reason" !~ '[<>]'));

ALTER TABLE "DisplayCorrectionObservationMessage"
  ADD CONSTRAINT "DisplayCorrectionObservationMessage_observation_fkey" FOREIGN KEY ("observationId", "organizationId", "buildingId") REFERENCES "DisplayCorrectionObservation"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservationMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DisplayCorrectionObservationMessage_visibility_check" CHECK ("visibility" IN ('INTERNAL', 'CLIENT')),
  ADD CONSTRAINT "DisplayCorrectionObservationMessage_plain_text_check" CHECK (char_length(btrim("message")) BETWEEN 3 AND 4000 AND "message" !~ '[<>]' AND "message" !~ '[[:cntrl:]]');

CREATE UNIQUE INDEX "DisplayCorrectionObservationEvent_organizationId_requestId_key" ON "DisplayCorrectionObservationEvent"("organizationId", "requestId");
CREATE INDEX "DisplayCorrectionObservation_organizationId_assignedUserId_status_updatedAt_idx" ON "DisplayCorrectionObservation"("organizationId", "assignedUserId", "status", "updatedAt");
CREATE INDEX "DisplayCorrectionObservation_professionalPriority_status_updatedAt_idx" ON "DisplayCorrectionObservation"("professionalPriority", "status", "updatedAt");
CREATE UNIQUE INDEX "DisplayCorrectionObservationMessage_organizationId_requestId_key" ON "DisplayCorrectionObservationMessage"("organizationId", "requestId");
CREATE INDEX "DisplayCorrectionObservationMessage_observationId_createdAt_idx" ON "DisplayCorrectionObservationMessage"("observationId", "createdAt");
CREATE INDEX "DisplayCorrectionObservationMessage_organizationId_buildingId_visibility_createdAt_idx" ON "DisplayCorrectionObservationMessage"("organizationId", "buildingId", "visibility", "createdAt");

CREATE FUNCTION "coro_display_observation_workflow_tenant_guard"()
RETURNS trigger AS $$
DECLARE candidate TEXT;
BEGIN
  FOREACH candidate IN ARRAY ARRAY[NEW."qualifiedByUserId", NEW."assignedUserId", NEW."assignedByUserId", NEW."decidedByUserId", NEW."resolutionValidatedById"] LOOP
    IF candidate IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "User" u WHERE u."id" = candidate AND u."organizationId" = NEW."organizationId" AND u."isActive" = true
    ) THEN
      RAISE EXCEPTION 'DISPLAY_OBSERVATION_USER_SCOPE_INVALID' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DisplayCorrectionObservation_workflow_tenant_guard"
BEFORE INSERT OR UPDATE ON "DisplayCorrectionObservation"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_workflow_tenant_guard"();

CREATE FUNCTION "coro_display_observation_professional_actor_guard"()
RETURNS trigger AS $$
BEGIN
  IF NEW."actorUserId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u."id" = NEW."actorUserId" AND u."organizationId" = NEW."organizationId" AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'DISPLAY_OBSERVATION_ACTOR_SCOPE_INVALID' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DisplayCorrectionObservationEvent_professional_actor_guard"
BEFORE INSERT ON "DisplayCorrectionObservationEvent"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_professional_actor_guard"();

CREATE TRIGGER "DisplayCorrectionObservationMessage_append_only"
BEFORE UPDATE OR DELETE ON "DisplayCorrectionObservationMessage"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_no_delete"();

CREATE FUNCTION "coro_display_observation_message_actor_guard"()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "User" u
    WHERE u."id" = NEW."authorUserId"
      AND u."organizationId" = NEW."organizationId"
      AND u."isActive" = true
  ) THEN
    RAISE EXCEPTION 'DISPLAY_OBSERVATION_MESSAGE_ACTOR_SCOPE_INVALID' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DisplayCorrectionObservationMessage_actor_guard"
BEFORE INSERT ON "DisplayCorrectionObservationMessage"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_message_actor_guard"();
