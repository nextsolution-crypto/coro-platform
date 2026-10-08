CREATE TYPE "CommercialClauseCategory" AS ENUM ('OFFER_VALIDITY','CURRENCY_AND_TAXES','PAYMENT_TERMS','INVOICING','SAAS_SUBSCRIPTION','RENEWAL','TERMINATION','SUSPENSION','SUPPORT_AND_MAINTENANCE','SERVICE_AVAILABILITY','IMPLEMENTATION','PROFESSIONAL_SERVICES','SCOPE_CHANGE','CUSTOMER_OBLIGATIONS','DELAYS','ADDITIONAL_FEES','PENALTIES','CONFIDENTIALITY','DATA_PROTECTION','DATA_RETENTION_AND_RETURN','INTELLECTUAL_PROPERTY','LIABILITY','FORCE_MAJEURE','GOVERNING_LAW','ACCEPTANCE');
CREATE TYPE "CommercialClauseVersionStatus" AS ENUM ('DRAFT','IN_REVIEW','APPROVED','ARCHIVED');
CREATE TYPE "CommercialClauseApplicabilityScope" AS ENUM ('UNSPECIFIED','ALL_OFFERS','CORO_PROFESSIONAL','SENTINELLE_POPULATION_STANDALONE','PROFESSIONAL_SERVICES','COMBINED_OFFER');

CREATE TABLE "CommercialClause" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(120) NOT NULL,
  "category" "CommercialClauseCategory" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialClause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialClauseVersion" (
  "id" TEXT NOT NULL,
  "commercialClauseId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "CommercialClauseVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "titleFR" TEXT NOT NULL,
  "titleEN" TEXT NOT NULL,
  "textFR" TEXT NOT NULL,
  "textEN" TEXT NOT NULL,
  "businessOwner" TEXT,
  "legalOwner" TEXT,
  "isRequired" BOOLEAN,
  "effectiveAt" TIMESTAMP(3),
  "provenance" VARCHAR(200) NOT NULL,
  "parameterSchema" JSONB NOT NULL,
  "contentHash" CHAR(64) NOT NULL,
  "lifecycleReason" TEXT,
  "businessReviewReason" TEXT,
  "legalReviewReason" TEXT,
  "legalReviewEvidence" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "businessReviewedByUserId" TEXT,
  "legalReviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "archivedByUserId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "businessReviewedAt" TIMESTAMP(3),
  "legalReviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialClauseVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialClauseApplicability" (
  "commercialClauseVersionId" TEXT NOT NULL,
  "scope" "CommercialClauseApplicabilityScope" NOT NULL,
  CONSTRAINT "CommercialClauseApplicability_pkey" PRIMARY KEY ("commercialClauseVersionId","scope")
);

