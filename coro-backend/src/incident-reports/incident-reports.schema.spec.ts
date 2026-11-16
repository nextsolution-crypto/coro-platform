import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(
  join(
    root,
    'prisma',
    'migrations',
    '20261208010000_incident_report_foundations',
    'migration.sql',
  ),
  'utf8',
);

describe('INC-RP-01 foundation contract', () => {
  it.each([
    'IncidentReport',
    'IncidentReportVersion',
    'IncidentReportTemplateVersion',
    'IncidentReportAttachment',
    'IncidentReportApproval',
    'IncidentReportExport',
    'ExternalSourceReference',
    'IncidentReportRetentionPolicy',
    'IncidentReportAuditEvent',
  ])('declares model %s', (name) => {
    expect(schema).toContain(`model ${name} {`);
    expect(migration).toContain(`CREATE TABLE "${name}"`);
  });

  it.each([
    'INCIDENT_REPORT_READ',
    'INCIDENT_REPORT_CREATE',
    'INCIDENT_REPORT_EDIT',
    'INCIDENT_REPORT_REVIEW',
    'INCIDENT_REPORT_APPROVE',
    'INCIDENT_REPORT_EXPORT',
    'INCIDENT_REPORT_ADMIN',
  ])('adds permission %s without implicit grants', (permission) => {
    expect(schema).toContain(permission);
    expect(migration).toContain(`ADD VALUE IF NOT EXISTS '${permission}'`);
    expect(migration).not.toMatch(
      new RegExp(`INSERT[\\s\\S]{0,200}${permission}`),
    );
  });

  it('enforces tenant-composite references for the primary aggregate', () => {
    expect(migration).toContain(
      'FOREIGN KEY ("buildingId","organizationId") REFERENCES "Building"("id","organizationId")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("incidentEventId","organizationId") REFERENCES "IncidentEvent"("id","organizationId")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("reportId","organizationId") REFERENCES "IncidentReport"("id","organizationId")',
    );
  });

  it('protects submitted version content at database level', () => {
    expect(migration).toContain('incident_report_version_immutable_guard');
    expect(migration).toContain(
      "RAISE EXCEPTION 'incident report version is immutable'",
    );
  });

  it('stores extensible schemas and lossless legacy payloads as JSON', () => {
    expect(schema).toMatch(/formSchema\s+Json/);
    expect(schema).toMatch(/fieldCatalog\s+Json/);
    expect(schema).toMatch(/legacyPayload\s+Json\?/);
    expect(schema).toMatch(/originalValue\s+Json\?/);
  });
});
