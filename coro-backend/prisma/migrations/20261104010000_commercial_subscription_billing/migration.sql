ALTER TYPE "PlatformPermission" ADD VALUE 'COMMERCIAL_SUBSCRIPTION_MANAGE';
ALTER TYPE "PlatformPermission" ADD VALUE 'COMMERCIAL_BILLING_MANAGE';
ALTER TYPE "PlatformPermission" ADD VALUE 'COMMERCIAL_BILLING_APPROVE';
ALTER TYPE "PlatformPermission" ADD VALUE 'COMMERCIAL_PAYMENT_RECORD';

CREATE TYPE "CommercialSubscriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "CommercialInvoiceStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUED', 'PARTIAL', 'PAID', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "CommercialPaymentStatus" AS ENUM ('RECORDED', 'VOIDED');
CREATE TYPE "CommercialCreditNoteStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUED', 'CANCELLED');
CREATE TYPE "CommercialTaxConfigurationStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

CREATE TABLE "CommercialSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "CommercialSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
  "contractId" TEXT NOT NULL,
  "contractRevisionId" TEXT NOT NULL,
  "proposalRevisionId" TEXT NOT NULL,
  "priceBookVersionId" TEXT NOT NULL,
  "billingCadence" "ContractBillingCadence" NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "effectiveFrom" DATE NOT NULL,
  "effectiveUntil" DATE,
  "renewalAt" DATE,
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
  "graceMonitoringDays" INTEGER NOT NULL DEFAULT 15,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "lifecycleReason" TEXT,
  "activatedAt" TIMESTAMP(3),
  "pastDueAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "terminatedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSubscription_currency_check" CHECK ("currency" = 'CAD'),
  CONSTRAINT "CommercialSubscription_period_check" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  CONSTRAINT "CommercialSubscription_renewal_check" CHECK ("renewalAt" IS NULL OR "renewalAt" >= "effectiveFrom"),
  CONSTRAINT "CommercialSubscription_policy_check" CHECK ("paymentTermsDays" = 30 AND "graceMonitoringDays" = 15),
  CONSTRAINT "CommercialSubscription_cadence_check" CHECK ("billingCadence" IN ('MONTHLY', 'ANNUAL'))
);

CREATE TABLE "CommercialSubscriptionRenewal" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "previousRenewalAt" DATE,
  "termEffectiveFrom" DATE NOT NULL,
  "nextRenewalAt" DATE NOT NULL,
  "termMonths" INTEGER,
  "reason" TEXT NOT NULL,
  "renewedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialSubscriptionRenewal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSubscriptionRenewal_period_check" CHECK ("nextRenewalAt" > "termEffectiveFrom"),
  CONSTRAINT "CommercialSubscriptionRenewal_term_check" CHECK ("termMonths" IS NULL OR "termMonths" BETWEEN 1 AND 120)
);

CREATE TABLE "CommercialSubscriptionItem" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "capabilityId" TEXT NOT NULL,
  "contractSnapshotLineId" TEXT NOT NULL,
  "quantity" DECIMAL(20,6),
  "quantityUnit" TEXT,
  "amountMinor" BIGINT,
  "billingPeriod" "BillingPeriod",
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialSubscriptionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSubscriptionItem_amount_check" CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0)
);

CREATE TABLE "CommercialTaxConfiguration" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jurisdictionCode" VARCHAR(20) NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CommercialTaxConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
  "federalRatePartsPerMillion" INTEGER NOT NULL,
  "provincialRatePartsPerMillion" INTEGER NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveUntil" DATE,
  "approvalReference" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialTaxConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialTaxConfiguration_rates_check" CHECK ("federalRatePartsPerMillion" BETWEEN 0 AND 1000000 AND "provincialRatePartsPerMillion" BETWEEN 0 AND 1000000),
  CONSTRAINT "CommercialTaxConfiguration_period_check" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom")
);

