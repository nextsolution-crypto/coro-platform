CREATE TABLE "PopulationSmsConsentEvidence" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "language" "PopulationPreferredLanguage" NOT NULL,
    "disclosureSnapshot" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationSmsConsentEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PopulationSmsConsentEvidence_programId_idx"
    ON "PopulationSmsConsentEvidence"("programId");

CREATE INDEX "PopulationSmsConsentEvidence_subscriberId_idx"
    ON "PopulationSmsConsentEvidence"("subscriberId");

CREATE INDEX "PopulationSmsConsentEvidence_submittedAt_idx"
    ON "PopulationSmsConsentEvidence"("submittedAt");

CREATE INDEX "PopulationSmsConsentEvidence_verifiedAt_idx"
    ON "PopulationSmsConsentEvidence"("verifiedAt");

ALTER TABLE "PopulationSmsConsentEvidence"
    ADD CONSTRAINT "PopulationSmsConsentEvidence_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PopulationSmsConsentEvidence"
    ADD CONSTRAINT "PopulationSmsConsentEvidence_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES "PopulationSubscriber"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
