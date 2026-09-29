CREATE TYPE "CommercialRelationship" AS ENUM ('DIRECT', 'PARTNER', 'INTERNAL');
CREATE TYPE "CapabilityCode" AS ENUM ('COMPLIANCE_OPERATIONS', 'PERFORMANCE', 'INCIDENT', 'KNOWLEDGE', 'AI', 'NETWORK', 'SENTINELLE', 'SENTINELLE_POPULATION', 'CAMPUS');
CREATE TYPE "CapabilityLifecycle" AS ENUM ('CURRENT', 'FUTURE', 'RETIRED');
CREATE TYPE "CommercialScope" AS ENUM ('ORGANIZATION', 'CLIENT', 'SITE');
CREATE TYPE "CapabilityScopeStatus" AS ENUM ('ALLOWED', 'NOT_ALLOWED', 'UNDECIDED');
CREATE TYPE "PriceBookAudience" AS ENUM ('DIRECT', 'PARTNER');
CREATE TYPE "PriceBookVersionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ARCHIVED', 'CANCELLED');
CREATE TYPE "PricingModel" AS ENUM ('FLAT', 'PER_SEAT', 'PER_SITE', 'TIERED', 'USAGE', 'COMPLEXITY', 'CUSTOM');
CREATE TYPE "PriceChargeType" AS ENUM ('RECURRING', 'ONE_TIME');
CREATE TYPE "BillingPeriod" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "PriceMetric" AS ENUM ('FIXED', 'SEAT', 'SITE', 'CLIENT', 'USAGE_UNIT', 'COMPLEXITY');
CREATE TYPE "TierCalculationMode" AS ENUM ('VOLUME', 'GRADUATED');

ALTER TABLE "Organization" ADD COLUMN "commercialRelationship" "CommercialRelationship";

CREATE TABLE "CommercialCapability" (
  "id" TEXT NOT NULL,
  "code" "CapabilityCode" NOT NULL,
  "nameFr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionFr" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "lifecycle" "CapabilityLifecycle" NOT NULL,
  "isAvailable" BOOLEAN NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CapabilityScopePolicy" (
  "id" TEXT NOT NULL,
  "capabilityId" TEXT NOT NULL,
  "scope" "CommercialScope" NOT NULL,
  "status" "CapabilityScopeStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CapabilityScopePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceBook" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "audience" "PriceBookAudience" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceBook_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "PriceBookVersion" (
  "id" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "PriceBookVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdByDisplayName" TEXT,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceBookVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceBookVersion_number_check" CHECK ("versionNumber" > 0),
  CONSTRAINT "PriceBookVersion_period_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" > "effectiveFrom")
);

CREATE TABLE "PriceComponent" (
  "id" TEXT NOT NULL,
  "priceBookVersionId" TEXT NOT NULL,
  "capabilityId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameFr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionFr" TEXT,
  "descriptionEn" TEXT,
  "pricingModel" "PricingModel" NOT NULL,
  "chargeType" "PriceChargeType" NOT NULL,
  "billingPeriod" "BillingPeriod",
  "metric" "PriceMetric",
  "tierMode" "TierCalculationMode",
  "amountMinor" BIGINT,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceComponent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceComponent_amount_check" CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0),
  CONSTRAINT "PriceComponent_period_check" CHECK (("chargeType" = 'ONE_TIME' AND "billingPeriod" IS NULL) OR "chargeType" = 'RECURRING')
);

CREATE TABLE "PriceTier" (
  "id" TEXT NOT NULL,
  "priceComponentId" TEXT NOT NULL,
  "minimumQuantity" DECIMAL(20,6) NOT NULL,
  "maximumQuantity" DECIMAL(20,6),
  "amountMinor" BIGINT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceTier_minimum_check" CHECK ("minimumQuantity" >= 0),
  CONSTRAINT "PriceTier_maximum_check" CHECK ("maximumQuantity" IS NULL OR "maximumQuantity" > "minimumQuantity"),
  CONSTRAINT "PriceTier_amount_check" CHECK ("amountMinor" >= 0)
);

