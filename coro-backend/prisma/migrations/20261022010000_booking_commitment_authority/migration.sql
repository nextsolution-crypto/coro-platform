CREATE TYPE "BookingCommitmentChangeType" AS ENUM ('INITIAL_REQUEST', 'REASSIGNMENT', 'RESCHEDULE');
CREATE TYPE "BookingCommitmentStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'DECLINED', 'SUPERSEDED', 'CANCELLED');
CREATE TYPE "AdvisorEligibilityStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "ProjectAdvisorEligibility" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activityId" TEXT,
    "advisorUserId" TEXT NOT NULL,
    "status" "AdvisorEligibilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "authorizedByUserId" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectAdvisorEligibility_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectAdvisorEligibility_priority_check" CHECK ("priority" >= 0)
);

CREATE UNIQUE INDEX "ProjectAdvisorEligibility_projectId_activityId_advisorUserI_key"
  ON "ProjectAdvisorEligibility"("projectId", "activityId", "advisorUserId");
CREATE UNIQUE INDEX "ProjectAdvisorEligibility_project_scope_advisor_key"
  ON "ProjectAdvisorEligibility"("projectId", "advisorUserId") WHERE "activityId" IS NULL;
CREATE INDEX "ProjectAdvisorEligibility_organizationId_projectId_activity_idx"
  ON "ProjectAdvisorEligibility"("organizationId", "projectId", "activityId", "status", "priority");
CREATE INDEX "ProjectAdvisorEligibility_advisorUserId_status_idx"
  ON "ProjectAdvisorEligibility"("advisorUserId", "status");

