CREATE TYPE "CommercialQuantityBasis" AS ENUM ('DECLARED', 'METERED');

ALTER TABLE "ProposalLine"
ADD COLUMN "commercialQuantityBasis" "CommercialQuantityBasis",
ADD COLUMN "commercialRuleCode" VARCHAR(100),
ADD COLUMN "commercialRuleVersion" VARCHAR(50),
ADD CONSTRAINT "ProposalLine_commercial_quantity_binding_check" CHECK (
  (
    "commercialQuantityBasis" IS NULL
    AND "commercialRuleCode" IS NULL
    AND "commercialRuleVersion" IS NULL
  )
  OR (
    "commercialQuantityBasis" = 'DECLARED'
    AND "commercialRuleCode" IS NULL
    AND "commercialRuleVersion" IS NULL
  )
  OR (
    "commercialQuantityBasis" = 'METERED'
    AND "commercialRuleCode" IS NOT NULL
    AND btrim("commercialRuleCode") <> ''
    AND "commercialRuleCode" = upper(btrim("commercialRuleCode"))
    AND "commercialRuleCode" ~ '^[A-Z][A-Z0-9_]{0,99}$'
    AND "commercialRuleVersion" IS NOT NULL
    AND btrim("commercialRuleVersion") <> ''
    AND "commercialRuleVersion" = btrim("commercialRuleVersion")
  )
);

ALTER TABLE "ContractPriceSnapshotLine"
ADD COLUMN "commercialQuantityBasis" "CommercialQuantityBasis",
ADD COLUMN "commercialRuleCode" VARCHAR(100),
ADD COLUMN "commercialRuleVersion" VARCHAR(50),
ADD CONSTRAINT "ContractPriceSnapshotLine_commercial_quantity_binding_check" CHECK (
  (
    "commercialQuantityBasis" IS NULL
    AND "commercialRuleCode" IS NULL
    AND "commercialRuleVersion" IS NULL
  )
  OR (
    "commercialQuantityBasis" = 'DECLARED'
    AND "commercialRuleCode" IS NULL
    AND "commercialRuleVersion" IS NULL
  )
  OR (
    "commercialQuantityBasis" = 'METERED'
    AND "commercialRuleCode" IS NOT NULL
    AND btrim("commercialRuleCode") <> ''
    AND "commercialRuleCode" = upper(btrim("commercialRuleCode"))
    AND "commercialRuleCode" ~ '^[A-Z][A-Z0-9_]{0,99}$'
    AND "commercialRuleVersion" IS NOT NULL
    AND btrim("commercialRuleVersion") <> ''
    AND "commercialRuleVersion" = btrim("commercialRuleVersion")
  )
);

CREATE FUNCTION protect_contract_organization_ancestry() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
     AND EXISTS (
       SELECT 1
       FROM "OrganizationContractRevision"
       WHERE "contractId" = OLD."id"
     ) THEN
    RAISE EXCEPTION 'Contract organization ancestry is immutable after a revision exists';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "OrganizationContract_organization_ancestry_immutable"
BEFORE UPDATE OF "organizationId" ON "OrganizationContract"
FOR EACH ROW EXECUTE FUNCTION protect_contract_organization_ancestry();
