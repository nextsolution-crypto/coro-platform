'use strict';

const crypto = require('node:crypto');

const TARGET_ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const ALIASES = Object.freeze([
  { key: 'OPERATOR', email: 'demo-member@getcoro.io', expectedKind: 'INTERNAL_USER', expectedRole: 'OPERATOR' },
  { key: 'CLIENT_CORPORATE', email: 'demo-clientcorp@getcoro.io', expectedKind: 'CLIENT_USER', expectedRole: 'CLIENT_CORPORATE' },
  { key: 'CLIENT_MANAGER', email: 'demo-client@getcoro.io', expectedKind: 'CLIENT_USER', expectedRole: 'CLIENT_MANAGER' },
]);

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function summarizeInternal(alias, user) {
  if (!user) return null;
  return {
    kind: 'INTERNAL_USER',
    identityFingerprint: fingerprint(user.id),
    organizationFingerprint: fingerprint(user.organizationId),
    organizationName: user.organization.name,
    organizationMatchesTarget: user.organizationId === TARGET_ORGANIZATION_ID,
    organizationActive: user.organization.isActive === true,
    role: user.role,
    active: user.isActive === true,
    assignmentCounts: {
      ownedProjects: user._count.projects,
      bookingAssignments: user._count.bookingAssignments,
      projectAdvisorEligibilities: user._count.projectAdvisorEligibilities,
    },
    matchesExpectedAuthority: alias.expectedKind === 'INTERNAL_USER' && user.role === alias.expectedRole,
  };
}

function summarizeClient(alias, user) {
  if (!user) return null;
  return {
    kind: 'CLIENT_USER',
    identityFingerprint: fingerprint(user.id),
    organizationFingerprint: fingerprint(user.organizationId),
    organizationName: user.organization.name,
    organizationMatchesTarget: user.organizationId === TARGET_ORGANIZATION_ID,
    organizationActive: user.organization.isActive === true,
    clientFingerprint: fingerprint(user.clientId),
    clientName: user.client.name,
    clientActive: user.client.isActive === true,
    role: user.role,
    active: user.isActive === true,
    assignedBuildingCount: user.buildingIds.length,
    assignedBuildingFingerprints: user.buildingIds.map(fingerprint).sort(),
    incidentPermissionCount: user.incidentPermissions.length,
    populationPermissionCount: user.populationPermissions.length,
    operationalReviewPermissionCount: user.operationalReviewPermissions.length,
    correctiveActionPermissionCount: user.correctiveActionPermissions.length,
    matchesExpectedAuthority: alias.expectedKind === 'CLIENT_USER' && user.role === alias.expectedRole,
  };
}

async function inspectAlias(tx, alias) {
  const [internal, client] = await Promise.all([
    tx.user.findUnique({
      where: { email: alias.email },
      select: {
        id: true, role: true, isActive: true, organizationId: true,
        organization: { select: { name: true, isActive: true } },
        _count: { select: { projects: true, bookingAssignments: true, projectAdvisorEligibilities: true } },
      },
    }),
    tx.clientUser.findUnique({
      where: { email: alias.email },
      select: {
        id: true, role: true, isActive: true, organizationId: true, clientId: true,
        buildingIds: true, incidentPermissions: true, populationPermissions: true,
        operationalReviewPermissions: true, correctiveActionPermissions: true,
        organization: { select: { name: true, isActive: true } },
        client: { select: { name: true, isActive: true } },
      },
    }),
  ]);
  const identities = [summarizeInternal(alias, internal), summarizeClient(alias, client)].filter(Boolean);
  return {
    alias: alias.key,
    emailFingerprint: fingerprint(alias.email),
    expectedKind: alias.expectedKind,
    expectedRole: alias.expectedRole,
    identityCount: identities.length,
    identities,
    creationDisposition:
      identities.length === 0
        ? 'AVAILABLE_FOR_GOVERNED_CREATION'
        : identities.length === 1 && identities[0].organizationMatchesTarget && identities[0].matchesExpectedAuthority
          ? 'EXISTS_COMPATIBLE_REVIEW_REQUIRED_NO_AUTOMATIC_CHANGE'
          : 'COLLISION_STOP_NO_AUTOMATIC_CHANGE',
  };
}

async function runReadOnly(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const organization = await tx.organization.findUnique({
      where: { id: TARGET_ORGANIZATION_ID },
      select: { id: true, name: true, isActive: true, isInternal: true },
    });
    const aliases = [];
    for (const alias of ALIASES) aliases.push(await inspectAlias(tx, alias));
    const collisionCount = aliases.filter((entry) => entry.creationDisposition === 'COLLISION_STOP_NO_AUTOMATIC_CHANGE').length;
    return {
      schemaVersion: 1,
      execution: 'PASS',
      readOnly: true,
      targetOrganization: organization ? {
        fingerprint: fingerprint(organization.id),
        name: organization.name,
        active: organization.isActive === true,
        internal: organization.isInternal === true,
      } : null,
      aliases,
      collisionCount,
      creationAuthorizedByInventory: Boolean(organization?.isActive) && organization.isInternal === false && collisionCount === 0,
    };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.CORO_DEMO_ACCOUNT_ALIAS_INVENTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await runReadOnly(prisma))}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { ALIASES, TARGET_ORGANIZATION_ID, fingerprint, inspectAlias, runReadOnly };

if (require.main === module || process.env.CORO_DEMO_ACCOUNT_ALIAS_INVENTORY_RUN === 'true') {
  main().catch(() => {
    process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n');
    process.exitCode = 1;
  });
}
