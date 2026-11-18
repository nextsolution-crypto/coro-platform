import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CLIENT-01D entitlement migrations', () => {
  const enumMigration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261220010000_client_feature_entitlements/migration.sql',
    ),
    'utf8',
  );
  const catalogMigration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261220020000_client_feature_entitlement_catalog/migration.sql',
    ),
    'utf8',
  );

  it('separates PostgreSQL enum expansion from use of the new values', () => {
    expect(enumMigration).toContain(
      "ADD VALUE IF NOT EXISTS 'INCIDENT_REPORTS'",
    );
    expect(enumMigration).not.toContain('INSERT INTO "CommercialCapability"');
    expect(catalogMigration).toContain('INSERT INTO "CommercialCapability"');
  });

  it('creates six site-scoped capabilities without granting an entitlement', () => {
    for (const code of [
      'INCIDENT_REPORTS',
      'OPERATIONAL_LOG',
      'OPERATIONAL_SHIFTS',
      'OPERATIONAL_DIRECTIVES',
      'OPERATIONAL_FOLLOWUPS',
      'SECURITY_WORKSTATION',
    ]) {
      expect(enumMigration).toContain(code);
      expect(catalogMigration).toContain(code);
    }
    expect(catalogMigration).not.toContain(
      'INSERT INTO "CapabilityEntitlement"',
    );
    expect(catalogMigration).toContain("scope.value = 'SITE'");
  });
});
