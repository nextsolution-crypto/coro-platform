CREATE TYPE "MeteringSourceQuality" AS ENUM ('CANONICAL', 'DERIVED');

CREATE TABLE "MeteringResult" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clientId" TEXT, "buildingId" TEXT,
  "capabilityCode" "CapabilityCode" NOT NULL, "scope" "CommercialScope" NOT NULL,
  "metricCode" VARCHAR(100) NOT NULL, "metricVersion" VARCHAR(50) NOT NULL, "policyVersion" VARCHAR(50) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL, "periodEnd" TIMESTAMP(3) NOT NULL, "timezone" VARCHAR(100) NOT NULL,
  "quantity" DECIMAL(30,6) NOT NULL, "unit" VARCHAR(50) NOT NULL,
  "sourceQuality" "MeteringSourceQuality" NOT NULL, "sourceCount" BIGINT,
  "sourceFingerprint" CHAR(64) NOT NULL, "sourceSummary" JSONB,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "calculationKey" CHAR(64) NOT NULL,
  "supersedesResultId" TEXT, "correctionReason" VARCHAR(1000),
  "createdByUserId" TEXT, "createdByDisplayName" VARCHAR(255), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeteringResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MeteringResult_scope_target_check" CHECK (
    ("scope" = 'ORGANIZATION' AND "clientId" IS NULL AND "buildingId" IS NULL) OR
    ("scope" = 'CLIENT' AND "clientId" IS NOT NULL AND "buildingId" IS NULL) OR
    ("scope" = 'SITE' AND "clientId" IS NOT NULL AND "buildingId" IS NOT NULL)),
  CONSTRAINT "MeteringResult_period_check" CHECK ("periodEnd" > "periodStart"),
  CONSTRAINT "MeteringResult_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "MeteringResult_source_count_check" CHECK ("sourceCount" IS NULL OR "sourceCount" >= 0),
  CONSTRAINT "MeteringResult_correction_shape_check" CHECK (
    ("supersedesResultId" IS NULL AND "correctionReason" IS NULL) OR
    ("supersedesResultId" IS NOT NULL AND "correctionReason" IS NOT NULL AND btrim("correctionReason") <> '')),
  CONSTRAINT "MeteringResult_source_fingerprint_check" CHECK ("sourceFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "MeteringResult_calculation_key_check" CHECK ("calculationKey" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "MeteringResult_metric_code_check" CHECK (btrim("metricCode") <> ''),
  CONSTRAINT "MeteringResult_metric_version_check" CHECK (btrim("metricVersion") <> ''),
  CONSTRAINT "MeteringResult_policy_version_check" CHECK (btrim("policyVersion") <> ''),
  CONSTRAINT "MeteringResult_timezone_check" CHECK (btrim("timezone") <> ''),
  CONSTRAINT "MeteringResult_unit_check" CHECK (btrim("unit") <> ''),
  CONSTRAINT "MeteringResult_source_summary_check" CHECK ("sourceSummary" IS NULL OR
    (jsonb_typeof("sourceSummary") = 'object' AND octet_length("sourceSummary"::text) <= 8192))
);

CREATE UNIQUE INDEX "MeteringResult_calculationKey_key" ON "MeteringResult"("calculationKey");
CREATE UNIQUE INDEX "MeteringResult_supersedesResultId_key" ON "MeteringResult"("supersedesResultId");
CREATE INDEX "MeteringResult_organizationId_capabilityCode_metricCode_per_idx" ON "MeteringResult"("organizationId", "capabilityCode", "metricCode", "periodStart", "periodEnd");
CREATE INDEX "MeteringResult_organizationId_scope_periodStart_periodEnd_idx" ON "MeteringResult"("organizationId", "scope", "periodStart", "periodEnd");
CREATE INDEX "MeteringResult_clientId_capabilityCode_metricCode_periodSta_idx" ON "MeteringResult"("clientId", "capabilityCode", "metricCode", "periodStart");
CREATE INDEX "MeteringResult_buildingId_capabilityCode_metricCode_periodS_idx" ON "MeteringResult"("buildingId", "capabilityCode", "metricCode", "periodStart");
CREATE INDEX "MeteringResult_organizationId_calculatedAt_idx" ON "MeteringResult"("organizationId", "calculatedAt");

ALTER TABLE "MeteringResult" ADD CONSTRAINT "MeteringResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "MeteringResult" ADD CONSTRAINT "MeteringResult_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "Client"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "MeteringResult" ADD CONSTRAINT "MeteringResult_buildingId_clientId_organizationId_fkey" FOREIGN KEY ("buildingId", "clientId", "organizationId") REFERENCES "Building"("id", "clientId", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "MeteringResult" ADD CONSTRAINT "MeteringResult_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "MeteringResult" ADD CONSTRAINT "MeteringResult_supersedesResultId_fkey" FOREIGN KEY ("supersedesResultId") REFERENCES "MeteringResult"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "reject_metering_result_mutation"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'MeteringResult is append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MeteringResult_reject_update" BEFORE UPDATE ON "MeteringResult"
FOR EACH ROW EXECUTE FUNCTION "reject_metering_result_mutation"();
CREATE TRIGGER "MeteringResult_reject_delete" BEFORE DELETE ON "MeteringResult"
FOR EACH ROW EXECUTE FUNCTION "reject_metering_result_mutation"();

CREATE FUNCTION "validate_metering_result_supersession"() RETURNS trigger AS $$
DECLARE parent "MeteringResult"%ROWTYPE;
BEGIN
  IF NEW."supersedesResultId" IS NULL THEN RETURN NEW; END IF;
  IF NEW."supersedesResultId" = NEW."id" THEN RAISE EXCEPTION 'MeteringResult cannot supersede itself'; END IF;
  SELECT * INTO parent FROM "MeteringResult" WHERE "id" = NEW."supersedesResultId" FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Superseded MeteringResult does not exist'; END IF;
  IF parent."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR parent."scope" IS DISTINCT FROM NEW."scope" OR parent."clientId" IS DISTINCT FROM NEW."clientId"
    OR parent."buildingId" IS DISTINCT FROM NEW."buildingId" OR parent."capabilityCode" IS DISTINCT FROM NEW."capabilityCode"
    OR parent."metricCode" IS DISTINCT FROM NEW."metricCode" OR parent."metricVersion" IS DISTINCT FROM NEW."metricVersion"
    OR parent."policyVersion" IS DISTINCT FROM NEW."policyVersion" OR parent."periodStart" IS DISTINCT FROM NEW."periodStart"
    OR parent."periodEnd" IS DISTINCT FROM NEW."periodEnd" OR parent."timezone" IS DISTINCT FROM NEW."timezone"
    OR parent."unit" IS DISTINCT FROM NEW."unit" THEN
    RAISE EXCEPTION 'MeteringResult supersession must remain in the same series';
  END IF;
  IF parent."sourceFingerprint" = NEW."sourceFingerprint" THEN
    RAISE EXCEPTION 'MeteringResult correction requires changed source facts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MeteringResult_validate_supersession" BEFORE INSERT ON "MeteringResult"
FOR EACH ROW EXECUTE FUNCTION "validate_metering_result_supersession"();
