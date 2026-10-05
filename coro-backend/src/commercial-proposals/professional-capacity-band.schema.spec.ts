import { readFileSync } from 'fs';
import { join } from 'path';

describe('Professional capacity-band schema contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261012010000_professional_capacity_band_pricing/migration.sql',
    ),
    'utf8',
  );

  it('adds only the generic model and nullable exact monthly equivalent', () => {
    expect(schema.match(/enum PricingModel \{[\s\S]*?\}/)?.[0]).toContain(
      'CAPACITY_BAND',
    );
    expect(schema).toMatch(/monthlyRecurringEquivalentMinor\s+BigInt\?/);
    expect(migration).toContain(
      `ALTER TYPE "PricingModel" ADD VALUE 'CAPACITY_BAND'`,
    );
    expect(migration).toContain('DROP NOT NULL');
  });

  it('contains no data mutation, seed, price or commercial instance', () => {
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|DROP TABLE)\b/i);
    expect(migration).not.toMatch(/PriceBook|CostAssumption|ProposalLine/);
    expect(migration).not.toMatch(
      /4500|7500|9500|11500|13500|15500|17500|19000|21000|22500/,
    );
  });
});