CREATE UNIQUE INDEX "CommercialCapability_code_key" ON "CommercialCapability"("code");
CREATE INDEX "CommercialCapability_displayOrder_idx" ON "CommercialCapability"("displayOrder");
CREATE INDEX "CommercialCapability_lifecycle_isAvailable_idx" ON "CommercialCapability"("lifecycle", "isAvailable");
CREATE UNIQUE INDEX "CapabilityScopePolicy_capabilityId_scope_key" ON "CapabilityScopePolicy"("capabilityId", "scope");
CREATE INDEX "CapabilityScopePolicy_scope_status_idx" ON "CapabilityScopePolicy"("scope", "status");
CREATE UNIQUE INDEX "PriceBook_code_key" ON "PriceBook"("code");
CREATE INDEX "PriceBook_audience_currency_idx" ON "PriceBook"("audience", "currency");
CREATE INDEX "PriceBook_archivedAt_idx" ON "PriceBook"("archivedAt");
CREATE UNIQUE INDEX "PriceBookVersion_priceBookId_versionNumber_key" ON "PriceBookVersion"("priceBookId", "versionNumber");
CREATE INDEX "PriceBookVersion_priceBookId_status_idx" ON "PriceBookVersion"("priceBookId", "status");
CREATE INDEX "PriceBookVersion_status_effectiveFrom_effectiveUntil_idx" ON "PriceBookVersion"("status", "effectiveFrom", "effectiveUntil");
CREATE INDEX "PriceBookVersion_createdByUserId_idx" ON "PriceBookVersion"("createdByUserId");
CREATE UNIQUE INDEX "PriceComponent_priceBookVersionId_code_key" ON "PriceComponent"("priceBookVersionId", "code");
CREATE INDEX "PriceComponent_priceBookVersionId_displayOrder_idx" ON "PriceComponent"("priceBookVersionId", "displayOrder");
CREATE INDEX "PriceComponent_capabilityId_idx" ON "PriceComponent"("capabilityId");
CREATE INDEX "PriceComponent_pricingModel_idx" ON "PriceComponent"("pricingModel");
CREATE UNIQUE INDEX "PriceTier_priceComponentId_displayOrder_key" ON "PriceTier"("priceComponentId", "displayOrder");
CREATE INDEX "PriceTier_priceComponentId_minimumQuantity_maximumQuantity_idx" ON "PriceTier"("priceComponentId", "minimumQuantity", "maximumQuantity");

