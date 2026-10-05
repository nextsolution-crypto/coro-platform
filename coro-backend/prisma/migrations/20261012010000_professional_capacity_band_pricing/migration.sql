-- Add a distinct pricing model whose selected tier amount is the total band price.
ALTER TYPE "PricingModel" ADD VALUE 'CAPACITY_BAND';

-- Annual recurring prices are authoritative. Some cannot be represented as an
-- exact integer monthly equivalent without inventing a rounding policy.
ALTER TABLE "CommercialSimulationPriceResult"
  ALTER COLUMN "monthlyRecurringEquivalentMinor" DROP NOT NULL;
