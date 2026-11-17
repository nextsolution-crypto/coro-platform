import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('INC-RP-01 Lot 5 export schema', () => {
  const root = join(__dirname, '..', '..');
  const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma',
      'migrations',
      '20261215010000_incident_report_probative_exports',
      'migration.sql',
    ),
    'utf8',
  );
  it('adds format, locale, and durable idempotency without destructive changes', () => {
    expect(schema).toMatch(/pageFormat\s+String\s+@default\("LETTER"\)/);
    expect(schema).toMatch(/locale\s+String\s+@default\("fr-CA"\)/);
    expect(schema).toContain(
      '@@unique([organizationId, requestIdempotencyKey])',
    );
    expect(migration).toContain(
      'IncidentReportExport_organizationId_requestIdempotencyKey_key',
    );
    expect(migration).toContain('IncidentReportExport_pageFormat_check');
    expect(migration).toContain('IncidentReportExport_locale_check');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