CREATE TABLE "CommercialInvoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "taxConfigurationId" TEXT NOT NULL,
  "number" TEXT,
  "status" "CommercialInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "subtotalMinor" BIGINT NOT NULL DEFAULT 0,
  "federalTaxMinor" BIGINT NOT NULL DEFAULT 0,
  "provincialTaxMinor" BIGINT NOT NULL DEFAULT 0,
  "totalMinor" BIGINT NOT NULL DEFAULT 0,
  "paidMinor" BIGINT NOT NULL DEFAULT 0,
  "dueDate" DATE,
  "issuedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "pastDueAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "lifecycleReason" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialInvoice_currency_check" CHECK ("currency" = 'CAD'),
  CONSTRAINT "CommercialInvoice_period_check" CHECK ("periodEnd" > "periodStart"),
  CONSTRAINT "CommercialInvoice_amounts_check" CHECK ("subtotalMinor" >= 0 AND "federalTaxMinor" >= 0 AND "provincialTaxMinor" >= 0 AND "totalMinor" = "subtotalMinor" + "federalTaxMinor" + "provincialTaxMinor" AND "paidMinor" >= 0 AND "paidMinor" <= "totalMinor")
);

CREATE TABLE "CommercialInvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sourceSnapshotLineId" TEXT,
  "quantity" DECIMAL(20,6) NOT NULL DEFAULT 1,
  "unitAmountMinor" BIGINT NOT NULL,
  "subtotalMinor" BIGINT NOT NULL,
  "adjustmentMinor" BIGINT NOT NULL DEFAULT 0,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialInvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialInvoiceLine_amounts_check" CHECK ("quantity" >= 0 AND "unitAmountMinor" >= 0 AND "subtotalMinor" >= 0)
);

CREATE TABLE "CommercialPayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "status" "CommercialPaymentStatus" NOT NULL DEFAULT 'RECORDED',
  "paidAt" TIMESTAMP(3) NOT NULL,
  "evidenceReference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "recordedByUserId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  CONSTRAINT "CommercialPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialPayment_amount_check" CHECK ("amountMinor" > 0),
  CONSTRAINT "CommercialPayment_currency_check" CHECK ("currency" = 'CAD')
);

CREATE TABLE "CommercialCreditNote" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "number" TEXT,
  "status" "CommercialCreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "amountMinor" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "approvalReference" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialCreditNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialCreditNote_amount_check" CHECK ("amountMinor" > 0)
);

