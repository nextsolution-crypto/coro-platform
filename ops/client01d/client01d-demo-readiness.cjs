'use strict';

const crypto = require('node:crypto');
const manifest = require('./client01d-demo-manifest.json');

const FLAG_NAMES = [
  'INCIDENT_REPORTS_ENABLED',
  'OPERATIONAL_LOG_ENABLED',
  'OPERATIONAL_SHIFTS_ENABLED',
  'OPERATIONAL_DIRECTIVES_ENABLED',
  'OPERATIONAL_FOLLOWUPS_ENABLED',
];

const fingerprint = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const number = (value) => Number(value ?? 0);

async function runReadOnly(prisma, environment = process.env) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const organizationRows = await tx.$queryRawUnsafe(`
      SELECT o.id, o.name, o."isActive", d.status, d."communicationMode", d."externalProvidersDisabled"
      FROM "Organization" o
      LEFT JOIN "DemoEnvironment" d ON d."organizationId" = o.id
      WHERE o.id = '${manifest.organizationId}'
    `);
    const fixtureRows = await tx.$queryRawUnsafe(`
      SELECT dfr."entityId", b.name, b."clientId", b."isActive"
      FROM "DemoFixtureRecord" dfr
      JOIN "Building" b ON b.id = dfr."entityId" AND b."organizationId" = dfr."organizationId"
      WHERE dfr."organizationId" = '${manifest.organizationId}'
        AND upper(dfr."entityType") = 'BUILDING' AND dfr.state = 'ACTIVE'
      ORDER BY dfr."entityId"
    `);
    const identityRows = await tx.$queryRawUnsafe(`
      SELECT cu.id, cu.email, cu."clientId", cu.role, cu."isActive",
        cardinality(cu."operationalPermissions") AS "permissionCount",
        COUNT(a.id) FILTER (WHERE a.status = 'ACTIVE' AND a."effectiveFrom" <= now()
          AND (a."effectiveUntil" IS NULL OR a."effectiveUntil" > now())) AS "activeAssignments",
        COUNT(DISTINCT fb.id) AS "fixtureBuildingsForClient"
      FROM "ClientUser" cu
      LEFT JOIN "ClientOperationalBuildingAssignment" a
        ON a."clientUserId" = cu.id AND a."organizationId" = cu."organizationId"
      LEFT JOIN "DemoFixtureRecord" dfr
        ON dfr."organizationId" = cu."organizationId" AND upper(dfr."entityType") = 'BUILDING'
        AND dfr.state = 'ACTIVE'
      LEFT JOIN "Building" fb
        ON fb.id = dfr."entityId" AND fb."organizationId" = dfr."organizationId"
        AND fb."clientId" = cu."clientId" AND fb."isActive" = true
      WHERE cu."organizationId" = '${manifest.organizationId}'
      GROUP BY cu.id, cu.email, cu."clientId", cu.role, cu."isActive", cu."operationalPermissions"
      ORDER BY cu.id
    `);
    const capabilityRows = await tx.$queryRawUnsafe(`
      SELECT c.code::text AS code, c.lifecycle::text AS lifecycle, c."isAvailable",
        COALESCE(bool_or(p.scope = 'SITE' AND p.status = 'ALLOWED'), false) AS "siteAllowed"
      FROM "CommercialCapability" c
      LEFT JOIN "CapabilityScopePolicy" p ON p."capabilityId" = c.id
      WHERE c.code::text = ANY (ARRAY[${manifest.features.map((v) => `'${v}'`).join(',')}])
      GROUP BY c.id, c.code, c.lifecycle, c."isAvailable"
      ORDER BY c.code
    `);
    const entitlementRows = await tx.$queryRawUnsafe(`
      SELECT e."organizationId", c.code::text AS code, e.scope::text AS scope, e."buildingId",
        r.lifecycle::text AS lifecycle, r.enabled, r."effectiveFrom", r."effectiveUntil"
      FROM "CapabilityEntitlement" e
      JOIN "CommercialCapability" c ON c.id = e."capabilityId"
      JOIN LATERAL (
        SELECT lifecycle, enabled, "effectiveFrom", "effectiveUntil"
        FROM "CapabilityEntitlementRevision" er WHERE er."entitlementId" = e.id
        ORDER BY er."versionNumber" DESC LIMIT 1
      ) r ON true
      WHERE c.code::text = ANY (ARRAY[${manifest.features.map((v) => `'${v}'`).join(',')}])
    `);
    const dataRows = await tx.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM "IncidentReportTemplateVersion" WHERE "organizationId" = '${manifest.organizationId}') AS templates,
        (SELECT COUNT(*) FROM "IncidentReport" WHERE "organizationId" = '${manifest.organizationId}') AS reports,
        (SELECT COUNT(*) FROM "OperationalLogEntry" WHERE "organizationId" = '${manifest.organizationId}') AS log_entries,
        (SELECT COUNT(*) FROM "OperationalShift" WHERE "organizationId" = '${manifest.organizationId}') AS shifts,
        (SELECT COUNT(*) FROM "OperationalDirective" WHERE "organizationId" = '${manifest.organizationId}') AS directives,
        (SELECT COUNT(*) FROM "OperationalFollowUp" WHERE "organizationId" = '${manifest.organizationId}') AS followups
    `);

    const organization = organizationRows[0] ?? null;
    const flags = Object.fromEntries(FLAG_NAMES.map((name) => [name, environment[name] === 'true']));
    const now = Date.now();
    const effective = (row) => row.scope === 'SITE' && row.lifecycle === 'GRANTED' && row.enabled === true
      && new Date(row.effectiveFrom).getTime() <= now
      && (row.effectiveUntil == null || new Date(row.effectiveUntil).getTime() > now);
    const activeTargetEntitlements = entitlementRows.filter((row) =>
      row.organizationId === manifest.organizationId && effective(row),
    ).length;
    const activeOtherTenantEntitlements = entitlementRows.filter((row) =>
      row.organizationId !== manifest.organizationId && effective(row),
    ).length;
    const data = dataRows[0] ?? {};
    const preconditions = {
      canonicalTenant: organization?.id === manifest.organizationId && organization?.name === 'CORO Démo',
      demoSafety: organization?.status === 'ACTIVE' && organization?.communicationMode === 'SIMULATE' && organization?.externalProvidersDisabled === true,
      threeFixtureBuildings: fixtureRows.length >= 3,
      sixClientUsersAvailable: identityRows.length === 6,
      identitiesBoundToFixtureClients: identityRows.every((row) => number(row.fixtureBuildingsForClient) > 0),
      identitiesUseControlledAliasDomain: identityRows.every((row) => String(row.email).toLowerCase().endsWith('@getcoro.io')),
      sixCapabilitiesSiteReady: capabilityRows.length === 6 && capabilityRows.every((row) => row.isAvailable === true && row.siteAllowed === true),
      flagsDisabled: Object.values(flags).every((value) => value === false),
      noCrossTenantEntitlement: activeOtherTenantEntitlements === 0,
    };
    return {
      schemaVersion: 1,
      execution: 'PASS',
      readOnly: true,
      organization: organization ? { id: organization.id, name: organization.name, active: organization.isActive } : null,
      demoSafety: organization ? { status: organization.status, communicationMode: organization.communicationMode, externalProvidersDisabled: organization.externalProvidersDisabled } : null,
      fixtureBuildings: fixtureRows.map((row) => ({ fingerprint: fingerprint(row.entityId), active: row.isActive === true })),
      identities: identityRows.map((row) => ({
        fingerprint: fingerprint(row.id),
        emailFingerprint: fingerprint(String(row.email).toLowerCase()),
        clientFingerprint: fingerprint(row.clientId),
        role: row.role,
        active: row.isActive === true,
        permissionCount: number(row.permissionCount),
        activeAssignments: number(row.activeAssignments),
        fixtureBuildingsForClient: number(row.fixtureBuildingsForClient),
      })),
      capabilities: capabilityRows,
      flags,
      entitlements: { activeTarget: activeTargetEntitlements, activeOtherTenants: activeOtherTenantEntitlements },
      datasets: { templates: number(data.templates), reports: number(data.reports), logEntries: number(data.log_entries), shifts: number(data.shifts), directives: number(data.directives), followups: number(data.followups) },
      preconditions,
      activationReady: Object.values(preconditions).every(Boolean) && activeTargetEntitlements === 0,
      mutationExecuted: false,
    };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.CORO_DEMO_REPORT_READINESS_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await runReadOnly(prisma))}\n`); }
  finally { await prisma.$disconnect(); }
}

module.exports = { FLAG_NAMES, fingerprint, runReadOnly };
if (require.main === module) main().catch(() => { process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n'); process.exitCode = 1; });
