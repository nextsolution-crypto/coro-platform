CREATE TYPE "CommercialRevenueCategory" AS ENUM (
  'SAAS',
  'PROFESSIONAL_SERVICE',
  'IMPLEMENTATION',
  'OTHER_RECURRING',
  'OTHER_ONE_TIME'
);

ALTER TABLE "PriceComponent"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";

ALTER TABLE "ContractPricingAdjustment"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";

ALTER TABLE "ContractPriceSnapshotLine"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";

ALTER TABLE "ProposalLine"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";

ALTER TABLE "CommercialSimulationScenarioLine"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";

ALTER TABLE "CommercialSimulationRunLine"
  ADD COLUMN "revenueCategory" "CommercialRevenueCategory";
