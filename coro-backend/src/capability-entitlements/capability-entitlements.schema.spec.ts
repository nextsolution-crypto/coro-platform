import { readFileSync } from 'fs';
import { join } from 'path';
describe('Phase 2C schema and API contract', () => {
  const root = join(__dirname, '../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260930010000_super_admin_v2_phase_2c_capability_entitlements/migration.sql',
    ),
    'utf8',
  );
  const controller = readFileSync(
    join(__dirname, 'capability-entitlements.controller.ts'),
    'utf8',
  );
  const resolver = readFileSync(
    join(__dirname, 'entitlement-resolver.service.ts'),
    'utf8',
  );
  it('defines exactly three entitlement models and never stores licensed', () => {
    expect(
      [
        'CapabilityEntitlement',
        'CapabilityEntitlementRevision',
        'CapabilityEntitlementLimit',
      ].every((x) => schema.includes(`model ${x} {`)),
    ).toBe(true);
    expect(schema).not.toMatch(/\blicensed\s+Boolean/);
  });
  it('is additive, append-only and creates no entitlement', () => {
    expect(migration).not.toMatch(
      /INSERT INTO "CapabilityEntitlement"|\bDROP\b/,
    );
    expect(migration).toContain('capability_entitlement_revision_append_only');
    expect(migration).toContain('capability_entitlement_immutable');
  });
  it('exposes SUPER_ADMIN APIs without DELETE or enforcement', () => {
    expect(controller).toContain('@SuperAdminOnly()');
    expect(controller).not.toContain('@Delete');
    expect(`${controller}\n${resolver}`).not.toMatch(
      /EntitlementGuard|ENFORCE/,
    );
  });
  it('uses effectiveFrom and asKnownAt without source priority or limit merge', () => {
    expect(resolver).toContain('effectiveFrom: { lte: at }');
    expect(resolver).toContain('recordedAt: { lte: input.asKnownAt }');
    expect(resolver).not.toMatch(/priority|Math\.max|reduce\(/i);
  });
});