ALTER TABLE "ProjectAdvisorEligibility" ADD CONSTRAINT "ProjectAdvisorEligibility_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAdvisorEligibility" ADD CONSTRAINT "ProjectAdvisorEligibility_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "ProjectActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAdvisorEligibility" ADD CONSTRAINT "ProjectAdvisorEligibility_advisorUserId_fkey"
  FOREIGN KEY ("advisorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAdvisorEligibility" ADD CONSTRAINT "ProjectAdvisorEligibility_authorizedByUserId_fkey"
  FOREIGN KEY ("authorizedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BookingCommitmentVersion" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "BookingCommitmentChangeType" NOT NULL,
    "status" "BookingCommitmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "projectId" TEXT NOT NULL,
    "activityId" TEXT,
    "buildingId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "canonicalFingerprint" TEXT NOT NULL,
    "proposedByActorType" TEXT NOT NULL,
    "proposedByActorId" TEXT NOT NULL,
    "customerRequested" BOOLEAN NOT NULL DEFAULT false,
    "customerAgreedAt" TIMESTAMP(3),
    "customerAgreedByClientUserId" TEXT,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookingCommitmentVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingCommitmentVersion_duration_check" CHECK ("durationMinutes" > 0 AND "endAt" > "startAt")
);

ALTER TABLE "Booking" ADD COLUMN "currentCommitmentVersionId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "pendingCommitmentVersionId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "commitmentLockVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookingAssignment" ADD COLUMN "commitmentVersionId" TEXT;
ALTER TABLE "BookingAssignment" ADD COLUMN "responseFingerprint" TEXT;
ALTER TABLE "BookingAssignment" ADD COLUMN "respondedByUserId" TEXT;

DROP INDEX "BookingAssignment_one_active_lead";
DROP INDEX "BookingAssignment_unique_active_person_role";
CREATE UNIQUE INDEX "BookingAssignment_one_active_legacy_lead" ON "BookingAssignment"("bookingId")
  WHERE "role" = 'LEAD' AND "status" IN ('PENDING', 'ACCEPTED') AND "commitmentVersionId" IS NULL;
CREATE UNIQUE INDEX "BookingAssignment_one_active_lead_per_commitment" ON "BookingAssignment"("commitmentVersionId")
  WHERE "role" = 'LEAD' AND "status" IN ('PENDING', 'ACCEPTED') AND "commitmentVersionId" IS NOT NULL;
CREATE UNIQUE INDEX "BookingAssignment_unique_active_legacy_person_role" ON "BookingAssignment"("bookingId", "userId", "role")
  WHERE "status" IN ('PENDING', 'ACCEPTED') AND "commitmentVersionId" IS NULL;
CREATE UNIQUE INDEX "BookingAssignment_unique_active_person_role_per_commitment" ON "BookingAssignment"("commitmentVersionId", "userId", "role")
  WHERE "status" IN ('PENDING', 'ACCEPTED') AND "commitmentVersionId" IS NOT NULL;

CREATE UNIQUE INDEX "BookingCommitmentVersion_canonicalFingerprint_key" ON "BookingCommitmentVersion"("canonicalFingerprint");
CREATE UNIQUE INDEX "BookingCommitmentVersion_bookingId_versionNumber_key" ON "BookingCommitmentVersion"("bookingId", "versionNumber");
CREATE INDEX "BookingCommitmentVersion_bookingId_status_idx" ON "BookingCommitmentVersion"("bookingId", "status");
CREATE INDEX "BookingCommitmentVersion_advisorId_status_startAt_endAt_idx" ON "BookingCommitmentVersion"("advisorId", "status", "startAt", "endAt");
CREATE UNIQUE INDEX "BookingCommitmentVersion_one_confirmed" ON "BookingCommitmentVersion"("bookingId") WHERE "status" = 'CONFIRMED';
CREATE UNIQUE INDEX "BookingCommitmentVersion_one_proposed" ON "BookingCommitmentVersion"("bookingId") WHERE "status" = 'PROPOSED';
CREATE UNIQUE INDEX "Booking_currentCommitmentVersionId_key" ON "Booking"("currentCommitmentVersionId");
CREATE UNIQUE INDEX "Booking_pendingCommitmentVersionId_key" ON "Booking"("pendingCommitmentVersionId");
CREATE INDEX "BookingAssignment_commitmentVersionId_status_idx" ON "BookingAssignment"("commitmentVersionId", "status");

ALTER TABLE "BookingCommitmentVersion" ADD CONSTRAINT "BookingCommitmentVersion_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_currentCommitmentVersionId_fkey" FOREIGN KEY ("currentCommitmentVersionId") REFERENCES "BookingCommitmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pendingCommitmentVersionId_fkey" FOREIGN KEY ("pendingCommitmentVersionId") REFERENCES "BookingCommitmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_commitmentVersionId_fkey" FOREIGN KEY ("commitmentVersionId") REFERENCES "BookingCommitmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "protect_booking_commitment_material_fields"() RETURNS trigger AS $$
BEGIN
  IF NEW."bookingId" IS DISTINCT FROM OLD."bookingId" OR NEW."versionNumber" IS DISTINCT FROM OLD."versionNumber"
    OR NEW."changeType" IS DISTINCT FROM OLD."changeType" OR NEW."projectId" IS DISTINCT FROM OLD."projectId"
    OR NEW."activityId" IS DISTINCT FROM OLD."activityId" OR NEW."buildingId" IS DISTINCT FROM OLD."buildingId"
    OR NEW."advisorId" IS DISTINCT FROM OLD."advisorId" OR NEW."startAt" IS DISTINCT FROM OLD."startAt"
    OR NEW."endAt" IS DISTINCT FROM OLD."endAt" OR NEW."durationMinutes" IS DISTINCT FROM OLD."durationMinutes"
    OR NEW."canonicalFingerprint" IS DISTINCT FROM OLD."canonicalFingerprint"
    OR NEW."proposedByActorType" IS DISTINCT FROM OLD."proposedByActorType"
    OR NEW."proposedByActorId" IS DISTINCT FROM OLD."proposedByActorId"
    OR NEW."customerRequested" IS DISTINCT FROM OLD."customerRequested" THEN
    RAISE EXCEPTION 'Booking commitment material fields are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BookingCommitmentVersion_material_immutable" BEFORE UPDATE ON "BookingCommitmentVersion"
FOR EACH ROW EXECUTE FUNCTION "protect_booking_commitment_material_fields"();

-- Client-originated operational audit uses the existing AuditLog authority.
-- Existing user audit rows remain unchanged; no historical actor is fabricated.
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD COLUMN "clientUserId" TEXT;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clientUserId_fkey"
  FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_exactly_one_actor_check"
  CHECK (("userId" IS NOT NULL AND "clientUserId" IS NULL) OR ("userId" IS NULL AND "clientUserId" IS NOT NULL));
CREATE INDEX "AuditLog_clientUserId_createdAt_idx" ON "AuditLog"("clientUserId", "createdAt");