ALTER TABLE "CapabilityScopePolicy" ADD CONSTRAINT "CapabilityScopePolicy_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceBookVersion" ADD CONSTRAINT "PriceBookVersion_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceBookVersion" ADD CONSTRAINT "PriceBookVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceComponent" ADD CONSTRAINT "PriceComponent_priceBookVersionId_fkey" FOREIGN KEY ("priceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceComponent" ADD CONSTRAINT "PriceComponent_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_priceComponentId_fkey" FOREIGN KEY ("priceComponentId") REFERENCES "PriceComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_published_price_children"() RETURNS trigger AS $$
DECLARE parent_status "PriceBookVersionStatus";
BEGIN
  IF TG_TABLE_NAME = 'PriceComponent' THEN
    SELECT "status" INTO parent_status FROM "PriceBookVersion" WHERE "id" = COALESCE(OLD."priceBookVersionId", NEW."priceBookVersionId");
  ELSE
    SELECT v."status" INTO parent_status FROM "PriceBookVersion" v JOIN "PriceComponent" c ON c."priceBookVersionId" = v."id" WHERE c."id" = COALESCE(OLD."priceComponentId", NEW."priceComponentId");
  END IF;
  IF parent_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published price snapshots are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PriceComponent_published_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "PriceComponent" FOR EACH ROW EXECUTE FUNCTION "protect_published_price_children"();
CREATE TRIGGER "PriceTier_published_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "PriceTier" FOR EACH ROW EXECUTE FUNCTION "protect_published_price_children"();

CREATE OR REPLACE FUNCTION "protect_published_price_version"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published price versions cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" <> 'DRAFT' THEN
    IF NOT (
      (OLD."status" = 'SCHEDULED' AND NEW."status" = 'CANCELLED') OR
      (OLD."status" = 'ACTIVE' AND NEW."status" = 'ARCHIVED')
    ) OR (to_jsonb(NEW) - ARRAY['status','cancelledAt','archivedAt','updatedAt']) <> (to_jsonb(OLD) - ARRAY['status','cancelledAt','archivedAt','updatedAt']) THEN
      RAISE EXCEPTION 'Published price versions are immutable';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PriceBookVersion_published_immutable" BEFORE UPDATE OR DELETE ON "PriceBookVersion" FOR EACH ROW EXECUTE FUNCTION "protect_published_price_version"();

INSERT INTO "CommercialCapability" ("id", "code", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "lifecycle", "isAvailable", "displayOrder", "updatedAt") VALUES
(gen_random_uuid()::text, 'COMPLIANCE_OPERATIONS', 'Conformité & Opérations', 'Compliance & Operations', 'Outils de conformité et opérations.', 'Compliance and operations tools.', 'CURRENT', true, 10, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'PERFORMANCE', 'Performance', 'Performance', 'Pilotage de la performance.', 'Performance management.', 'CURRENT', true, 20, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'INCIDENT', 'Incident', 'Incident', 'Gestion opérationnelle des incidents.', 'Operational incident management.', 'CURRENT', true, 30, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'KNOWLEDGE', 'Knowledge', 'Knowledge', 'Gestion des connaissances.', 'Knowledge management.', 'CURRENT', true, 40, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'AI', 'CORO AI', 'CORO AI', 'Fonctions assistées par intelligence artificielle.', 'AI-assisted capabilities.', 'CURRENT', true, 50, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'NETWORK', 'CORO Network', 'CORO Network', 'Réseau CORO futur.', 'Future CORO network.', 'FUTURE', false, 60, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'SENTINELLE', 'Sentinelle', 'Sentinel', 'Opérations de sécurité Sentinelle.', 'Sentinel safety operations.', 'CURRENT', true, 70, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'SENTINELLE_POPULATION', 'Sentinelle Population', 'Population Sentinel', 'Alertes et continuité Population.', 'Population alerting and continuity.', 'CURRENT', true, 80, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'CAMPUS', 'CORO Campus', 'CORO Campus', 'Capability Campus future.', 'Future Campus capability.', 'FUTURE', false, 90, CURRENT_TIMESTAMP);

INSERT INTO "CapabilityScopePolicy" ("id", "capabilityId", "scope", "status", "updatedAt")
SELECT gen_random_uuid()::text, c."id", p.scope::"CommercialScope", p.status::"CapabilityScopeStatus", CURRENT_TIMESTAMP
FROM "CommercialCapability" c
JOIN (VALUES
('COMPLIANCE_OPERATIONS','ORGANIZATION','ALLOWED'),('COMPLIANCE_OPERATIONS','CLIENT','NOT_ALLOWED'),('COMPLIANCE_OPERATIONS','SITE','NOT_ALLOWED'),
('PERFORMANCE','ORGANIZATION','ALLOWED'),('PERFORMANCE','CLIENT','NOT_ALLOWED'),('PERFORMANCE','SITE','NOT_ALLOWED'),
('INCIDENT','ORGANIZATION','ALLOWED'),('INCIDENT','CLIENT','NOT_ALLOWED'),('INCIDENT','SITE','ALLOWED'),
('KNOWLEDGE','ORGANIZATION','ALLOWED'),('KNOWLEDGE','CLIENT','ALLOWED'),('KNOWLEDGE','SITE','NOT_ALLOWED'),
('AI','ORGANIZATION','ALLOWED'),('AI','CLIENT','ALLOWED'),('AI','SITE','NOT_ALLOWED'),
('NETWORK','ORGANIZATION','ALLOWED'),('NETWORK','CLIENT','NOT_ALLOWED'),('NETWORK','SITE','NOT_ALLOWED'),
('SENTINELLE','ORGANIZATION','ALLOWED'),('SENTINELLE','CLIENT','NOT_ALLOWED'),('SENTINELLE','SITE','ALLOWED'),
('SENTINELLE_POPULATION','ORGANIZATION','ALLOWED'),('SENTINELLE_POPULATION','CLIENT','NOT_ALLOWED'),('SENTINELLE_POPULATION','SITE','ALLOWED'),
('CAMPUS','ORGANIZATION','ALLOWED'),('CAMPUS','CLIENT','UNDECIDED'),('CAMPUS','SITE','ALLOWED')
) AS p(code, scope, status) ON c."code"::text = p.code;
