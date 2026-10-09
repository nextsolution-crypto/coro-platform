CREATE TYPE "ProposalDocumentTemplateCode" AS ENUM (
  'CORO_PROFESSIONAL',
  'SENTINELLE_POPULATION_STANDALONE',
  'PROFESSIONAL_SERVICES',
  'COMBINED_OFFER'
);

CREATE TYPE "ProposalDocumentCompositionReadiness" AS ENUM (
  'INTERNAL_DRAFT',
  'ISSUANCE_READY'
);

CREATE TABLE "ProposalDocumentCompositionSnapshot" (
  "id" TEXT NOT NULL,
  "proposalRevisionId" TEXT NOT NULL,
  "templateCode" "ProposalDocumentTemplateCode" NOT NULL,
  "templateVersion" VARCHAR(50) NOT NULL,
  "language" "ProposalLanguage" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "readiness" "ProposalDocumentCompositionReadiness" NOT NULL DEFAULT 'INTERNAL_DRAFT',
  "issuanceReady" BOOLEAN NOT NULL DEFAULT false,
  "compositionKey" CHAR(64) NOT NULL,
  "canonicalHash" CHAR(64) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "diagnostics" JSONB NOT NULL,
  "composedByUserId" TEXT,
  "composedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProposalDocumentCompositionSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalDocumentCompositionSnapshot_values_check" CHECK (
    "sequence" > 0
    AND LENGTH(BTRIM("templateVersion")) > 0
    AND jsonb_typeof("snapshot") = 'object'
    AND jsonb_typeof("diagnostics") = 'array'
    AND (
      ("issuanceReady" = true AND "readiness" = 'ISSUANCE_READY')
      OR ("issuanceReady" = false AND "readiness" = 'INTERNAL_DRAFT')
    )
  )
);

CREATE UNIQUE INDEX "ProposalDocumentCompositionSnapshot_compositionKey_key"
  ON "ProposalDocumentCompositionSnapshot"("compositionKey");
CREATE UNIQUE INDEX "ProposalDocComposition_revision_template_lang_seq_key"
  ON "ProposalDocumentCompositionSnapshot"("proposalRevisionId", "templateCode", "language", "sequence");
CREATE INDEX "ProposalDocComposition_revision_composed_idx"
  ON "ProposalDocumentCompositionSnapshot"("proposalRevisionId", "composedAt");
CREATE INDEX "ProposalDocComposition_revision_template_lang_idx"
  ON "ProposalDocumentCompositionSnapshot"("proposalRevisionId", "templateCode", "language");

ALTER TABLE "ProposalDocumentCompositionSnapshot"
  ADD CONSTRAINT "ProposalDocumentCompositionSnapshot_proposalRevisionId_fkey"
  FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProposalDocumentCompositionSnapshot"
  ADD CONSTRAINT "ProposalDocumentCompositionSnapshot_composedByUserId_fkey"
  FOREIGN KEY ("composedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION protect_proposal_document_composition_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Proposal document composition snapshots are immutable';
END $$;

CREATE TRIGGER proposal_document_composition_snapshot_immutable
BEFORE UPDATE OR DELETE ON "ProposalDocumentCompositionSnapshot"
FOR EACH ROW EXECUTE FUNCTION protect_proposal_document_composition_snapshot();
