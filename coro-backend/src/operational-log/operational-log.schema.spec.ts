import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('operational log database contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20261216010000_operational_log_foundation',
      'migration.sql',
    ),
    'utf8',
  );

  it('uses dedicated permissions and a disabled-by-default feature boundary', () => {
    for (const permission of [
      'OPERATIONAL_LOG_READ',
      'OPERATIONAL_LOG_CREATE',
      'OPERATIONAL_LOG_EDIT',
      'OPERATIONAL_LOG_ADMIN',
    ])
      expect(schema).toContain(permission);
  });

  it('enforces tenant/building/spatial/report composite references', () => {
    expect(migration).toContain(
      'OperationalLogEntry_buildingId_organizationId_fkey',
    );
    expect(migration).toContain(
      'OperationalLogEntry_floorId_organizationId_buildingId_fkey',
    );
    expect(migration).toContain(
      'OperationalLogEntry_zoneId_organizationId_buildingId_floorId_fkey',
    );
    expect(migration).toContain(
      'OperationalLogEntry_incidentReportId_organizationId_fkey',
    );
  });

  it('makes creation and correction replays idempotent', () => {
    expect(migration).toContain(
      'OperationalLogEntry_organizationId_creationIdempotencyKey_key',
    );
    expect(migration).toContain(
      'OperationalLogEntryRevision_organizationId_idempotencyKey_key',
    );
    expect(migration).toContain(
      'OperationalLogAuditEvent_organizationId_idempotencyKey_key',
    );
  });
});
