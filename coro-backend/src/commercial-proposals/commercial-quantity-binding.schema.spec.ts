import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 3D foundation schema contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261003010000_super_admin_v2_phase_3d_commercial_quantity_binding/migration.sql',
    ),
    'utf8',
  );

  it('adds only the nullable commercial quantity binding triplet', () => {
    expect(schema).toContain('enum CommercialQuantityBasis');
    expect(
      schema.match(/commercialQuantityBasis CommercialQuantityBasis\?/g),
    ).toHaveLength(2);
    expect(
      schema.match(/commercialRuleCode\s+String\?\s+@db\.VarChar\(100\)/g),
    ).toHaveLength(2);
    expect(
      schema.match(/commercialRuleVersion\s+String\?\s+@db\.VarChar\(50\)/g),
    ).toHaveLength(2);
    expect(migration).not.toMatch(
      /\b(?:INSERT\s+INTO|UPDATE\s+"|DELETE\s+FROM)/i,
    );
    expect(migration).not.toContain('CommercialUsageEvaluation');
  });

  it('protects valid binding shapes and contract organization ancestry', () => {
    expect(migration).toContain(
      'ProposalLine_commercial_quantity_binding_check',
    );
    expect(migration).toContain(
      'ContractPriceSnapshotLine_commercial_quantity_binding_check',
    );
    expect(migration).toContain("~ '^[A-Z][A-Z0-9_]{0,99}$'");
    expect(migration).toContain(
      'OrganizationContract_organization_ancestry_immutable',
    );
    expect(migration).toContain('EXISTS (');
    expect(migration).toContain('OrganizationContractRevision');
  });
});
