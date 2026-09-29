-- CreateEnum
CREATE TYPE "CommercialProspectStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "CommercialProposalStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommercialProposalRevisionStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'READY', 'SENT', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProposalLineSource" AS ENUM ('CATALOG_COMPONENT', 'CUSTOM_COMPONENT', 'EXCLUSIVITY_FEE');

-- CreateEnum
CREATE TYPE "ProposalAdjustmentScope" AS ENUM ('GLOBAL', 'COMPONENT', 'CUSTOM_COMPONENT');

-- CreateEnum
CREATE TYPE "ProposalAdjustmentType" AS ENUM ('PERCENT_DISCOUNT', 'FIXED_OVERRIDE', 'CUSTOM_FIXED_PRICE');

-- CreateEnum
CREATE TYPE "ProposalInputCategory" AS ENUM ('QUANTITY', 'COMPLEXITY', 'VALUE_ANALYSIS', 'COMMERCIAL_ASSUMPTION');

-- CreateEnum
CREATE TYPE "ProposalInputValueType" AS ENUM ('DECIMAL', 'INTEGER', 'MONEY', 'BOOLEAN', 'TEXT');

-- CreateEnum
CREATE TYPE "ProposalInputSource" AS ENUM ('DECLARED', 'OBSERVED_SNAPSHOT', 'MANUAL_ASSUMPTION');

-- CreateEnum
CREATE TYPE "ProposalCalculationStatus" AS ENUM ('CALCULATED', 'ESTIMATED', 'MANUAL', 'TBD');

-- CreateEnum
CREATE TYPE "ProposalDocumentType" AS ENUM ('OFFER', 'ACCEPTANCE_EVIDENCE', 'SUPPORTING_DOCUMENT');

