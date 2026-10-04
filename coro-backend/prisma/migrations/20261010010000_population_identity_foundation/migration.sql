-- Phase A is deliberately additive. Historical subscribers are left
-- unmanaged so existing duplicate identities cannot block deployment.
ALTER TYPE "PopulationSubscriberStatus" ADD VALUE 'ABANDONED';

ALTER TABLE "PopulationSubscriber"
ADD COLUMN "emailCanonical" TEXT,
ADD COLUMN "identityAuthorityAt" TIMESTAMP(3);

CREATE INDEX "PopulationSubscriber_programId_emailCanonical_idx"
ON "PopulationSubscriber"("programId", "emailCanonical");

CREATE INDEX "PopulationSubscriber_programId_identityAuthorityAt_idx"
ON "PopulationSubscriber"("programId", "identityAuthorityAt");

CREATE UNIQUE INDEX "PopulationSubscriber_managed_current_email_key"
ON "PopulationSubscriber"("programId", "emailCanonical")
WHERE "identityAuthorityAt" IS NOT NULL
  AND "emailCanonical" IS NOT NULL
  AND "status" IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

CREATE UNIQUE INDEX "PopulationSubscriber_managed_current_phone_key"
ON "PopulationSubscriber"("programId", "phoneCanonical")
WHERE "identityAuthorityAt" IS NOT NULL
  AND "phoneCanonical" IS NOT NULL
  AND "status" IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');
