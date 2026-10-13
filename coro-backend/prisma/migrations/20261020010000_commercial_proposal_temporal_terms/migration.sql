CREATE TABLE "CommercialProposalTemporalTerms" (
  "id" TEXT NOT NULL,
  "proposalRevisionId" TEXT NOT NULL,
  "serviceStartDate" DATE,
  "initialInvoiceDate" DATE,
  "externalSignatureDate" DATE,
  "externalSignatureEvidence" VARCHAR(500),
  "offerValidityDays" INTEGER NOT NULL DEFAULT 90,
  "initialTermMonths" INTEGER NOT NULL DEFAULT 12,
  "paymentNetDays" INTEGER NOT NULL DEFAULT 30,
  "automaticRenewal" BOOLEAN NOT NULL DEFAULT true,
  "nonrenewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
  "renewalTermMonths" INTEGER,
  "contractualTimezone" VARCHAR(100) NOT NULL DEFAULT 'America/Toronto',
  "calendarConventionVersion" VARCHAR(100) NOT NULL DEFAULT 'proposal-calendar/v1',
  "provenance" JSONB NOT NULL,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialProposalTemporalTerms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialProposalTemporalTerms_values_check" CHECK (
    "offerValidityDays" > 0 AND "initialTermMonths" > 0 AND
    "paymentNetDays" >= 0 AND "nonrenewalNoticeDays" >= 0 AND
    ("renewalTermMonths" IS NULL OR "renewalTermMonths" > 0) AND
    "lockVersion" >= 0 AND LENGTH(BTRIM("contractualTimezone")) > 0 AND
    LENGTH(BTRIM("calendarConventionVersion")) > 0 AND
    jsonb_typeof("provenance") = 'object' AND
    (("externalSignatureDate" IS NULL AND "externalSignatureEvidence" IS NULL) OR
     ("externalSignatureDate" IS NOT NULL AND LENGTH(BTRIM("externalSignatureEvidence")) > 0))
  )
);

CREATE UNIQUE INDEX "CommercialProposalTemporalTerms_proposalRevisionId_key" ON "CommercialProposalTemporalTerms"("proposalRevisionId");
CREATE INDEX "CommercialProposalTemporalTerms_serviceStartDate_idx" ON "CommercialProposalTemporalTerms"("serviceStartDate");
CREATE INDEX "CommercialProposalTemporalTerms_initialInvoiceDate_idx" ON "CommercialProposalTemporalTerms"("initialInvoiceDate");

ALTER TABLE "CommercialProposalTemporalTerms" ADD CONSTRAINT "CommercialProposalTemporalTerms_proposalRevisionId_fkey"
  FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_commercial_proposal_temporal_terms() RETURNS TRIGGER AS $$
DECLARE revision_status "CommercialProposalRevisionStatus";
BEGIN
  SELECT "status" INTO revision_status FROM "CommercialProposalRevision"
  WHERE "id" = COALESCE(NEW."proposalRevisionId", OLD."proposalRevisionId") FOR UPDATE;
  IF revision_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Commercial proposal temporal terms are immutable outside DRAFT';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Commercial proposal temporal terms cannot be deleted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commercial_proposal_temporal_terms_protect BEFORE INSERT OR UPDATE OR DELETE
  ON "CommercialProposalTemporalTerms" FOR EACH ROW EXECUTE FUNCTION protect_commercial_proposal_temporal_terms();