CREATE UNIQUE INDEX "CommercialSubscription_reference_key" ON "CommercialSubscription"("reference");
CREATE UNIQUE INDEX "CommercialSubscription_idempotencyKey_key" ON "CommercialSubscription"("idempotencyKey");
CREATE UNIQUE INDEX "CommercialSubscription_id_organizationId_key" ON "CommercialSubscription"("id", "organizationId");
CREATE INDEX "CommercialSubscription_organizationId_status_idx" ON "CommercialSubscription"("organizationId", "status");
CREATE INDEX "CommercialSubscription_contractId_contractRevisionId_idx" ON "CommercialSubscription"("contractId", "contractRevisionId");
CREATE INDEX "CommercialSubscription_renewalAt_status_idx" ON "CommercialSubscription"("renewalAt", "status");
CREATE UNIQUE INDEX "CommercialSubscriptionRenewal_subscriptionId_termEffectiveFrom_key" ON "CommercialSubscriptionRenewal"("subscriptionId", "termEffectiveFrom");
CREATE INDEX "CommercialSubscriptionRenewal_subscriptionId_createdAt_idx" ON "CommercialSubscriptionRenewal"("subscriptionId", "createdAt");
CREATE UNIQUE INDEX "CommercialSubscriptionItem_subscriptionId_capabilityId_contractSnapshotLineId_key" ON "CommercialSubscriptionItem"("subscriptionId", "capabilityId", "contractSnapshotLineId");
CREATE INDEX "CommercialSubscriptionItem_subscriptionId_active_idx" ON "CommercialSubscriptionItem"("subscriptionId", "active");
CREATE INDEX "CommercialSubscriptionItem_capabilityId_idx" ON "CommercialSubscriptionItem"("capabilityId");
CREATE UNIQUE INDEX "CommercialTaxConfiguration_organizationId_jurisdictionCode_effectiveFrom_key" ON "CommercialTaxConfiguration"("organizationId", "jurisdictionCode", "effectiveFrom");
CREATE INDEX "CommercialTaxConfiguration_organizationId_status_effectiveFrom_effectiveUntil_idx" ON "CommercialTaxConfiguration"("organizationId", "status", "effectiveFrom", "effectiveUntil");
CREATE UNIQUE INDEX "CommercialInvoice_number_key" ON "CommercialInvoice"("number");
CREATE UNIQUE INDEX "CommercialInvoice_idempotencyKey_key" ON "CommercialInvoice"("idempotencyKey");
CREATE UNIQUE INDEX "CommercialInvoice_id_organizationId_key" ON "CommercialInvoice"("id", "organizationId");
CREATE INDEX "CommercialInvoice_organizationId_status_dueDate_idx" ON "CommercialInvoice"("organizationId", "status", "dueDate");
CREATE INDEX "CommercialInvoice_subscriptionId_periodStart_periodEnd_idx" ON "CommercialInvoice"("subscriptionId", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "CommercialInvoiceLine_invoiceId_displayOrder_key" ON "CommercialInvoiceLine"("invoiceId", "displayOrder");
CREATE INDEX "CommercialInvoiceLine_invoiceId_idx" ON "CommercialInvoiceLine"("invoiceId");
CREATE UNIQUE INDEX "CommercialPayment_idempotencyKey_key" ON "CommercialPayment"("idempotencyKey");
CREATE INDEX "CommercialPayment_invoiceId_status_paidAt_idx" ON "CommercialPayment"("invoiceId", "status", "paidAt");
CREATE UNIQUE INDEX "CommercialCreditNote_number_key" ON "CommercialCreditNote"("number");
CREATE INDEX "CommercialCreditNote_invoiceId_status_idx" ON "CommercialCreditNote"("invoiceId", "status");

ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_contractId_organizationId_fkey" FOREIGN KEY ("contractId", "organizationId") REFERENCES "OrganizationContract"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_contractRevisionId_contractId_fkey" FOREIGN KEY ("contractRevisionId", "contractId") REFERENCES "OrganizationContractRevision"("id", "contractId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_proposalRevisionId_fkey" FOREIGN KEY ("proposalRevisionId") REFERENCES "CommercialProposalRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_priceBookVersionId_fkey" FOREIGN KEY ("priceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscriptionRenewal" ADD CONSTRAINT "CommercialSubscriptionRenewal_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CommercialSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscriptionRenewal" ADD CONSTRAINT "CommercialSubscriptionRenewal_renewedByUserId_fkey" FOREIGN KEY ("renewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscriptionItem" ADD CONSTRAINT "CommercialSubscriptionItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CommercialSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscriptionItem" ADD CONSTRAINT "CommercialSubscriptionItem_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "CommercialCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTaxConfiguration" ADD CONSTRAINT "CommercialTaxConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTaxConfiguration" ADD CONSTRAINT "CommercialTaxConfiguration_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_subscriptionId_organizationId_fkey" FOREIGN KEY ("subscriptionId", "organizationId") REFERENCES "CommercialSubscription"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_taxConfigurationId_fkey" FOREIGN KEY ("taxConfigurationId") REFERENCES "CommercialTaxConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoiceLine" ADD CONSTRAINT "CommercialInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialPayment" ADD CONSTRAINT "CommercialPayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialCreditNote" ADD CONSTRAINT "CommercialCreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialCreditNote" ADD CONSTRAINT "CommercialCreditNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_commercial_invoice_issued"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('ISSUED', 'PARTIAL', 'PAID', 'PAST_DUE', 'CANCELLED') AND
     (to_jsonb(NEW) - ARRAY['status','paidMinor','pastDueAt','cancelledAt','lifecycleReason','lockVersion','updatedAt']) <>
     (to_jsonb(OLD) - ARRAY['status','paidMinor','pastDueAt','cancelledAt','lifecycleReason','lockVersion','updatedAt']) THEN
    RAISE EXCEPTION 'Issued invoice economic data is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "CommercialInvoice_issued_immutable" BEFORE UPDATE ON "CommercialInvoice" FOR EACH ROW EXECUTE FUNCTION "protect_commercial_invoice_issued"();

CREATE OR REPLACE FUNCTION "protect_commercial_invoice_lines"() RETURNS trigger AS $$
DECLARE invoice_status "CommercialInvoiceStatus";
BEGIN
  SELECT "status" INTO invoice_status FROM "CommercialInvoice" WHERE "id" = COALESCE(OLD."invoiceId", NEW."invoiceId");
  IF invoice_status <> 'DRAFT' THEN RAISE EXCEPTION 'Non-draft invoice lines are immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "CommercialInvoiceLine_draft_only" BEFORE INSERT OR UPDATE OR DELETE ON "CommercialInvoiceLine" FOR EACH ROW EXECUTE FUNCTION "protect_commercial_invoice_lines"();
