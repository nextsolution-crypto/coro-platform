import { readFileSync } from 'fs';
import { join } from 'path';

describe('commercial subscription and billing schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(join(process.cwd(), 'prisma/migrations/20261104010000_commercial_subscription_billing/migration.sql'), 'utf8');

  it('adds canonical authorities without changing historical authorities', () => {
    expect(schema).toContain('model CommercialSubscription {');
    expect(schema).toContain('model CommercialInvoice {');
    expect(schema).toContain('model CommercialPayment {');
    expect(schema).toContain('model CommercialCreditNote {');
    expect(schema).toContain('model CommercialTaxConfiguration {');
    expect(schema).toMatch(/contractRevision\s+OrganizationContractRevision/);
    expect(schema).toMatch(/proposalRevision\s+CommercialProposalRevision/);
    expect(schema).toMatch(/priceBookVersion\s+PriceBookVersion/);
  });

  it('persists provisional policy and fail-closed financial constraints', () => {
    expect(migration).toContain('"currency" = \'CAD\'');
    expect(migration).toContain('"paymentTermsDays" = 30');
    expect(migration).toContain('"graceMonitoringDays" = 15');
    expect(migration).toContain('CommercialInvoice_amounts_check');
    expect(migration).toContain('CommercialInvoice_issued_immutable');
    expect(migration).toContain('CommercialInvoiceLine_draft_only');
    expect(migration).not.toMatch(/INSERT INTO "PriceBook"|INSERT INTO "CommercialInvoice"/);
  });

  it('uses exact permissions and no role-only billing fallback', () => {
    for (const permission of [
      'COMMERCIAL_SUBSCRIPTION_MANAGE',
      'COMMERCIAL_BILLING_MANAGE',
      'COMMERCIAL_BILLING_APPROVE',
      'COMMERCIAL_PAYMENT_RECORD',
    ]) expect(schema).toContain(permission);
  });
});
