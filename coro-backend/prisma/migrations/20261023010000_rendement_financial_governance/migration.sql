CREATE TYPE "AdvisorInternalCostRateStatus" AS ENUM ('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

CREATE TABLE "AdvisorInternalCostRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "hourlyCost" DECIMAL(20,6) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "status" "AdvisorInternalCostRateStatus" NOT NULL DEFAULT 'DRAFT',
    "proposedByUserId" TEXT,
    "proposedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "supersedesRateId" TEXT,
    "supersededByUserId" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededEffectiveAt" DATE,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvisorInternalCostRate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdvisorInternalCostRate_value_check" CHECK (
      "hourlyCost" >= 0 AND "currency" ~ '^[A-Z]{3}$' AND "lockVersion" >= 0
      AND ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom")
      AND ("supersedesRateId" IS NULL OR "supersedesRateId" <> "id")
    ),
    CONSTRAINT "AdvisorInternalCostRate_lifecycle_check" CHECK (
      ("status" = 'DRAFT' AND "proposedByUserId" IS NULL AND "proposedAt" IS NULL AND "approvedByUserId" IS NULL AND "approvedAt" IS NULL AND "rejectedByUserId" IS NULL AND "rejectedAt" IS NULL AND "supersededByUserId" IS NULL AND "supersededAt" IS NULL AND "supersededEffectiveAt" IS NULL)
      OR ("status" = 'PROPOSED' AND "proposedByUserId" IS NOT NULL AND "proposedAt" IS NOT NULL AND "approvedByUserId" IS NULL AND "approvedAt" IS NULL AND "rejectedByUserId" IS NULL AND "rejectedAt" IS NULL AND "supersededByUserId" IS NULL AND "supersededAt" IS NULL AND "supersededEffectiveAt" IS NULL)
      OR ("status" = 'APPROVED' AND "proposedByUserId" IS NOT NULL AND "proposedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "approvedByUserId" <> "proposedByUserId" AND "rejectedByUserId" IS NULL AND "rejectedAt" IS NULL AND "supersededByUserId" IS NULL AND "supersededAt" IS NULL AND "supersededEffectiveAt" IS NULL)
      OR ("status" = 'REJECTED' AND "proposedByUserId" IS NOT NULL AND "proposedAt" IS NOT NULL AND "approvedByUserId" IS NULL AND "approvedAt" IS NULL AND "rejectedByUserId" IS NOT NULL AND "rejectedAt" IS NOT NULL AND LENGTH(BTRIM("rejectionReason")) > 0 AND "supersededByUserId" IS NULL AND "supersededAt" IS NULL AND "supersededEffectiveAt" IS NULL)
      OR ("status" = 'SUPERSEDED' AND "proposedByUserId" IS NOT NULL AND "proposedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "approvedByUserId" <> "proposedByUserId" AND "rejectedByUserId" IS NULL AND "rejectedAt" IS NULL AND "supersededByUserId" IS NOT NULL AND "supersededAt" IS NOT NULL AND "supersededEffectiveAt" IS NOT NULL AND "supersededEffectiveAt" > "effectiveFrom")
    )
);

CREATE UNIQUE INDEX "AdvisorInternalCostRate_supersedesRateId_key" ON "AdvisorInternalCostRate"("supersedesRateId");
CREATE UNIQUE INDEX "AdvisorInternalCostRate_organizationId_userId_currency_effe_key" ON "AdvisorInternalCostRate"("organizationId", "userId", "currency", "effectiveFrom");
CREATE INDEX "AdvisorInternalCostRate_organizationId_status_idx" ON "AdvisorInternalCostRate"("organizationId", "status");
CREATE INDEX "AdvisorInternalCostRate_userId_status_effectiveFrom_idx" ON "AdvisorInternalCostRate"("userId", "status", "effectiveFrom");

ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_supersededByUserId_fkey" FOREIGN KEY ("supersededByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdvisorInternalCostRate" ADD CONSTRAINT "AdvisorInternalCostRate_supersedesRateId_fkey" FOREIGN KEY ("supersedesRateId") REFERENCES "AdvisorInternalCostRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectMandate"
  ADD COLUMN "soldAmountDecimal" DECIMAL(20,2),
  ADD COLUMN "soldCurrency" CHAR(3),
  ADD COLUMN "soldAt" DATE,
  ADD COLUMN "soldValidatedByUserId" TEXT,
  ADD COLUMN "soldValidatedAt" TIMESTAMP(3),
  ADD COLUMN "soldValidationReason" TEXT,
  ADD COLUMN "financialLockVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProjectMandate" ADD CONSTRAINT "ProjectMandate_soldValidatedByUserId_fkey" FOREIGN KEY ("soldValidatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMandate" ADD CONSTRAINT "ProjectMandate_financial_terms_check" CHECK ("financialLockVersion" >= 0 AND ("soldAmountDecimal" IS NULL OR "soldAmountDecimal" >= 0));
ALTER TABLE "ProjectMandate" ADD CONSTRAINT "ProjectMandate_financial_governance_check" CHECK (
  ("soldAmountDecimal" IS NULL AND "soldCurrency" IS NULL AND "soldAt" IS NULL AND "soldValidatedByUserId" IS NULL AND "soldValidatedAt" IS NULL AND "soldValidationReason" IS NULL)
  OR ("soldAmountDecimal" IS NOT NULL AND "soldAmountDecimal" >= 0 AND "soldCurrency" ~ '^[A-Z]{3}$' AND "soldAt" IS NOT NULL AND "soldValidatedByUserId" IS NOT NULL AND "soldValidatedAt" IS NOT NULL AND LENGTH(BTRIM("soldValidationReason")) > 0)
);

CREATE OR REPLACE FUNCTION "validate_advisor_internal_cost_rate"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE advisor_org TEXT; actor_org TEXT; overlap_id TEXT; replaced "AdvisorInternalCostRate"%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || NEW."userId" || ':' || NEW."currency", 0));
  SELECT "organizationId" INTO advisor_org FROM "User" WHERE "id" = NEW."userId";
  IF advisor_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'Advisor cost rate tenant mismatch' USING ERRCODE = '23514'; END IF;
  FOR actor_org IN SELECT "organizationId" FROM "User" WHERE "id" IN (NEW."proposedByUserId", NEW."approvedByUserId", NEW."rejectedByUserId", NEW."supersededByUserId") LOOP
    IF actor_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'Advisor cost rate actor tenant mismatch' USING ERRCODE = '23514'; END IF;
  END LOOP;
  IF NEW."status" = 'APPROVED' THEN
    IF NEW."supersedesRateId" IS NOT NULL THEN
      SELECT * INTO replaced FROM "AdvisorInternalCostRate" WHERE "id" = NEW."supersedesRateId" FOR UPDATE;
      IF replaced."id" IS NULL OR replaced."organizationId" <> NEW."organizationId" OR replaced."userId" <> NEW."userId" OR replaced."currency" <> NEW."currency" OR replaced."status" <> 'SUPERSEDED' OR replaced."supersededEffectiveAt" <> NEW."effectiveFrom" THEN RAISE EXCEPTION 'Invalid advisor cost rate supersession' USING ERRCODE = '23514'; END IF;
    END IF;
    SELECT r."id" INTO overlap_id FROM "AdvisorInternalCostRate" r
    WHERE r."id" <> NEW."id" AND r."organizationId" = NEW."organizationId" AND r."userId" = NEW."userId" AND r."currency" = NEW."currency" AND r."status" IN ('APPROVED', 'SUPERSEDED')
      AND daterange(
        r."effectiveFrom",
        LEAST(
          COALESCE(r."effectiveUntil", 'infinity'::date),
          COALESCE(r."supersededEffectiveAt", 'infinity'::date)
        ),
        '[)'
      ) && daterange(NEW."effectiveFrom", COALESCE(NEW."effectiveUntil", 'infinity'::date), '[)') LIMIT 1;
    IF overlap_id IS NOT NULL THEN RAISE EXCEPTION 'Advisor cost rate effective periods overlap' USING ERRCODE = '23P01'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AdvisorInternalCostRate_validate" BEFORE INSERT OR UPDATE ON "AdvisorInternalCostRate" FOR EACH ROW EXECUTE FUNCTION "validate_advisor_internal_cost_rate"();

CREATE OR REPLACE FUNCTION "protect_advisor_internal_cost_rate"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Advisor cost rates cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF OLD."status" IN ('APPROVED', 'SUPERSEDED') THEN
    IF OLD."status" = 'APPROVED' AND NEW."status" = 'SUPERSEDED'
      AND ROW(NEW."organizationId", NEW."userId", NEW."currency", NEW."hourlyCost", NEW."effectiveFrom", NEW."effectiveUntil", NEW."proposedByUserId", NEW."proposedAt", NEW."approvedByUserId", NEW."approvedAt", NEW."supersedesRateId", NEW."createdAt") IS NOT DISTINCT FROM ROW(OLD."organizationId", OLD."userId", OLD."currency", OLD."hourlyCost", OLD."effectiveFrom", OLD."effectiveUntil", OLD."proposedByUserId", OLD."proposedAt", OLD."approvedByUserId", OLD."approvedAt", OLD."supersedesRateId", OLD."createdAt")
      AND NEW."lockVersion" = OLD."lockVersion" + 1 THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Approved advisor cost rate material terms are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AdvisorInternalCostRate_protect" BEFORE UPDATE OR DELETE ON "AdvisorInternalCostRate" FOR EACH ROW EXECUTE FUNCTION "protect_advisor_internal_cost_rate"();

CREATE OR REPLACE FUNCTION "protect_project_mandate_financial_terms"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE validator_org TEXT;
BEGIN
  IF NEW."soldValidatedByUserId" IS NOT NULL THEN
    SELECT "organizationId" INTO validator_org FROM "User" WHERE "id" = NEW."soldValidatedByUserId";
    IF validator_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'Mandate sale validator tenant mismatch' USING ERRCODE = '23514'; END IF;
  END IF;
  IF ROW(NEW."soldAmountDecimal", NEW."soldCurrency", NEW."soldAt") IS DISTINCT FROM ROW(OLD."soldAmountDecimal", OLD."soldCurrency", OLD."soldAt") THEN
    IF NEW."financialLockVersion" <> OLD."financialLockVersion" + 1 OR NEW."soldValidatedAt" IS NULL OR NEW."soldValidatedByUserId" IS NULL OR LENGTH(BTRIM(NEW."soldValidationReason")) = 0 THEN RAISE EXCEPTION 'Governed mandate sale changes require validation and lock increment' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ProjectMandate_financial_terms_protect" BEFORE UPDATE ON "ProjectMandate" FOR EACH ROW EXECUTE FUNCTION "protect_project_mandate_financial_terms"();
