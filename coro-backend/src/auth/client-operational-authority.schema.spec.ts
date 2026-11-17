import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CLIENT-01A schema', () => {
  const root = join(__dirname, '..', '..');
  const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma',
      'migrations',
      '20261218010000_client_operational_authority',
      'migration.sql',
    ),
    'utf8',
  );

  it('keeps portal authority distinct from internal platform grants', () => {
    expect(schema).toContain('enum ClientOperationalPermission');
    expect(schema).toContain(
      'operationalPermissions        ClientOperationalPermission[]',
    );
    expect(migration).not.toContain('INSERT INTO "PlatformPermissionGrant"');
    expect(migration).not.toContain('UPDATE "ClientUser"');
  });

  it('enforces tenant-consistent ClientUser and building assignments', () => {
    expect(migration).toContain(
      'FOREIGN KEY ("clientUserId", "organizationId") REFERENCES "ClientUser"("id", "organizationId")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId")',
    );
    expect(migration).toContain(
      '"ClientOperationalBuildingAssignment_revocation_check"',
    );
  });
});
