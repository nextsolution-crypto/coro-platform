import { readFileSync } from 'fs';
import { join } from 'path';
describe('Phase 2B contract schema', () => {
  const root = join(__dirname, '../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260929230000_super_admin_v2_phase_2b_organization_contracts/migration.sql',
    ),
    'utf8',
  );
  const service = readFileSync(
    join(root, 'src/organization-contracts/organization-contracts.service.ts'),
    'utf8',
  );
  it('defines exactly the ten approved contract models', () => {
    const names = [
      'OrganizationContract',
      'OrganizationContractRevision',
      'ContractPricingAdjustment',
      'ContractPriceSnapshotLine',
      'ContractPriceSnapshotTier',
      'ContractExclusivity',
      'ContractExclusivitySector',
      'ContractExclusivityCapability',
      'ContractMinimumCommitment',
      'OrganizationContractDocument',
    ];
    expect(names.every((n) => schema.includes(`model ${n} {`))).toBe(true);
    expect(schema).not.toContain('model ContractAmendment {');
  });
  it('keeps exclusivity fee capability nullable and enforces adjustment matrix', () => {
    expect(schema).toMatch(
      /model ContractPriceSnapshotLine[\s\S]*?capabilityId\s+String\?/,
    );
    expect(migration).toContain('ContractAdjustment_matrix_check');
    expect(migration).toContain("'EXCLUSIVITY_FEE'");
  });
  it('is additive and seeds no contracts or entitlements', () => {
    expect(migration).not.toMatch(/INSERT INTO "OrganizationContract"/);
    expect(migration).not.toMatch(/\bDROP\b/);
    expect(`${schema}\n${migration}`).not.toMatch(
      /model Entitlement|CREATE TABLE "Entitlement"/,
    );
  });
  it('protects signed history and one primary active contract', () => {
    expect(migration).toContain('OrganizationContract_one_primary_active');
    expect(migration).toContain('ContractRevision_history_immutable');
    expect(migration).toContain('contract_document_immutable');
  });
  it('serializes critical organization mutations and checks optimistic locks', () => {
    expect(
      service.match(/pg_advisory_xact_lock\(hashtextextended/g) ?? [],
    ).toHaveLength(2);
    expect(service).toContain('organizationId: o, lockVersion: d.lockVersion');
    expect(service).toContain(
      "id: rid, lockVersion: d.lockVersion, status: 'APPROVED'",
    );
    expect(service).toContain(
      "throw new ConflictException('Conflit de signature.')",
    );
  });
});
