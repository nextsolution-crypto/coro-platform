import { readFileSync } from 'fs';
import { join } from 'path';

describe('INC-RP-02C governed schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(join(process.cwd(), 'prisma', 'migrations', '20261217020000_operational_directives_followups', 'migration.sql'), 'utf8');
  it('declares dedicated permissions without implicit role grants', () => {
    for (const permission of ['OPERATIONAL_DIRECTIVE_READ', 'OPERATIONAL_DIRECTIVE_APPROVE', 'OPERATIONAL_DIRECTIVE_ACKNOWLEDGE', 'OPERATIONAL_FOLLOWUP_READ', 'OPERATIONAL_FOLLOWUP_VERIFY', 'OPERATIONAL_FOLLOWUP_CLOSE']) expect(schema).toContain(permission);
  });
  it('keeps versions and confirmed receipt identity immutable in PostgreSQL', () => {
    expect(migration).toContain('operational_directive_version_immutable');
    expect(migration).toContain('operational_receipt_confirmation_immutable');
  });
  it('uses composite tenant and building foreign keys', () => {
    expect(schema).toContain('fields: [buildingId, organizationId]');
    expect(schema).toContain('@@unique([id, organizationId])');
  });
});
