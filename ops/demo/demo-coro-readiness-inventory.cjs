'use strict';

const crypto = require('node:crypto');

const TARGET_EMAIL = 'demo@getcoro.io';
const TARGET_ORGANIZATION_NAME = 'CORO Démo';
const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const EXPECTED_PROJECT_NAMES = [
  'PMU — Tour Prémont 2026',
  'PCA — Tour Prémont 2026',
];

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeName(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('fr-CA');
}

function summarizeIdentity(kind, identity) {
  if (!identity) return null;
  const organization = identity.organization;
  return {
    kind,
    identityFingerprint: fingerprint(identity.id),
    role: identity.role,
    active: identity.isActive === true,
    organizationFingerprint: fingerprint(identity.organizationId),
    organizationNameMatchesTarget:
      normalizeName(organization.name) === normalizeName(TARGET_ORGANIZATION_NAME),
    organizationActive: organization.isActive === true,
    organizationInternal: organization.isInternal === true,
    ...(kind === 'CLIENT_USER'
      ? {
          clientFingerprint: fingerprint(identity.clientId),
          clientActive: identity.client.isActive === true,
          assignedBuildingCount: identity.buildingIds.length,
          incidentPermissionCount: identity.incidentPermissions.length,
          populationPermissionCount: identity.populationPermissions.length,
        }
      : {}),
  };
}

async function countTenantData(tx, organizationId) {
  const [users, clientUsers, clients, buildings, projects, files, bookings, incidents, exercises, actions] =
    await Promise.all([
      tx.user.count({ where: { organizationId } }),
      tx.clientUser.count({ where: { organizationId } }),
      tx.client.count({ where: { organizationId } }),
      tx.building.count({ where: { organizationId } }),
      tx.project.count({ where: { organizationId } }),
      tx.projectFile.count({ where: { organizationId } }),
      tx.booking.count({ where: { organizationId } }),
      tx.incidentEvent.count({ where: { organizationId } }),
      tx.exerciseReport.count({ where: { organizationId } }),
      tx.correctiveAction.count({ where: { organizationId } }),
    ]);
  return { users, clientUsers, clients, buildings, projects, files, bookings, incidents, exercises, actions };
}

async function runReadOnly(prisma) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [user, clientUser] = await Promise.all([
        tx.user.findUnique({
          where: { email: TARGET_EMAIL },
          select: {
            id: true,
            role: true,
            isActive: true,
            organizationId: true,
            organization: { select: { name: true, isActive: true, isInternal: true } },
          },
        }),
        tx.clientUser.findUnique({
          where: { email: TARGET_EMAIL },
          select: {
            id: true,
            role: true,
            isActive: true,
            organizationId: true,
            clientId: true,
            buildingIds: true,
            incidentPermissions: true,
            populationPermissions: true,
            organization: { select: { name: true, isActive: true, isInternal: true } },
            client: { select: { isActive: true } },
          },
        }),
      ]);
      const identities = [summarizeIdentity('INTERNAL_USER', user), summarizeIdentity('CLIENT_USER', clientUser)].filter(Boolean);
      const organizationIds = [...new Set([user?.organizationId, clientUser?.organizationId].filter(Boolean))];
      const tenantData = organizationIds.length === 1
        ? await countTenantData(tx, organizationIds[0])
        : null;
      const canonicalOrganization = organizationIds.length === 1
        ? await tx.organization.findUnique({
            where: { id: organizationIds[0] },
            select: { id: true, name: true },
          })
        : null;
      const matchingProjects = organizationIds.length === 1
        ? await tx.project.findMany({
            where: { name: { in: EXPECTED_PROJECT_NAMES } },
            select: {
              name: true,
              organizationId: true,
              client: { select: { name: true, organizationId: true } },
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          })
        : [];
      const projectOwnership = EXPECTED_PROJECT_NAMES.map((name) => {
        const candidates = matchingProjects.filter((project) => project.name === name);
        const targetMatches = candidates.filter(
          (project) =>
            project.organizationId === organizationIds[0] &&
            project.client.organizationId === organizationIds[0],
        );
        return {
          name,
          matchingRows: candidates.length,
          targetTenantRows: targetMatches.length,
          belongsToTargetOrganization: targetMatches.length === 1,
          clientNames: [...new Set(targetMatches.map((project) => project.client.name))],
        };
      });
      const isolatedTarget =
        identities.length === 1 &&
        organizationIds.length === 1 &&
        identities[0].organizationNameMatchesTarget === true &&
        organizationIds[0] === TARGET_ORGANIZATION_ID &&
        identities[0].organizationActive === true &&
        identities[0].organizationInternal === false;

      return {
        schemaVersion: 1,
        execution: 'PASS',
        readOnly: true,
        targetEmailFingerprint: fingerprint(TARGET_EMAIL),
        targetOrganizationNameFingerprint: fingerprint(normalizeName(TARGET_ORGANIZATION_NAME)),
        identityCount: identities.length,
        identityKinds: identities.map((entry) => entry.kind),
        identities,
        singleOrganization: organizationIds.length === 1,
        canonicalOrganization,
        projectOwnership,
        tenantData,
        decision: isolatedTarget ? 'TARGET_VERIFIED_ISOLATED_DEMO' : 'TARGET_NOT_VERIFIED_NO_WRITES',
      };
    },
    { timeout: 60_000 },
  );
}

async function main() {
  if (process.env.CORO_DEMO_READINESS_INVENTORY_RUN !== 'true') {
    throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  }
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await runReadOnly(prisma))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  TARGET_EMAIL,
  TARGET_ORGANIZATION_NAME,
  TARGET_ORGANIZATION_ID,
  EXPECTED_PROJECT_NAMES,
  fingerprint,
  normalizeName,
  runReadOnly,
  summarizeIdentity,
};

if (require.main === module || process.env.CORO_DEMO_READINESS_INVENTORY_RUN === 'true') {
  main().catch(() => {
    process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n');
    process.exitCode = 1;
  });
}
