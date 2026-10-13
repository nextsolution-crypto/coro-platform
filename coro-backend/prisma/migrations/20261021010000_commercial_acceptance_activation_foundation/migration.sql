ALTER TABLE "CommercialProposalRevision"
  ADD COLUMN "acceptanceOccurredAt" TIMESTAMP(3),
  ADD COLUMN "acceptedByAuthority" TEXT;

-- Keep the existing revision immutability authority while allowing the two
-- acceptance lifecycle fields to be recorded during SENT -> ACCEPTED.
CREATE OR REPLACE FUNCTION protect_proposal_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Proposal revisions cannot be deleted'; END IF;
  IF OLD."status" IN ('ACCEPTED','REJECTED','SUPERSEDED','CANCELLED') THEN RAISE EXCEPTION 'Terminal proposal revision is immutable'; END IF;
  IF OLD."status"<>'DRAFT' AND
     (to_jsonb(NEW)-ARRAY['status','lifecycleReason','lockVersion','updatedAt','sentAt','sentDocumentId','acceptedAt','acceptanceOccurredAt','acceptedByName','acceptedByAuthority','acceptanceReference','rejectedAt','cancelledAt','supersededAt']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','lifecycleReason','lockVersion','updatedAt','sentAt','sentDocumentId','acceptedAt','acceptanceOccurredAt','acceptedByName','acceptedByAuthority','acceptanceReference','rejectedAt','cancelledAt','supersededAt'])
  THEN RAISE EXCEPTION 'Frozen proposal revision content is immutable'; END IF;
  IF NEW."lockVersion"<>OLD."lockVersion"+1 THEN RAISE EXCEPTION 'Invalid proposal revision lockVersion'; END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION protect_commercial_proposal_acceptance_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'ACCEPTED' AND (
    NEW."acceptedAt" IS DISTINCT FROM OLD."acceptedAt" OR
    NEW."acceptanceOccurredAt" IS DISTINCT FROM OLD."acceptanceOccurredAt" OR
    NEW."acceptedByName" IS DISTINCT FROM OLD."acceptedByName" OR
    NEW."acceptedByAuthority" IS DISTINCT FROM OLD."acceptedByAuthority" OR
    NEW."acceptanceReference" IS DISTINCT FROM OLD."acceptanceReference" OR
    NEW."sentDocumentId" IS DISTINCT FROM OLD."sentDocumentId"
  ) THEN
    RAISE EXCEPTION 'Accepted proposal evidence is immutable';
  END IF;

  IF NEW."status" = 'ACCEPTED' AND OLD."status" <> 'ACCEPTED' THEN
    IF NEW."sentDocumentId" IS NULL OR
       NULLIF(BTRIM(NEW."acceptedByName"), '') IS NULL OR
       NULLIF(BTRIM(NEW."acceptedByAuthority"), '') IS NULL OR
       NULLIF(BTRIM(NEW."acceptanceReference"), '') IS NULL OR
       NEW."acceptedAt" IS NULL OR
       NEW."acceptanceOccurredAt" IS NULL THEN
      RAISE EXCEPTION 'Complete acceptance evidence is required';
    END IF;
    IF NEW."acceptanceOccurredAt" > NEW."acceptedAt" THEN
      RAISE EXCEPTION 'Acceptance occurrence cannot follow recording';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER commercial_proposal_acceptance_evidence_immutable
BEFORE UPDATE ON "CommercialProposalRevision"
FOR EACH ROW
EXECUTE FUNCTION protect_commercial_proposal_acceptance_evidence();
