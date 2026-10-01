import { readFileSync } from 'fs';
import { join } from 'path';

describe('C2 commercial revenue category schema contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261006010000_commercial_revenue_category/migration.sql',
    ),
    'utf8',
  );

  it('defines exactly the approved taxonomy and preserves nullable legacy rows', () => {
    const enumBody = schema.match(
      /enum CommercialRevenueCategory \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(enumBody?.match(/\b[A-Z][A-Z_]+\b/g)).toEqual([
      'SAAS',
      'PROFESSIONAL_SERVICE',
      'IMPLEMENTATION',
      'OTHER_RECURRING',
      'OTHER_ONE_TIME',
    ]);
    for (const model of [
      'PriceComponent',
      'CommercialSimulationScenarioLine',
      'CommercialSimulationRunLine',
      'ProposalLine',
      'ContractPriceSnapshotLine',
      'ContractPricingAdjustment',
    ]) {
      const body = schema.match(
        new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`),
      )?.[0];
      expect(body).toMatch(/revenueCategory\s+CommercialRevenueCategory\?/);
    }
  });

  it('is additive and contains no business DML, default, seed, or backfill', () => {
    expect(migration.match(/ADD COLUMN/g)).toHaveLength(6);
    expect(migration).not.toMatch(/\b(?:DROP|INSERT|UPDATE|DELETE|DEFAULT)\b/i);
  });
});