CREATE UNIQUE INDEX "CommercialClause_code_key" ON "CommercialClause"("code");
CREATE INDEX "CommercialClause_category_isActive_idx" ON "CommercialClause"("category","isActive");
CREATE UNIQUE INDEX "CommercialClauseVersion_commercialClauseId_versionNumber_key" ON "CommercialClauseVersion"("commercialClauseId","versionNumber");
CREATE INDEX "CommercialClauseVersion_commercialClauseId_status_idx" ON "CommercialClauseVersion"("commercialClauseId","status");
CREATE UNIQUE INDEX "CommercialClauseVersion_one_open_key" ON "CommercialClauseVersion"("commercialClauseId") WHERE "status" IN ('DRAFT','IN_REVIEW');
CREATE INDEX "CommercialClauseApplicability_scope_idx" ON "CommercialClauseApplicability"("scope");

ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_commercialClauseId_fkey" FOREIGN KEY ("commercialClauseId") REFERENCES "CommercialClause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_businessReviewedByUserId_fkey" FOREIGN KEY ("businessReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_legalReviewedByUserId_fkey" FOREIGN KEY ("legalReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialClauseApplicability" ADD CONSTRAINT "CommercialClauseApplicability_commercialClauseVersionId_fkey" FOREIGN KEY ("commercialClauseVersionId") REFERENCES "CommercialClauseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_values_check" CHECK ("versionNumber">0 AND "lockVersion">=0 AND LENGTH(BTRIM("titleFR"))>0 AND LENGTH(BTRIM("titleEN"))>0 AND LENGTH(BTRIM("textFR"))>0 AND LENGTH(BTRIM("textEN"))>0 AND LENGTH(BTRIM("provenance"))>0 AND jsonb_typeof("parameterSchema")='array');
ALTER TABLE "CommercialClauseVersion" ADD CONSTRAINT "CommercialClauseVersion_lifecycle_check" CHECK (
  ("status"='DRAFT' AND "submittedAt" IS NULL AND "approvedAt" IS NULL AND "archivedAt" IS NULL)
  OR ("status"='IN_REVIEW' AND "submittedAt" IS NOT NULL AND "businessReviewedAt" IS NOT NULL AND "businessReviewedByUserId" IS NOT NULL AND "approvedAt" IS NULL AND "archivedAt" IS NULL)
  OR ("status"='APPROVED' AND "submittedAt" IS NOT NULL AND "businessReviewedAt" IS NOT NULL AND "businessReviewedByUserId" IS NOT NULL AND "legalReviewedAt" IS NOT NULL AND "legalReviewedByUserId" IS NOT NULL AND LENGTH(BTRIM("legalReviewEvidence"))>0 AND "approvedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "archivedAt" IS NULL)
  OR ("status"='ARCHIVED' AND "approvedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL AND "archivedAt" IS NOT NULL AND "archivedByUserId" IS NOT NULL)
);

CREATE FUNCTION protect_commercial_clause_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Commercial clause versions are retained'; END IF;
  IF OLD."status" IN ('APPROVED','ARCHIVED') THEN
    IF OLD."status"='APPROVED' AND NEW."status"='ARCHIVED'
      AND ROW(NEW."commercialClauseId",NEW."versionNumber",NEW."titleFR",NEW."titleEN",NEW."textFR",NEW."textEN",NEW."businessOwner",NEW."legalOwner",NEW."isRequired",NEW."effectiveAt",NEW."provenance",NEW."parameterSchema",NEW."contentHash",NEW."businessReviewReason",NEW."legalReviewReason",NEW."createdByUserId",NEW."businessReviewedByUserId",NEW."businessReviewedAt",NEW."legalReviewedByUserId",NEW."legalReviewedAt",NEW."legalReviewEvidence",NEW."approvedByUserId",NEW."approvedAt",NEW."createdAt")
      IS NOT DISTINCT FROM
      ROW(OLD."commercialClauseId",OLD."versionNumber",OLD."titleFR",OLD."titleEN",OLD."textFR",OLD."textEN",OLD."businessOwner",OLD."legalOwner",OLD."isRequired",OLD."effectiveAt",OLD."provenance",OLD."parameterSchema",OLD."contentHash",OLD."businessReviewReason",OLD."legalReviewReason",OLD."createdByUserId",OLD."businessReviewedByUserId",OLD."businessReviewedAt",OLD."legalReviewedByUserId",OLD."legalReviewedAt",OLD."legalReviewEvidence",OLD."approvedByUserId",OLD."approvedAt",OLD."createdAt")
    THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Approved commercial clause version is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_clause_version_protect BEFORE UPDATE OR DELETE ON "CommercialClauseVersion" FOR EACH ROW EXECUTE FUNCTION protect_commercial_clause_version();

CREATE FUNCTION protect_commercial_clause_applicability() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id TEXT; version_status "CommercialClauseVersionStatus";
BEGIN
  version_id := CASE WHEN TG_OP='DELETE' THEN OLD."commercialClauseVersionId" ELSE NEW."commercialClauseVersionId" END;
  SELECT "status" INTO version_status FROM "CommercialClauseVersion" WHERE "id"=version_id;
  IF version_status <> 'DRAFT' THEN RAISE EXCEPTION 'Commercial clause applicability is immutable outside DRAFT'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER commercial_clause_applicability_protect BEFORE INSERT OR UPDATE OR DELETE ON "CommercialClauseApplicability" FOR EACH ROW EXECUTE FUNCTION protect_commercial_clause_applicability();
