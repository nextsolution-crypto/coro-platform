-- Additive first-wave pricing semantics. No commercial data is created.
ALTER TYPE "PricingModel" ADD VALUE 'PER_UNIT';
ALTER TYPE "PriceMetric" ADD VALUE 'HOUR';

CREATE TABLE "CommercialSimulationScenarioLineCostEffort" (
    "id" TEXT NOT NULL,
    "scenarioLineId" TEXT NOT NULL,
    "roleCode" VARCHAR(50) NOT NULL,
    "hours" DECIMAL(20,6) NOT NULL,
    "source" "CommercialSimulationValueSource" NOT NULL,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSimulationScenarioLineCostEffort_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommercialSimulationScenarioLineCostEffort_role_check"
      CHECK ("roleCode" IN ('DELIVERY_PROFESSIONAL', 'SENIOR_REVIEWER')),
    CONSTRAINT "CommercialSimulationScenarioLineCostEffort_hours_check"
      CHECK ("hours" > 0),
    CONSTRAINT "CommercialSimulationScenarioLineCostEffort_source_check"
      CHECK ("source" IN ('USER_INPUT', 'INTERNAL_ASSUMPTION'))
);

CREATE TABLE "CommercialSimulationRunLineCostEffort" (
    "id" TEXT NOT NULL,
    "runLineId" TEXT NOT NULL,
    "roleCode" VARCHAR(50) NOT NULL,
    "hours" DECIMAL(20,6) NOT NULL,
    "roleCostMinor" BIGINT NOT NULL,
    "calculatedCostMinor" BIGINT NOT NULL,
    "assumptionCode" VARCHAR(100) NOT NULL,
    "assumptionVersion" VARCHAR(50) NOT NULL,
    "scopeKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationRunLineCostEffort_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommercialSimulationRunLineCostEffort_role_check"
      CHECK ("roleCode" IN ('DELIVERY_PROFESSIONAL', 'SENIOR_REVIEWER')),
    CONSTRAINT "CommercialSimulationRunLineCostEffort_hours_check"
      CHECK ("hours" > 0),
    CONSTRAINT "CommercialSimulationRunLineCostEffort_money_check"
      CHECK ("roleCostMinor" >= 0 AND "calculatedCostMinor" >= 0)
);

CREATE UNIQUE INDEX "CommercialSimulationScenarioLineCostEffort_scenarioLineId_r_key"
  ON "CommercialSimulationScenarioLineCostEffort"("scenarioLineId", "roleCode");
CREATE INDEX "CommercialSimulationScenarioLineCostEffort_scenarioLineId_idx"
  ON "CommercialSimulationScenarioLineCostEffort"("scenarioLineId");
CREATE UNIQUE INDEX "CommercialSimulationRunLineCostEffort_runLineId_roleCode_key"
  ON "CommercialSimulationRunLineCostEffort"("runLineId", "roleCode");
CREATE INDEX "CommercialSimulationRunLineCostEffort_runLineId_idx"
  ON "CommercialSimulationRunLineCostEffort"("runLineId");

ALTER TABLE "CommercialSimulationScenarioLineCostEffort"
  ADD CONSTRAINT "CommercialSimulationScenarioLineCostEffort_scenarioLineId_fkey"
  FOREIGN KEY ("scenarioLineId") REFERENCES "CommercialSimulationScenarioLine"("id")
  ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "CommercialSimulationRunLineCostEffort"
  ADD CONSTRAINT "CommercialSimulationRunLineCostEffort_runLineId_fkey"
  FOREIGN KEY ("runLineId") REFERENCES "CommercialSimulationRunLine"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TRIGGER "CommercialSimulationRunLineCostEffort_immutable"
  BEFORE UPDATE OR DELETE ON "CommercialSimulationRunLineCostEffort"
  FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
