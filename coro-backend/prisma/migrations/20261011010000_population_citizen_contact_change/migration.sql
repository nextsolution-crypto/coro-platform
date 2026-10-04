CREATE TYPE "PopulationContactChangeType" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "PopulationContactChangePurpose" AS ENUM ('ADD', 'CHANGE');
CREATE TYPE "PopulationContactChangeStatus" AS ENUM ('DELIVERY_PENDING', 'OTP_REQUIRED', 'APPLIED', 'CANCELLED', 'EXPIRED', 'ATTEMPTS_EXHAUSTED', 'SUPERSEDED', 'DELIVERY_FAILED');

CREATE TABLE "PopulationContactChangeChallenge" (
  "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "subscriberId" TEXT NOT NULL,
  "type" "PopulationContactChangeType" NOT NULL, "purpose" "PopulationContactChangePurpose" NOT NULL,
  "status" "PopulationContactChangeStatus" NOT NULL DEFAULT 'DELIVERY_PENDING',
  "proposedDestinationProtected" TEXT, "proposedDestinationFingerprint" TEXT NOT NULL,
  "expectedCurrentDestinationFingerprint" TEXT, "expectedCurrentDestinationAbsent" BOOLEAN NOT NULL DEFAULT false,
  "codeHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "deliveryGeneration" INTEGER NOT NULL DEFAULT 1, "resendCount" INTEGER NOT NULL DEFAULT 0,
  "operationVersion" TEXT NOT NULL, "consentVersion" TEXT, "source" TEXT NOT NULL, "surface" TEXT NOT NULL,
  "deliveryAttemptedAt" TIMESTAMP(3), "deliveryAcceptedAt" TIMESTAMP(3), "deliveryFailedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3), "appliedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3), "exhaustedAt" TIMESTAMP(3), "supersededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PopulationContactChangeChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PopulationContactChangeChallenge_current_binding_check" CHECK (("purpose" = 'ADD' AND "expectedCurrentDestinationAbsent" = true AND "expectedCurrentDestinationFingerprint" IS NULL) OR ("purpose" = 'CHANGE' AND "expectedCurrentDestinationAbsent" = false AND "expectedCurrentDestinationFingerprint" IS NOT NULL)),
  CONSTRAINT "PopulationContactChangeChallenge_attempts_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts" AND "deliveryGeneration" > 0 AND "resendCount" >= 0),
  CONSTRAINT "PopulationContactChangeChallenge_consent_check" CHECK (("type" = 'PHONE' AND "consentVersion" IS NOT NULL) OR ("type" = 'EMAIL' AND "consentVersion" IS NULL)),
  CONSTRAINT "PopulationContactChangeChallenge_terminal_pii_check" CHECK ("status" IN ('DELIVERY_PENDING', 'OTP_REQUIRED') OR "proposedDestinationProtected" IS NULL)
);

ALTER TABLE "PopulationSmsConsentEvidence" ADD COLUMN "contactChangeChallengeId" TEXT;
CREATE UNIQUE INDEX "PopulationContactChangeChallenge_operational_key" ON "PopulationContactChangeChallenge" ("subscriberId", "type") WHERE "status" IN ('DELIVERY_PENDING', 'OTP_REQUIRED');
CREATE INDEX "PopulationContactChangeChallenge_subscriberId_type_status_idx" ON "PopulationContactChangeChallenge" ("subscriberId", "type", "status");
CREATE INDEX "PopulationContactChangeChallenge_subscriberId_type_status_p_idx" ON "PopulationContactChangeChallenge" ("subscriberId", "type", "status", "proposedDestinationFingerprint");
CREATE INDEX "PopulationContactChangeChallenge_programId_idx" ON "PopulationContactChangeChallenge" ("programId");
CREATE INDEX "PopulationContactChangeChallenge_expiresAt_idx" ON "PopulationContactChangeChallenge" ("expiresAt");
CREATE UNIQUE INDEX "PopulationSmsConsentEvidence_contactChangeChallengeId_key" ON "PopulationSmsConsentEvidence" ("contactChangeChallengeId");
ALTER TABLE "PopulationContactChangeChallenge" ADD CONSTRAINT "PopulationContactChangeChallenge_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationContactChangeChallenge" ADD CONSTRAINT "PopulationContactChangeChallenge_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "PopulationSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationSmsConsentEvidence" ADD CONSTRAINT "PopulationSmsConsentEvidence_contactChangeChallengeId_fkey" FOREIGN KEY ("contactChangeChallengeId") REFERENCES "PopulationContactChangeChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "population_contact_change_immutable_terminal"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" NOT IN ('DELIVERY_PENDING', 'OTP_REQUIRED') THEN RAISE EXCEPTION 'Population contact change terminal state is immutable'; END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" NOT IN ('DELIVERY_PENDING', 'OTP_REQUIRED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Population contact change terminal state is immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PopulationContactChangeChallenge_terminal_immutable" BEFORE UPDATE OR DELETE ON "PopulationContactChangeChallenge" FOR EACH ROW EXECUTE FUNCTION "population_contact_change_immutable_terminal"();
