import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 2A schema and seed contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20260929150000_super_admin_v2_phase_2a_commercial_catalog/migration.sql',
    ),
    'utf8',
  );
  const codes = [
    'COMPLIANCE_OPERATIONS',
    'PERFORMANCE',
    'INCIDENT',
    'KNOWLEDGE',
    'AI',
    'NETWORK',
    'SENTINELLE',
    'SENTINELLE_POPULATION',
    'CAMPUS',
  ];
  it('conserve licenseType et ajoute une relation nullable sans défaut', () => {
    expect(schema).toContain(
      'licenseType            String                  @default("ESSAI_GRATUIT")',
    );
    expect(schema).toContain('commercialRelationship CommercialRelationship?');
  });
  it('déclare exactement les neuf codes commerciaux et aucune capability interdite', () => {
    const block = schema.match(/enum CapabilityCode \{([\s\S]*?)\}/)?.[1] ?? '';
    expect(codes.every((code) => block.includes(code))).toBe(true);
    expect(block).not.toMatch(/BOOKING|PLANNER|DOCUMENTS|PROJECTS/);
    expect(block.split('\n').filter((line) => line.trim())).toHaveLength(9);
  });
  it('seed neuf capabilities, 27 policies, aucun PriceBook et aucun prix', () => {
    const capabilityValues =
      migration.match(/INSERT INTO "CommercialCapability"[\s\S]*?;\n/)?.[0] ??
      '';
    expect(capabilityValues.match(/gen_random_uuid/g) ?? []).toHaveLength(9);
    const policyValues =
      migration.match(/JOIN \(VALUES([\s\S]*?)\) AS p/)?.[1] ?? '';
    expect(
      policyValues.match(/\('[A-Z_]+','(?:ORGANIZATION|CLIENT|SITE)'/g) ?? [],
    ).toHaveLength(27);
    expect(migration).not.toMatch(/INSERT INTO "PriceBook"/);
    expect(migration).not.toMatch(/\b(17500|24900|59900|79900)\b/);
    expect(policyValues).toContain("('CAMPUS','CLIENT','UNDECIDED')");
  });
});