-- CreateEnum
CREATE TYPE "ProposalDocumentStatus" AS ENUM ('GENERATING', 'FINALIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProposalLanguage" AS ENUM ('FR', 'EN');

ALTER TABLE "ContractPriceSnapshotLine" ADD COLUMN     "calculationExplanation" TEXT,
ADD COLUMN     "calculationFormula" TEXT,
ADD COLUMN     "calculationStatus" "ProposalCalculationStatus",
ADD COLUMN     "catalogExtendedAmountMinor" BIGINT,
ADD COLUMN     "contractExtendedAmountMinor" BIGINT,
ADD COLUMN     "distributable" BOOLEAN,
ADD COLUMN     "distributionLimit" DECIMAL(20,6),
ADD COLUMN     "distributionMetric" "PriceMetric",
ADD COLUMN     "internalUse" BOOLEAN,
ADD COLUMN     "quantity" DECIMAL(20,6),
ADD COLUMN     "quantityUnit" TEXT;

ALTER TABLE "ContractPriceSnapshotLine" ADD CONSTRAINT "ContractPriceSnapshotLine_distribution_check" CHECK (
    ("distributable" IS NULL AND "distributionLimit" IS NULL AND "distributionMetric" IS NULL)
    OR ("distributable" = false AND "distributionLimit" IS NULL AND "distributionMetric" IS NULL)
    OR ("distributable" = true AND (
        ("distributionLimit" IS NULL AND "distributionMetric" IS NULL)
        OR ("distributionLimit" >= 0 AND "distributionMetric" IS NOT NULL)
    ))
);

ALTER TABLE "OrganizationContractRevision" ADD COLUMN     "sourceProposalRevisionId" TEXT;

ALTER TABLE "ContractMinimumCommitment" ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "CommercialProspect" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "preferredLanguage" "ProposalLanguage" NOT NULL DEFAULT 'FR',
    "contactName" TEXT,
    "contactTitle" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "subdivision" TEXT,
    "postalCode" TEXT,
    "country" CHAR(2) NOT NULL,
    "status" "CommercialProspectStatus" NOT NULL DEFAULT 'ACTIVE',
    "convertedOrganizationId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedByUserId" TEXT,
    "convertedByDisplayName" TEXT,
    "disqualifiedAt" TIMESTAMP(3),
    "disqualificationReason" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdByDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialProposal" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizationId" TEXT,
    "prospectId" TEXT,
    "status" "CommercialProposalStatus" NOT NULL DEFAULT 'OPEN',
    "acceptedRevisionId" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdByDisplayName" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "terminalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialProposalRevision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "basedOnRevisionId" TEXT,
    "status" "CommercialProposalRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourcePriceBookId" TEXT,
    "sourcePriceBookVersionId" TEXT,
    "priceBookCodeSnapshot" TEXT,
    "priceBookNameSnapshot" TEXT,
    "priceBookVersionSnapshot" INTEGER,
    "audienceSnapshot" "PriceBookAudience",
    "relationshipSnapshot" "CommercialRelationship" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "recipientLegalName" TEXT NOT NULL,
    "recipientDisplayName" TEXT NOT NULL,
    "recipientContactName" TEXT,
    "recipientContactTitle" TEXT,
    "recipientEmail" TEXT,
    "recipientAddressLine1" TEXT,
    "recipientAddressLine2" TEXT,
    "recipientCity" TEXT,
    "recipientSubdivision" TEXT,
    "recipientPostalCode" TEXT,
    "recipientCountry" CHAR(2) NOT NULL,
    "recipientPreferredLanguage" "ProposalLanguage" NOT NULL,
    "contextFR" TEXT,
    "contextEN" TEXT,
    "termsFR" TEXT,
    "termsEN" TEXT,
    "internalNotes" TEXT,
    "oneTimeTotalMinor" BIGINT,
    "recurringMonthlyCadenceMinor" BIGINT,
    "recurringAnnualCadenceMinor" BIGINT,
    "monthlyRecurringEquivalentMinor" BIGINT,
    "annualRecurringEquivalentMinor" BIGINT,
    "estimatedUsageTotalMinor" BIGINT,
    "firstYearCommitmentMinor" BIGINT,
    "firstYearIncludesEstimate" BOOLEAN NOT NULL DEFAULT false,
    "calculationVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentDocumentId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByName" TEXT,
    "acceptanceReference" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "lifecycleReason" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdByDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialProposalRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalInput" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "capabilityId" TEXT,
    "proposalLineId" TEXT,
    "code" TEXT NOT NULL,
    "category" "ProposalInputCategory" NOT NULL,
    "valueType" "ProposalInputValueType" NOT NULL,
    "decimalValue" DECIMAL(20,6),
    "integerValue" BIGINT,
    "moneyMinor" BIGINT,
    "booleanValue" BOOLEAN,
    "textValue" TEXT,
    "currency" CHAR(3),
    "unit" TEXT,
    "source" "ProposalInputSource" NOT NULL,
    "labelFR" TEXT NOT NULL,
    "labelEN" TEXT,
    "justification" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalLine" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "source" "ProposalLineSource" NOT NULL,
    "sourcePriceComponentId" TEXT,
    "capabilityId" TEXT,
    "componentCode" TEXT NOT NULL,
    "componentNameFR" TEXT NOT NULL,
    "componentNameEN" TEXT,
    "descriptionFR" TEXT,
    "descriptionEN" TEXT,
    "pricingModel" "PricingModel" NOT NULL,
    "chargeType" "PriceChargeType" NOT NULL,
    "billingPeriod" "BillingPeriod",
    "metric" "PriceMetric",
    "tierMode" "TierCalculationMode",
    "quantity" DECIMAL(20,6),
    "quantityUnit" TEXT,
    "catalogUnitAmountMinor" BIGINT,
    "proposedUnitAmountMinor" BIGINT,
    "catalogExtendedAmountMinor" BIGINT,
    "proposedExtendedAmountMinor" BIGINT,
    "calculationStatus" "ProposalCalculationStatus" NOT NULL,
    "calculationFormula" TEXT,
    "calculationExplanationFR" TEXT NOT NULL,
    "calculationExplanationEN" TEXT,
    "internalUse" BOOLEAN NOT NULL DEFAULT false,
    "distributable" BOOLEAN NOT NULL DEFAULT false,
    "distributionLimit" DECIMAL(20,6),
    "distributionMetric" "PriceMetric",
    "justification" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalTierSnapshot" (
    "id" TEXT NOT NULL,
    "proposalLineId" TEXT NOT NULL,
    "minimumQuantity" DECIMAL(20,6) NOT NULL,
    "maximumQuantity" DECIMAL(20,6),
    "amountMinor" BIGINT NOT NULL,
    "quantityApplied" DECIMAL(20,6),
    "extendedAmountMinor" BIGINT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalTierSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalAdjustment" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "proposalLineId" TEXT,
    "scope" "ProposalAdjustmentScope" NOT NULL,
    "adjustmentType" "ProposalAdjustmentType" NOT NULL,
    "discountBasisPoints" INTEGER,
    "overrideAmountMinor" BIGINT,
    "labelFR" TEXT,
    "labelEN" TEXT,
    "justification" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalExclusivity" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "territoryType" "ContractTerritoryType" NOT NULL,
    "territoryCode" TEXT,
    "territoryLabel" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "conditions" TEXT,
    "renewalTerms" TEXT,
    "hasEconomicImpact" BOOLEAN NOT NULL DEFAULT false,
    "economicProposalLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalExclusivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalExclusivitySector" (
    "exclusivityId" TEXT NOT NULL,
    "sectorCode" TEXT NOT NULL,
    "sectorLabel" TEXT NOT NULL,

    CONSTRAINT "ProposalExclusivitySector_pkey" PRIMARY KEY ("exclusivityId","sectorCode")
);

-- CreateTable
CREATE TABLE "ProposalExclusivityCapability" (
    "exclusivityId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,

    CONSTRAINT "ProposalExclusivityCapability_pkey" PRIMARY KEY ("exclusivityId","capabilityId")
);

-- CreateTable
CREATE TABLE "ProposalMinimumCommitment" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "type" "ContractCommitmentType" NOT NULL,
    "period" "ContractCommitmentPeriod" NOT NULL,
    "amountMinor" BIGINT,
    "quantity" DECIMAL(20,6),
    "currency" CHAR(3),
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalMinimumCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalDocument" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "type" "ProposalDocumentType" NOT NULL,
    "language" "ProposalLanguage",
    "artifactVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "ProposalDocumentStatus" NOT NULL DEFAULT 'GENERATING',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "storageKey" TEXT NOT NULL,
    "sha256" CHAR(64),
    "templateVersion" TEXT NOT NULL,
    "generatorVersion" TEXT NOT NULL,
    "generationKey" TEXT NOT NULL,
    "generationStartedAt" TIMESTAMP(3) NOT NULL,
    "generationLeaseUntil" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdByUserId" TEXT,
    "createdByDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalValueAnalysis" (
    "id" TEXT NOT NULL,
    "proposalRevisionId" TEXT NOT NULL,
    "mandatesPerYear" DECIMAL(20,6) NOT NULL,
    "averageHoursPerMandate" DECIMAL(20,6) NOT NULL,
    "currentBillableRateMinorPerHour" BIGINT NOT NULL,
    "estimatedProductivityGainBasisPoints" INTEGER NOT NULL,
    "estimatedHoursSaved" DECIMAL(20,6) NOT NULL,
    "estimatedCapacityValueMinor" BIGINT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "roundingPolicy" TEXT NOT NULL,
    "disclaimerFR" TEXT NOT NULL,
    "disclaimerEN" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalValueAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProspect_reference_key" ON "CommercialProspect"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProspect_convertedOrganizationId_key" ON "CommercialProspect"("convertedOrganizationId");

-- CreateIndex
CREATE INDEX "CommercialProspect_status_createdAt_idx" ON "CommercialProspect"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialProspect_legalName_idx" ON "CommercialProspect"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProposal_reference_key" ON "CommercialProposal"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProposal_acceptedRevisionId_key" ON "CommercialProposal"("acceptedRevisionId");

-- CreateIndex
CREATE INDEX "CommercialProposal_organizationId_status_idx" ON "CommercialProposal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CommercialProposal_prospectId_status_idx" ON "CommercialProposal"("prospectId", "status");

-- CreateIndex
CREATE INDEX "CommercialProposal_status_createdAt_idx" ON "CommercialProposal"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProposalRevision_sentDocumentId_key" ON "CommercialProposalRevision"("sentDocumentId");

-- CreateIndex
CREATE INDEX "CommercialProposalRevision_proposalId_status_idx" ON "CommercialProposalRevision"("proposalId", "status");

-- CreateIndex
CREATE INDEX "CommercialProposalRevision_sourcePriceBookVersionId_idx" ON "CommercialProposalRevision"("sourcePriceBookVersionId");

-- CreateIndex
CREATE INDEX "CommercialProposalRevision_status_validUntil_idx" ON "CommercialProposalRevision"("status", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProposalRevision_proposalId_revisionNumber_key" ON "CommercialProposalRevision"("proposalId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialProposalRevision_id_proposalId_key" ON "CommercialProposalRevision"("id", "proposalId");

-- CreateIndex
CREATE INDEX "ProposalInput_proposalRevisionId_category_idx" ON "ProposalInput"("proposalRevisionId", "category");

-- CreateIndex
CREATE INDEX "ProposalInput_capabilityId_idx" ON "ProposalInput"("capabilityId");

-- CreateIndex
CREATE INDEX "ProposalInput_proposalLineId_idx" ON "ProposalInput"("proposalLineId");

-- CreateIndex
CREATE INDEX "ProposalLine_proposalRevisionId_displayOrder_idx" ON "ProposalLine"("proposalRevisionId", "displayOrder");

-- CreateIndex
CREATE INDEX "ProposalLine_sourcePriceComponentId_idx" ON "ProposalLine"("sourcePriceComponentId");

-- CreateIndex
CREATE INDEX "ProposalLine_capabilityId_idx" ON "ProposalLine"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalLine_proposalRevisionId_componentCode_key" ON "ProposalLine"("proposalRevisionId", "componentCode");

-- CreateIndex
CREATE INDEX "ProposalTierSnapshot_proposalLineId_minimumQuantity_maximum_idx" ON "ProposalTierSnapshot"("proposalLineId", "minimumQuantity", "maximumQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalTierSnapshot_proposalLineId_displayOrder_key" ON "ProposalTierSnapshot"("proposalLineId", "displayOrder");

-- CreateIndex
CREATE INDEX "ProposalAdjustment_proposalRevisionId_scope_idx" ON "ProposalAdjustment"("proposalRevisionId", "scope");

-- CreateIndex
CREATE INDEX "ProposalAdjustment_proposalLineId_idx" ON "ProposalAdjustment"("proposalLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalAdjustment_proposalRevisionId_displayOrder_key" ON "ProposalAdjustment"("proposalRevisionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalExclusivity_economicProposalLineId_key" ON "ProposalExclusivity"("economicProposalLineId");

-- CreateIndex
CREATE INDEX "ProposalExclusivity_proposalRevisionId_startsAt_endsAt_idx" ON "ProposalExclusivity"("proposalRevisionId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ProposalExclusivity_territoryType_territoryCode_idx" ON "ProposalExclusivity"("territoryType", "territoryCode");

-- CreateIndex
CREATE INDEX "ProposalExclusivitySector_sectorCode_idx" ON "ProposalExclusivitySector"("sectorCode");

-- CreateIndex
CREATE INDEX "ProposalExclusivityCapability_capabilityId_idx" ON "ProposalExclusivityCapability"("capabilityId");

-- CreateIndex
CREATE INDEX "ProposalMinimumCommitment_proposalRevisionId_type_idx" ON "ProposalMinimumCommitment"("proposalRevisionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalDocument_storageKey_key" ON "ProposalDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalDocument_generationKey_key" ON "ProposalDocument"("generationKey");

-- CreateIndex
CREATE INDEX "ProposalDocument_proposalRevisionId_status_idx" ON "ProposalDocument"("proposalRevisionId", "status");

-- CreateIndex
CREATE INDEX "ProposalDocument_status_generationLeaseUntil_idx" ON "ProposalDocument"("status", "generationLeaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalDocument_proposalRevisionId_type_language_artifactV_key" ON "ProposalDocument"("proposalRevisionId", "type", "language", "artifactVersion");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalValueAnalysis_proposalRevisionId_key" ON "ProposalValueAnalysis"("proposalRevisionId");

CREATE UNIQUE INDEX "OrganizationContractRevision_sourceProposalRevisionId_key" ON "OrganizationContractRevision"("sourceProposalRevisionId");

-- AddForeignKey
ALTER TABLE "OrganizationContractRevision" ADD CONSTRAINT "OrganizationContractRevision_sourceProposalRevisionId_fkey" FOREIGN KEY ("sourceProposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProspect" ADD CONSTRAINT "CommercialProspect_convertedOrganizationId_fkey" FOREIGN KEY ("convertedOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProspect" ADD CONSTRAINT "CommercialProspect_convertedByUserId_fkey" FOREIGN KEY ("convertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProspect" ADD CONSTRAINT "CommercialProspect_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposal" ADD CONSTRAINT "CommercialProposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposal" ADD CONSTRAINT "CommercialProposal_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposal" ADD CONSTRAINT "CommercialProposal_acceptedRevisionId_fkey" FOREIGN KEY ("acceptedRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposal" ADD CONSTRAINT "CommercialProposal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_basedOnRevisionId_fkey" FOREIGN KEY ("basedOnRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_sourcePriceBookId_fkey" FOREIGN KEY ("sourcePriceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_sourcePriceBookVersionId_fkey" FOREIGN KEY ("sourcePriceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_sentDocumentId_fkey" FOREIGN KEY ("sentDocumentId") REFERENCES "ProposalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalInput" ADD CONSTRAINT "ProposalInput_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalInput" ADD CONSTRAINT "ProposalInput_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalInput" ADD CONSTRAINT "ProposalInput_proposalLineId_fkey" FOREIGN KEY ("proposalLineId") REFERENCES "ProposalLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalLine" ADD CONSTRAINT "ProposalLine_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalLine" ADD CONSTRAINT "ProposalLine_sourcePriceComponentId_fkey" FOREIGN KEY ("sourcePriceComponentId") REFERENCES "PriceComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalLine" ADD CONSTRAINT "ProposalLine_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTierSnapshot" ADD CONSTRAINT "ProposalTierSnapshot_proposalLineId_fkey" FOREIGN KEY ("proposalLineId") REFERENCES "ProposalLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAdjustment" ADD CONSTRAINT "ProposalAdjustment_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAdjustment" ADD CONSTRAINT "ProposalAdjustment_proposalLineId_fkey" FOREIGN KEY ("proposalLineId") REFERENCES "ProposalLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalExclusivity" ADD CONSTRAINT "ProposalExclusivity_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalExclusivity" ADD CONSTRAINT "ProposalExclusivity_economicProposalLineId_fkey" FOREIGN KEY ("economicProposalLineId") REFERENCES "ProposalLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalExclusivitySector" ADD CONSTRAINT "ProposalExclusivitySector_exclusivityId_fkey" FOREIGN KEY ("exclusivityId") REFERENCES "ProposalExclusivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalExclusivityCapability" ADD CONSTRAINT "ProposalExclusivityCapability_exclusivityId_fkey" FOREIGN KEY ("exclusivityId") REFERENCES "ProposalExclusivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalExclusivityCapability" ADD CONSTRAINT "ProposalExclusivityCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalMinimumCommitment" ADD CONSTRAINT "ProposalMinimumCommitment_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalDocument" ADD CONSTRAINT "ProposalDocument_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalDocument" ADD CONSTRAINT "ProposalDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalValueAnalysis" ADD CONSTRAINT "ProposalValueAnalysis_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 2D domain checks and partial uniqueness.
ALTER TABLE "CommercialProposal" ADD CONSTRAINT "CommercialProposal_target_xor_check" CHECK (("organizationId" IS NOT NULL) <> ("prospectId" IS NOT NULL));
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_validity_check" CHECK ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" > "validFrom");
ALTER TABLE "CommercialProposalRevision" ADD CONSTRAINT "CommercialProposalRevision_acceptance_check" CHECK ("status" <> 'ACCEPTED' OR ("acceptedAt" IS NOT NULL AND NULLIF(BTRIM("acceptedByName"),'') IS NOT NULL AND NULLIF(BTRIM("lifecycleReason"),'') IS NOT NULL AND "sentDocumentId" IS NOT NULL));
ALTER TABLE "ProposalInput" ADD CONSTRAINT "ProposalInput_typed_value_check" CHECK (("valueType"='DECIMAL' AND "decimalValue" IS NOT NULL AND "integerValue" IS NULL AND "moneyMinor" IS NULL AND "booleanValue" IS NULL AND "textValue" IS NULL AND "currency" IS NULL) OR ("valueType"='INTEGER' AND "integerValue" IS NOT NULL AND "decimalValue" IS NULL AND "moneyMinor" IS NULL AND "booleanValue" IS NULL AND "textValue" IS NULL AND "currency" IS NULL) OR ("valueType"='MONEY' AND "moneyMinor" IS NOT NULL AND "currency" IS NOT NULL AND "decimalValue" IS NULL AND "integerValue" IS NULL AND "booleanValue" IS NULL AND "textValue" IS NULL) OR ("valueType"='BOOLEAN' AND "booleanValue" IS NOT NULL AND "decimalValue" IS NULL AND "integerValue" IS NULL AND "moneyMinor" IS NULL AND "textValue" IS NULL AND "currency" IS NULL) OR ("valueType"='TEXT' AND "textValue" IS NOT NULL AND "decimalValue" IS NULL AND "integerValue" IS NULL AND "moneyMinor" IS NULL AND "booleanValue" IS NULL AND "currency" IS NULL));
ALTER TABLE "ProposalLine" ADD CONSTRAINT "ProposalLine_values_check" CHECK (("quantity" IS NULL OR "quantity">=0) AND ("distributionLimit" IS NULL OR "distributionLimit">=0) AND (("distributable" AND (("distributionLimit" IS NULL AND "distributionMetric" IS NULL) OR ("distributionLimit" IS NOT NULL AND "distributionMetric" IS NOT NULL))) OR (NOT "distributable" AND "distributionLimit" IS NULL AND "distributionMetric" IS NULL)) AND ("catalogUnitAmountMinor" IS NULL OR "catalogUnitAmountMinor">=0) AND ("proposedUnitAmountMinor" IS NULL OR "proposedUnitAmountMinor">=0) AND ("catalogExtendedAmountMinor" IS NULL OR "catalogExtendedAmountMinor">=0) AND ("proposedExtendedAmountMinor" IS NULL OR "proposedExtendedAmountMinor">=0));
ALTER TABLE "ProposalAdjustment" ADD CONSTRAINT "ProposalAdjustment_matrix_check" CHECK (("scope"='GLOBAL' AND "adjustmentType"='PERCENT_DISCOUNT' AND "proposalLineId" IS NULL AND "discountBasisPoints" BETWEEN 0 AND 10000 AND "overrideAmountMinor" IS NULL) OR ("scope"='COMPONENT' AND "proposalLineId" IS NOT NULL AND (("adjustmentType"='PERCENT_DISCOUNT' AND "discountBasisPoints" BETWEEN 0 AND 10000 AND "overrideAmountMinor" IS NULL) OR ("adjustmentType"='FIXED_OVERRIDE' AND "discountBasisPoints" IS NULL AND "overrideAmountMinor">=0))) OR ("scope"='CUSTOM_COMPONENT' AND "proposalLineId" IS NOT NULL AND "adjustmentType"='CUSTOM_FIXED_PRICE' AND "discountBasisPoints" IS NULL AND "overrideAmountMinor">=0));
ALTER TABLE "ProposalExclusivity" ADD CONSTRAINT "ProposalExclusivity_dates_economic_check" CHECK (("endsAt" IS NULL OR "endsAt">"startsAt") AND (("hasEconomicImpact" AND "economicProposalLineId" IS NOT NULL) OR (NOT "hasEconomicImpact" AND "economicProposalLineId" IS NULL)));
ALTER TABLE "ProposalDocument" ADD CONSTRAINT "ProposalDocument_finalized_check" CHECK ("status"<>'FINALIZED' OR ("sha256" IS NOT NULL AND "sizeBytes">0 AND "generatedAt" IS NOT NULL));
ALTER TABLE "ProposalValueAnalysis" ADD CONSTRAINT "ProposalValueAnalysis_values_check" CHECK ("mandatesPerYear">=0 AND "averageHoursPerMandate">=0 AND "currentBillableRateMinorPerHour">=0 AND "estimatedProductivityGainBasisPoints" BETWEEN 0 AND 10000 AND "estimatedHoursSaved">=0 AND "estimatedCapacityValueMinor">=0);
CREATE UNIQUE INDEX "CommercialProposalRevision_one_accepted_per_proposal" ON "CommercialProposalRevision"("proposalId") WHERE "status"='ACCEPTED';
CREATE UNIQUE INDEX "ProposalInput_revision_code_global_key" ON "ProposalInput"("proposalRevisionId","code") WHERE "capabilityId" IS NULL AND "proposalLineId" IS NULL;
CREATE UNIQUE INDEX "ProposalInput_revision_code_capability_key" ON "ProposalInput"("proposalRevisionId","code","capabilityId") WHERE "capabilityId" IS NOT NULL AND "proposalLineId" IS NULL;
CREATE UNIQUE INDEX "ProposalInput_revision_code_line_key" ON "ProposalInput"("proposalRevisionId","code","proposalLineId") WHERE "proposalLineId" IS NOT NULL;

CREATE FUNCTION protect_commercial_prospect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Commercial prospects cannot be deleted'; END IF;
  IF OLD."convertedOrganizationId" IS NOT NULL AND (NEW."convertedOrganizationId",NEW."convertedAt",NEW."convertedByUserId",NEW."convertedByDisplayName") IS DISTINCT FROM (OLD."convertedOrganizationId",OLD."convertedAt",OLD."convertedByUserId",OLD."convertedByDisplayName") THEN RAISE EXCEPTION 'Prospect conversion is immutable'; END IF;
  IF NEW."lockVersion"<>OLD."lockVersion"+1 THEN RAISE EXCEPTION 'Invalid prospect lockVersion'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_prospect_protect BEFORE UPDATE OR DELETE ON "CommercialProspect" FOR EACH ROW EXECUTE FUNCTION protect_commercial_prospect();

CREATE FUNCTION protect_commercial_proposal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Commercial proposals cannot be deleted'; END IF;
  IF EXISTS (SELECT 1 FROM "CommercialProposalRevision" WHERE "proposalId"=OLD."id" AND "status" IN ('SENT','ACCEPTED','REJECTED','SUPERSEDED','CANCELLED')) AND (NEW."organizationId",NEW."prospectId") IS DISTINCT FROM (OLD."organizationId",OLD."prospectId") THEN RAISE EXCEPTION 'Proposal target is immutable after send'; END IF;
  IF NEW."lockVersion"<>OLD."lockVersion"+1 THEN RAISE EXCEPTION 'Invalid proposal lockVersion'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_proposal_protect BEFORE UPDATE OR DELETE ON "CommercialProposal" FOR EACH ROW EXECUTE FUNCTION protect_commercial_proposal();

CREATE FUNCTION protect_proposal_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Proposal revisions cannot be deleted'; END IF;
  IF OLD."status" IN ('ACCEPTED','REJECTED','SUPERSEDED','CANCELLED') THEN RAISE EXCEPTION 'Terminal proposal revision is immutable'; END IF;
  IF OLD."status"<>'DRAFT' AND (to_jsonb(NEW)-ARRAY['status','lifecycleReason','lockVersion','updatedAt','sentAt','sentDocumentId','acceptedAt','acceptedByName','acceptanceReference','rejectedAt','cancelledAt','supersededAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','lifecycleReason','lockVersion','updatedAt','sentAt','sentDocumentId','acceptedAt','acceptedByName','acceptanceReference','rejectedAt','cancelledAt','supersededAt']) THEN RAISE EXCEPTION 'Frozen proposal revision content is immutable'; END IF;
  IF NEW."lockVersion"<>OLD."lockVersion"+1 THEN RAISE EXCEPTION 'Invalid proposal revision lockVersion'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_proposal_revision_protect BEFORE UPDATE OR DELETE ON "CommercialProposalRevision" FOR EACH ROW EXECUTE FUNCTION protect_proposal_revision();

CREATE FUNCTION protect_proposal_child() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE rid TEXT; st "CommercialProposalRevisionStatus"; BEGIN
  IF TG_TABLE_NAME='ProposalTierSnapshot' THEN
    SELECT "proposalRevisionId" INTO rid FROM "ProposalLine" WHERE "id"=CASE WHEN TG_OP='DELETE' THEN OLD."proposalLineId" ELSE NEW."proposalLineId" END;
  ELSIF TG_TABLE_NAME IN ('ProposalExclusivitySector','ProposalExclusivityCapability') THEN
    SELECT "proposalRevisionId" INTO rid FROM "ProposalExclusivity" WHERE "id"=CASE WHEN TG_OP='DELETE' THEN OLD."exclusivityId" ELSE NEW."exclusivityId" END;
  ELSE
    rid:=CASE WHEN TG_OP='DELETE' THEN OLD."proposalRevisionId" ELSE NEW."proposalRevisionId" END;
  END IF;
  SELECT "status" INTO st FROM "CommercialProposalRevision" WHERE "id"=rid;
  IF st IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Frozen proposal revision children are immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposal_input_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalInput" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_line_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalLine" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_tier_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalTierSnapshot" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_adjustment_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalAdjustment" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_exclusivity_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalExclusivity" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_exclusivity_sector_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalExclusivitySector" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_exclusivity_capability_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalExclusivityCapability" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_commitment_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalMinimumCommitment" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();
CREATE TRIGGER proposal_value_analysis_protect BEFORE INSERT OR UPDATE OR DELETE ON "ProposalValueAnalysis" FOR EACH ROW EXECUTE FUNCTION protect_proposal_child();

CREATE FUNCTION protect_proposal_document() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Proposal documents cannot be deleted'; END IF;
  IF OLD."status"='FINALIZED' THEN RAISE EXCEPTION 'Finalized proposal document is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposal_document_protect BEFORE UPDATE OR DELETE ON "ProposalDocument" FOR EACH ROW EXECUTE FUNCTION protect_proposal_document();

CREATE FUNCTION validate_proposal_links() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW."acceptedRevisionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "CommercialProposalRevision" WHERE "id"=NEW."acceptedRevisionId" AND "proposalId"=NEW."id" AND "status"='ACCEPTED') THEN RAISE EXCEPTION 'Accepted revision mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_proposal_links BEFORE INSERT OR UPDATE ON "CommercialProposal" FOR EACH ROW EXECUTE FUNCTION validate_proposal_links();

CREATE FUNCTION validate_proposal_revision_links() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW."sentDocumentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ProposalDocument" WHERE "id"=NEW."sentDocumentId" AND "proposalRevisionId"=NEW."id" AND "type"='OFFER' AND "status"='FINALIZED') THEN RAISE EXCEPTION 'Sent document mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commercial_proposal_revision_links BEFORE INSERT OR UPDATE ON "CommercialProposalRevision" FOR EACH ROW EXECUTE FUNCTION validate_proposal_revision_links();
