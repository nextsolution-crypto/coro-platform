-- CreateEnum
CREATE TYPE "CommercialSimulationWorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommercialSimulationScenarioStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommercialSimulationLineSource" AS ENUM ('CATALOG_COMPONENT', 'CUSTOM_COMPONENT', 'PROFESSIONAL_SERVICE');

-- CreateEnum
CREATE TYPE "CommercialSimulationValueType" AS ENUM ('DECIMAL', 'INTEGER', 'MONEY', 'BOOLEAN', 'TEXT');

-- CreateEnum
CREATE TYPE "CommercialSimulationValueSource" AS ENUM ('USER_INPUT', 'CUSTOMER_INPUT', 'SYSTEM_CONFIGURATION', 'CONTRACT', 'METERING', 'EXTERNAL_PROVIDER', 'CALCULATED', 'INTERNAL_ASSUMPTION');

-- CreateEnum
CREATE TYPE "CommercialAssumptionVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommercialSimulationResultStatus" AS ENUM ('COMPLETE', 'UNAVAILABLE', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "CommercialSimulationWorkspace" (
    "id" TEXT NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "prospectId" TEXT,
    "priceBookVersionId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "CommercialSimulationWorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "selectedScenarioId" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdByDisplayName" VARCHAR(255),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSimulationWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationScenario" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "CommercialSimulationScenarioStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationScenarioCapability" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationScenarioCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationScenarioLine" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "capabilityId" TEXT,
    "priceComponentId" TEXT,
    "source" "CommercialSimulationLineSource" NOT NULL,
    "componentCode" VARCHAR(100) NOT NULL,
    "componentNameFr" VARCHAR(255) NOT NULL,
    "componentNameEn" VARCHAR(255),
    "pricingModel" "PricingModel" NOT NULL,
    "chargeType" "PriceChargeType" NOT NULL,
    "billingPeriod" "BillingPeriod",
    "metric" "PriceMetric",
    "tierMode" "TierCalculationMode",
    "quantity" DECIMAL(20,6),
    "quantityUnit" VARCHAR(50),
    "proposedUnitAmountMinor" BIGINT,
    "internalUse" BOOLEAN NOT NULL DEFAULT false,
    "distributable" BOOLEAN NOT NULL DEFAULT false,
    "distributionLimit" DECIMAL(20,6),
    "distributionMetric" "PriceMetric",
    "commercialQuantityBasis" "CommercialQuantityBasis",
    "commercialRuleCode" VARCHAR(100),
    "commercialRuleVersion" VARCHAR(50),
    "justification" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSimulationScenarioLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationDriverValue" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "driverCode" VARCHAR(100) NOT NULL,
    "driverVersion" VARCHAR(50) NOT NULL,
    "scopeKey" VARCHAR(255) NOT NULL DEFAULT 'GLOBAL',
    "valueType" "CommercialSimulationValueType" NOT NULL,
    "source" "CommercialSimulationValueSource" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinorValue" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" VARCHAR(50),
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSimulationDriverValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialCostAssumptionSet" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialCostAssumptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialCostAssumptionVersion" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "CommercialAssumptionVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL,
    "methodologyCode" VARCHAR(100) NOT NULL,
    "methodologyVersion" VARCHAR(50) NOT NULL,
    "contentHash" CHAR(64),
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialCostAssumptionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialCostAssumptionValue" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "assumptionCode" VARCHAR(100) NOT NULL,
    "assumptionVersion" VARCHAR(50) NOT NULL,
    "scopeKey" VARCHAR(255) NOT NULL DEFAULT 'GLOBAL',
    "valueType" "CommercialSimulationValueType" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinorValue" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialCostAssumptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialValuationAssumptionSet" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "capabilityCode" "CapabilityCode",
    "methodologyCode" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialValuationAssumptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialValuationAssumptionVersion" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "CommercialAssumptionVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "methodologyVersion" VARCHAR(50) NOT NULL,
    "contentHash" CHAR(64),
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialValuationAssumptionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialValuationAssumptionValue" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "assumptionCode" VARCHAR(100) NOT NULL,
    "assumptionVersion" VARCHAR(50) NOT NULL,
    "scopeKey" VARCHAR(255) NOT NULL DEFAULT 'GLOBAL',
    "valueType" "CommercialSimulationValueType" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinorValue" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialValuationAssumptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationCalculationRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "priceBookVersionId" TEXT NOT NULL,
    "costAssumptionVersionId" TEXT,
    "sequence" INTEGER NOT NULL,
    "calculationKey" CHAR(64) NOT NULL,
    "fingerprintVersion" VARCHAR(50) NOT NULL,
    "inputFingerprint" CHAR(64) NOT NULL,
    "workspaceLockVersion" INTEGER NOT NULL,
    "scenarioLockVersion" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "pricingMethodologyCode" VARCHAR(100) NOT NULL,
    "pricingMethodologyVersion" VARCHAR(50) NOT NULL,
    "costMethodologyCode" VARCHAR(100),
    "costMethodologyVersion" VARCHAR(50),
    "priceStatus" "CommercialSimulationResultStatus" NOT NULL,
    "costStatus" "CommercialSimulationResultStatus" NOT NULL,
    "valueStatus" "CommercialSimulationResultStatus" NOT NULL,
    "warningCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationCalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationRunValuationVersion" (
    "runId" TEXT NOT NULL,
    "valuationAssumptionVersionId" TEXT NOT NULL,

    CONSTRAINT "CommercialSimulationRunValuationVersion_pkey" PRIMARY KEY ("runId","valuationAssumptionVersionId")
);

-- CreateTable
CREATE TABLE "CommercialSimulationRunInput" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "driverCode" VARCHAR(100) NOT NULL,
    "driverVersion" VARCHAR(50) NOT NULL,
    "scopeKey" VARCHAR(255) NOT NULL,
    "valueType" "CommercialSimulationValueType" NOT NULL,
    "source" "CommercialSimulationValueSource" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinorValue" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" VARCHAR(50),
    "labelFr" VARCHAR(255) NOT NULL,
    "labelEn" VARCHAR(255),
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationRunInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationRunLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "componentCode" VARCHAR(100) NOT NULL,
    "capabilityCode" "CapabilityCode",
    "priceComponentId" TEXT,
    "componentNameFr" VARCHAR(255) NOT NULL,
    "pricingModel" "PricingModel" NOT NULL,
    "chargeType" "PriceChargeType" NOT NULL,
    "billingPeriod" "BillingPeriod",
    "metric" "PriceMetric",
    "quantity" DECIMAL(20,6),
    "quantityUnit" VARCHAR(50),
    "catalogUnitAmountMinor" BIGINT,
    "proposedUnitAmountMinor" BIGINT,
    "catalogExtendedAmountMinor" BIGINT,
    "proposedExtendedAmountMinor" BIGINT,
    "estimatedCostMinor" BIGINT,
    "calculationStatus" "ProposalCalculationStatus" NOT NULL,
    "calculationExplanationFr" TEXT NOT NULL,
    "internalUse" BOOLEAN NOT NULL,
    "distributable" BOOLEAN NOT NULL,
    "distributionLimit" DECIMAL(20,6),
    "distributionMetric" "PriceMetric",
    "commercialQuantityBasis" "CommercialQuantityBasis",
    "commercialRuleCode" VARCHAR(100),
    "commercialRuleVersion" VARCHAR(50),
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationRunLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationPriceResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "oneTimeTotalMinor" BIGINT NOT NULL,
    "recurringMonthlyCadenceMinor" BIGINT NOT NULL,
    "recurringAnnualCadenceMinor" BIGINT NOT NULL,
    "monthlyRecurringEquivalentMinor" BIGINT NOT NULL,
    "annualRecurringEquivalentMinor" BIGINT NOT NULL,
    "estimatedUsageTotalMinor" BIGINT NOT NULL,
    "firstYearCommitmentMinor" BIGINT NOT NULL,
    "firstYearIncludesEstimate" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationPriceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationCostResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "oneTimeDirectCostMinor" BIGINT NOT NULL,
    "recurringMonthlyCostMinor" BIGINT NOT NULL,
    "recurringAnnualCostMinor" BIGINT NOT NULL,
    "variableEstimatedCostMinor" BIGINT NOT NULL,
    "firstYearCostMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationCostResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationValueResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "capabilityCode" "CapabilityCode",
    "methodologyCode" VARCHAR(100) NOT NULL,
    "methodologyVersion" VARCHAR(50) NOT NULL,
    "status" "CommercialSimulationResultStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationValueResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationValueMetric" (
    "id" TEXT NOT NULL,
    "valueResultId" TEXT NOT NULL,
    "metricCode" VARCHAR(100) NOT NULL,
    "metricVersion" VARCHAR(50) NOT NULL,
    "valueType" "CommercialSimulationValueType" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinorValue" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" VARCHAR(50),
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationValueMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSimulationProposalConversion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "calculationRunId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "convertedByUserId" TEXT,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationProposalConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationWorkspace_reference_key" ON "CommercialSimulationWorkspace"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationWorkspace_selectedScenarioId_key" ON "CommercialSimulationWorkspace"("selectedScenarioId");

-- CreateIndex
CREATE INDEX "CommercialSimulationWorkspace_organizationId_status_updated_idx" ON "CommercialSimulationWorkspace"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CommercialSimulationWorkspace_prospectId_status_updatedAt_idx" ON "CommercialSimulationWorkspace"("prospectId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CommercialSimulationWorkspace_priceBookVersionId_idx" ON "CommercialSimulationWorkspace"("priceBookVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationWorkspace_id_organizationId_key" ON "CommercialSimulationWorkspace"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationWorkspace_id_prospectId_key" ON "CommercialSimulationWorkspace"("id", "prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationWorkspace_selectedScenarioId_id_key" ON "CommercialSimulationWorkspace"("selectedScenarioId", "id");

-- CreateIndex
CREATE INDEX "CommercialSimulationScenario_workspaceId_status_displayOrde_idx" ON "CommercialSimulationScenario"("workspaceId", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationScenario_id_workspaceId_key" ON "CommercialSimulationScenario"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationScenario_workspaceId_name_key" ON "CommercialSimulationScenario"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "CommercialSimulationScenarioCapability_scenarioId_displayOr_idx" ON "CommercialSimulationScenarioCapability"("scenarioId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationScenarioCapability_scenarioId_capabilit_key" ON "CommercialSimulationScenarioCapability"("scenarioId", "capabilityId");

-- CreateIndex
CREATE INDEX "CommercialSimulationScenarioLine_scenarioId_displayOrder_idx" ON "CommercialSimulationScenarioLine"("scenarioId", "displayOrder");

-- CreateIndex
CREATE INDEX "CommercialSimulationScenarioLine_priceComponentId_idx" ON "CommercialSimulationScenarioLine"("priceComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationScenarioLine_scenarioId_componentCode_key" ON "CommercialSimulationScenarioLine"("scenarioId", "componentCode");

-- CreateIndex
CREATE INDEX "CommercialSimulationDriverValue_scenarioId_driverCode_idx" ON "CommercialSimulationDriverValue"("scenarioId", "driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationDriverValue_scenarioId_driverCode_scope_key" ON "CommercialSimulationDriverValue"("scenarioId", "driverCode", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialCostAssumptionSet_code_key" ON "CommercialCostAssumptionSet"("code");

-- CreateIndex
CREATE INDEX "CommercialCostAssumptionVersion_setId_status_idx" ON "CommercialCostAssumptionVersion"("setId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialCostAssumptionVersion_setId_versionNumber_key" ON "CommercialCostAssumptionVersion"("setId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialCostAssumptionValue_versionId_assumptionCode_scop_key" ON "CommercialCostAssumptionValue"("versionId", "assumptionCode", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialValuationAssumptionSet_code_key" ON "CommercialValuationAssumptionSet"("code");

-- CreateIndex
CREATE INDEX "CommercialValuationAssumptionVersion_setId_status_idx" ON "CommercialValuationAssumptionVersion"("setId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialValuationAssumptionVersion_setId_versionNumber_key" ON "CommercialValuationAssumptionVersion"("setId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialValuationAssumptionValue_versionId_assumptionCode_key" ON "CommercialValuationAssumptionValue"("versionId", "assumptionCode", "scopeKey");

-- CreateIndex
CREATE INDEX "CommercialSimulationCalculationRun_workspaceId_calculatedAt_idx" ON "CommercialSimulationCalculationRun"("workspaceId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationCalculationRun_scenarioId_calculationKe_key" ON "CommercialSimulationCalculationRun"("scenarioId", "calculationKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationCalculationRun_scenarioId_sequence_key" ON "CommercialSimulationCalculationRun"("scenarioId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationCalculationRun_id_scenarioId_key" ON "CommercialSimulationCalculationRun"("id", "scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationRunInput_runId_driverCode_scopeKey_key" ON "CommercialSimulationRunInput"("runId", "driverCode", "scopeKey");

-- CreateIndex
CREATE INDEX "CommercialSimulationRunLine_runId_displayOrder_idx" ON "CommercialSimulationRunLine"("runId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationRunLine_runId_componentCode_key" ON "CommercialSimulationRunLine"("runId", "componentCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationPriceResult_runId_key" ON "CommercialSimulationPriceResult"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationCostResult_runId_key" ON "CommercialSimulationCostResult"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationValueResult_runId_methodologyCode_capab_key" ON "CommercialSimulationValueResult"("runId", "methodologyCode", "capabilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationValueMetric_valueResultId_metricCode_key" ON "CommercialSimulationValueMetric"("valueResultId", "metricCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationProposalConversion_calculationRunId_key" ON "CommercialSimulationProposalConversion"("calculationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationProposalConversion_proposalId_key" ON "CommercialSimulationProposalConversion"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationProposalConversion_proposalRevisionId_key" ON "CommercialSimulationProposalConversion"("proposalRevisionId");

-- CreateIndex
CREATE INDEX "CommercialSimulationProposalConversion_workspaceId_converte_idx" ON "CommercialSimulationProposalConversion"("workspaceId", "convertedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationProposalConversion_calculationRunId_sce_key" ON "CommercialSimulationProposalConversion"("calculationRunId", "scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialSimulationProposalConversion_proposalRevisionId_p_key" ON "CommercialSimulationProposalConversion"("proposalRevisionId", "proposalId");

-- AddForeignKey
ALTER TABLE "CommercialSimulationWorkspace" ADD CONSTRAINT "CommercialSimulationWorkspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationWorkspace" ADD CONSTRAINT "CommercialSimulationWorkspace_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationWorkspace" ADD CONSTRAINT "CommercialSimulationWorkspace_priceBookVersionId_fkey" FOREIGN KEY ("priceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationWorkspace" ADD CONSTRAINT "CommercialSimulationWorkspace_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationWorkspace" ADD CONSTRAINT "CommercialSimulationWorkspace_selectedScenarioId_id_fkey" FOREIGN KEY ("selectedScenarioId", "id") REFERENCES "CommercialSimulationScenario"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenario" ADD CONSTRAINT "CommercialSimulationScenario_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "CommercialSimulationWorkspace"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenarioCapability" ADD CONSTRAINT "CommercialSimulationScenarioCapability_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "CommercialSimulationScenario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenarioCapability" ADD CONSTRAINT "CommercialSimulationScenarioCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenarioLine" ADD CONSTRAINT "CommercialSimulationScenarioLine_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "CommercialSimulationScenario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenarioLine" ADD CONSTRAINT "CommercialSimulationScenarioLine_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationScenarioLine" ADD CONSTRAINT "CommercialSimulationScenarioLine_priceComponentId_fkey" FOREIGN KEY ("priceComponentId") REFERENCES "PriceComponent"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationDriverValue" ADD CONSTRAINT "CommercialSimulationDriverValue_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "CommercialSimulationScenario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialCostAssumptionVersion" ADD CONSTRAINT "CommercialCostAssumptionVersion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CommercialCostAssumptionSet"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialCostAssumptionVersion" ADD CONSTRAINT "CommercialCostAssumptionVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialCostAssumptionValue" ADD CONSTRAINT "CommercialCostAssumptionValue_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CommercialCostAssumptionVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialValuationAssumptionVersion" ADD CONSTRAINT "CommercialValuationAssumptionVersion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CommercialValuationAssumptionSet"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialValuationAssumptionVersion" ADD CONSTRAINT "CommercialValuationAssumptionVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialValuationAssumptionValue" ADD CONSTRAINT "CommercialValuationAssumptionValue_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CommercialValuationAssumptionVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationCalculationRun" ADD CONSTRAINT "CommercialSimulationCalculationRun_scenarioId_workspaceId_fkey" FOREIGN KEY ("scenarioId", "workspaceId") REFERENCES "CommercialSimulationScenario"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationCalculationRun" ADD CONSTRAINT "CommercialSimulationCalculationRun_priceBookVersionId_fkey" FOREIGN KEY ("priceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationCalculationRun" ADD CONSTRAINT "CommercialSimulationCalculationRun_costAssumptionVersionId_fkey" FOREIGN KEY ("costAssumptionVersionId") REFERENCES "CommercialCostAssumptionVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationCalculationRun" ADD CONSTRAINT "CommercialSimulationCalculationRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationRunValuationVersion" ADD CONSTRAINT "CommercialSimulationRunValuationVersion_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationRunValuationVersion" ADD CONSTRAINT "CommercialSimulationRunValuationVersion_valuationAssumptio_fkey" FOREIGN KEY ("valuationAssumptionVersionId") REFERENCES "CommercialValuationAssumptionVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationRunInput" ADD CONSTRAINT "CommercialSimulationRunInput_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationRunLine" ADD CONSTRAINT "CommercialSimulationRunLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationPriceResult" ADD CONSTRAINT "CommercialSimulationPriceResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationCostResult" ADD CONSTRAINT "CommercialSimulationCostResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationValueResult" ADD CONSTRAINT "CommercialSimulationValueResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommercialSimulationCalculationRun"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationValueMetric" ADD CONSTRAINT "CommercialSimulationValueMetric_valueResultId_fkey" FOREIGN KEY ("valueResultId") REFERENCES "CommercialSimulationValueResult"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "CommercialSimulationWorkspace"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_scenarioId_workspac_fkey" FOREIGN KEY ("scenarioId", "workspaceId") REFERENCES "CommercialSimulationScenario"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_calculationRunId_sc_fkey" FOREIGN KEY ("calculationRunId", "scenarioId") REFERENCES "CommercialSimulationCalculationRun"("id", "scenarioId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_proposalRevisionId__fkey" FOREIGN KEY ("proposalRevisionId", "proposalId") REFERENCES "CommercialProposalRevision"("id", "proposalId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CommercialSimulationProposalConversion" ADD CONSTRAINT "CommercialSimulationProposalConversion_convertedByUserId_fkey" FOREIGN KEY ("convertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- Simulator V1 integrity checks. Definitions remain code-owned; the database
-- guarantees structural typing, ownership and evidence immutability.
ALTER TABLE "CommercialSimulationWorkspace"
  ADD CONSTRAINT "CommercialSimulationWorkspace_target_xor_check"
  CHECK (("organizationId" IS NOT NULL) <> ("prospectId" IS NOT NULL)),
  ADD CONSTRAINT "CommercialSimulationWorkspace_currency_check"
  CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "CommercialSimulationWorkspace_lockVersion_check"
  CHECK ("lockVersion" >= 0);

ALTER TABLE "CommercialSimulationScenario"
  ADD CONSTRAINT "CommercialSimulationScenario_lockVersion_check"
  CHECK ("lockVersion" >= 0);

ALTER TABLE "CommercialSimulationScenarioLine"
  ADD CONSTRAINT "CommercialSimulationScenarioLine_source_check"
  CHECK (("source" = 'CATALOG_COMPONENT' AND "priceComponentId" IS NOT NULL) OR ("source" <> 'CATALOG_COMPONENT' AND "priceComponentId" IS NULL)),
  ADD CONSTRAINT "CommercialSimulationScenarioLine_quantity_check"
  CHECK ("quantity" IS NULL OR "quantity" >= 0),
  ADD CONSTRAINT "CommercialSimulationScenarioLine_amount_check"
  CHECK ("proposedUnitAmountMinor" IS NULL OR "proposedUnitAmountMinor" >= 0),
  ADD CONSTRAINT "CommercialSimulationScenarioLine_distribution_check"
  CHECK (("distributable" = TRUE) OR ("distributionLimit" IS NULL AND "distributionMetric" IS NULL)),
  ADD CONSTRAINT "CommercialSimulationScenarioLine_distribution_limit_check"
  CHECK ("distributionLimit" IS NULL OR ("distributable" = TRUE AND "distributionMetric" IS NOT NULL AND "distributionLimit" >= 0));

ALTER TABLE "CommercialSimulationCalculationRun"
  ADD CONSTRAINT "CommercialSimulationCalculationRun_hash_check"
  CHECK ("calculationKey" ~ '^[0-9a-f]{64}$' AND "inputFingerprint" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "CommercialSimulationCalculationRun_sequence_check"
  CHECK ("sequence" > 0),
  ADD CONSTRAINT "CommercialSimulationCalculationRun_currency_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "CommercialCostAssumptionVersion"
  ADD CONSTRAINT "CommercialCostAssumptionVersion_version_check" CHECK ("versionNumber" > 0),
  ADD CONSTRAINT "CommercialCostAssumptionVersion_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "CommercialCostAssumptionVersion_hash_check" CHECK ("contentHash" IS NULL OR "contentHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "CommercialCostAssumptionVersion_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "archivedAt" IS NULL AND "contentHash" IS NULL) OR
    ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "archivedAt" IS NULL AND "contentHash" IS NOT NULL) OR
    ("status" = 'ARCHIVED' AND "publishedAt" IS NOT NULL AND "archivedAt" IS NOT NULL AND "contentHash" IS NOT NULL)
  );

ALTER TABLE "CommercialValuationAssumptionVersion"
  ADD CONSTRAINT "CommercialValuationAssumptionVersion_version_check" CHECK ("versionNumber" > 0),
  ADD CONSTRAINT "CommercialValuationAssumptionVersion_hash_check" CHECK ("contentHash" IS NULL OR "contentHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "CommercialValuationAssumptionVersion_lifecycle_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "archivedAt" IS NULL AND "contentHash" IS NULL) OR
    ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "archivedAt" IS NULL AND "contentHash" IS NOT NULL) OR
    ("status" = 'ARCHIVED' AND "publishedAt" IS NOT NULL AND "archivedAt" IS NOT NULL AND "contentHash" IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION "commercial_simulator_typed_value_valid"(
  value_type "CommercialSimulationValueType",
  decimal_value DECIMAL,
  integer_value BIGINT,
  money_value BIGINT,
  boolean_value BOOLEAN,
  text_value TEXT,
  currency_value CHAR(3)
) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE value_type
    WHEN 'DECIMAL' THEN decimal_value IS NOT NULL AND integer_value IS NULL AND money_value IS NULL AND boolean_value IS NULL AND text_value IS NULL AND currency_value IS NULL
    WHEN 'INTEGER' THEN decimal_value IS NULL AND integer_value IS NOT NULL AND money_value IS NULL AND boolean_value IS NULL AND text_value IS NULL AND currency_value IS NULL
    WHEN 'MONEY' THEN decimal_value IS NULL AND integer_value IS NULL AND money_value IS NOT NULL AND boolean_value IS NULL AND text_value IS NULL AND currency_value ~ '^[A-Z]{3}$'
    WHEN 'BOOLEAN' THEN decimal_value IS NULL AND integer_value IS NULL AND money_value IS NULL AND boolean_value IS NOT NULL AND text_value IS NULL AND currency_value IS NULL
    WHEN 'TEXT' THEN decimal_value IS NULL AND integer_value IS NULL AND money_value IS NULL AND boolean_value IS NULL AND text_value IS NOT NULL AND currency_value IS NULL
  END
$$;

ALTER TABLE "CommercialSimulationDriverValue" ADD CONSTRAINT "CommercialSimulationDriverValue_typed_check" CHECK ("commercial_simulator_typed_value_valid"("valueType", "decimalValue", "integerValue", "moneyMinorValue", "booleanValue", "textValue", "currency"));
ALTER TABLE "CommercialCostAssumptionValue" ADD CONSTRAINT "CommercialCostAssumptionValue_typed_check" CHECK ("commercial_simulator_typed_value_valid"("valueType", "decimalValue", "integerValue", "moneyMinorValue", "booleanValue", "textValue", "currency"));
ALTER TABLE "CommercialValuationAssumptionValue" ADD CONSTRAINT "CommercialValuationAssumptionValue_typed_check" CHECK ("commercial_simulator_typed_value_valid"("valueType", "decimalValue", "integerValue", "moneyMinorValue", "booleanValue", "textValue", "currency"));
ALTER TABLE "CommercialSimulationRunInput" ADD CONSTRAINT "CommercialSimulationRunInput_typed_check" CHECK ("commercial_simulator_typed_value_valid"("valueType", "decimalValue", "integerValue", "moneyMinorValue", "booleanValue", "textValue", "currency"));
ALTER TABLE "CommercialSimulationValueMetric" ADD CONSTRAINT "CommercialSimulationValueMetric_typed_check" CHECK ("commercial_simulator_typed_value_valid"("valueType", "decimalValue", "integerValue", "moneyMinorValue", "booleanValue", "textValue", "currency"));

CREATE OR REPLACE FUNCTION "commercial_simulator_reject_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'commercial simulator evidence is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION "commercial_simulator_protect_assumption_version"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'published commercial assumptions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" = 'DRAFT' THEN
    RETURN NEW;
  END IF;
  IF OLD."status" = 'PUBLISHED'
     AND NEW."status" = 'ARCHIVED'
     AND (to_jsonb(NEW) - ARRAY['status','archivedAt','updatedAt']) =
         (to_jsonb(OLD) - ARRAY['status','archivedAt','updatedAt']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'published commercial assumptions are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION "commercial_simulator_protect_assumption_value"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_status "CommercialAssumptionVersionStatus";
  parent_id TEXT := COALESCE(NEW."versionId", OLD."versionId");
BEGIN
  IF TG_TABLE_NAME = 'CommercialCostAssumptionValue' THEN
    SELECT "status" INTO parent_status FROM "CommercialCostAssumptionVersion" WHERE "id" = parent_id;
  ELSE
    SELECT "status" INTO parent_status FROM "CommercialValuationAssumptionVersion" WHERE "id" = parent_id;
  END IF;
  IF parent_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'published commercial assumption values are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommercialSimulationCalculationRun_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationCalculationRun" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationRunValuationVersion_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationRunValuationVersion" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationRunInput_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationRunInput" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationRunLine_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationRunLine" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationPriceResult_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationPriceResult" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationCostResult_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationCostResult" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationValueResult_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationValueResult" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationValueMetric_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationValueMetric" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialSimulationProposalConversion_immutable" BEFORE UPDATE OR DELETE ON "CommercialSimulationProposalConversion" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_reject_change"();
CREATE TRIGGER "CommercialCostAssumptionVersion_protect" BEFORE UPDATE OR DELETE ON "CommercialCostAssumptionVersion" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_protect_assumption_version"();
CREATE TRIGGER "CommercialValuationAssumptionVersion_protect" BEFORE UPDATE OR DELETE ON "CommercialValuationAssumptionVersion" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_protect_assumption_version"();
CREATE TRIGGER "CommercialCostAssumptionValue_protect" BEFORE INSERT OR UPDATE OR DELETE ON "CommercialCostAssumptionValue" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_protect_assumption_value"();
CREATE TRIGGER "CommercialValuationAssumptionValue_protect" BEFORE INSERT OR UPDATE OR DELETE ON "CommercialValuationAssumptionValue" FOR EACH ROW EXECUTE FUNCTION "commercial_simulator_protect_assumption_value"();
