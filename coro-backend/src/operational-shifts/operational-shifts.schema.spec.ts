import { readFileSync } from 'fs';
import { join } from 'path';

describe('INC-RP-02B governed schema', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261217010000_operational_shifts_handover/migration.sql',
    ),
    'utf8',
  );

  it('keeps shift permissions distinct from Sentinelle and the operational log', () => {
    for (const permission of [
      'OPERATIONAL_SHIFT_READ',
      'OPERATIONAL_SHIFT_OPEN',
      'OPERATIONAL_SHIFT_EDIT_OWN',
      'OPERATIONAL_HANDOVER_PREPARE',
      'OPERATIONAL_HANDOVER_ACKNOWLEDGE',
      'OPERATIONAL_SHIFT_SUPERVISE',
      'OPERATIONAL_SHIFT_EXCEPTION_CLOSE',
      'OPERATIONAL_SHIFT_ADMIN',
    ])
      expect(schema).toContain(permission);
  });

  it('uses composite tenant foreign keys and append-only evidence', () => {
    expect(migration).toContain('"buildingId", "organizationId"');
    expect(migration).toContain('"actorUserId", "organizationId"');
    expect(migration).toContain('OperationalShiftHistory_append_only');
    expect(migration).toContain('OperationalHandoverAction_append_only');
    expect(migration).toContain('OperationalHandover_snapshot_immutable');
  });

  it('preserves authored log entries while associating them to a shift', () => {
    expect(schema).toContain('authorUserId');
    expect(schema).toContain('shiftId                String?');
    expect(migration).toContain('ADD COLUMN "shiftId" TEXT');
    expect(migration).not.toContain('DROP COLUMN');
  });
});
