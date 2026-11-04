'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  TARGET_EMAIL,
  TARGET_ORGANIZATION_ID,
  runReadOnly,
  summarizeIdentity,
} = require('./demo-coro-readiness-inventory.cjs');

const organization = { name: 'CORO Démo', isActive: true, isInternal: false };

function createPrisma({ user = null, clientUser = null } = {}) {
  let transactionStatement = '';
  const counts = {
    user: 2,
    clientUser: 3,
    client: 3,
    building: 6,
    project: 12,
    projectFile: 8,
    booking: 5,
    incidentEvent: 4,
    exerciseReport: 2,
    correctiveAction: 7,
  };
  const tx = {
    $executeRawUnsafe: async (statement) => { transactionStatement = statement; },
    user: { findUnique: async ({ where }) => (where.email === TARGET_EMAIL ? user : null), count: async () => counts.user },
    clientUser: { findUnique: async ({ where }) => (where.email === TARGET_EMAIL ? clientUser : null), count: async () => counts.clientUser },
    client: { count: async () => counts.client },
    building: { count: async () => counts.building },
    project: { count: async () => counts.project },
    projectFile: { count: async () => counts.projectFile },
    booking: { count: async () => counts.booking },
    incidentEvent: { count: async () => counts.incidentEvent },
    exerciseReport: { count: async () => counts.exerciseReport },
    correctiveAction: { count: async () => counts.correctiveAction },
    organization: {
      findUnique: async ({ where }) => ({ id: where.id, name: organization.name }),
    },
    project: {
      count: async () => counts.project,
      findMany: async () => [
        {
          name: 'PMU — Tour Prémont 2026',
          organizationId: TARGET_ORGANIZATION_ID,
          client: { name: 'Groupe Immobilier Prémont', organizationId: TARGET_ORGANIZATION_ID },
        },
        {
          name: 'PCA — Tour Prémont 2026',
          organizationId: TARGET_ORGANIZATION_ID,
          client: { name: 'Groupe Immobilier Prémont', organizationId: TARGET_ORGANIZATION_ID },
        },
      ],
    },
  };
  return {
    prisma: { $transaction: async (fn) => fn(tx) },
    transactionStatement: () => transactionStatement,
  };
}

test('verifies one active non-internal Demo Coro identity in a read-only transaction', async () => {
  const h = createPrisma({
    user: {
      id: 'user-1', role: 'ADMIN', isActive: true,
      organizationId: TARGET_ORGANIZATION_ID, organization,
    },
  });
  const report = await runReadOnly(h.prisma);
  assert.equal(h.transactionStatement(), 'SET TRANSACTION READ ONLY');
  assert.equal(report.decision, 'TARGET_VERIFIED_ISOLATED_DEMO');
  assert.deepEqual(report.identityKinds, ['INTERNAL_USER']);
  assert.equal(report.tenantData.buildings, 6);
  assert.deepEqual(report.canonicalOrganization, {
    id: TARGET_ORGANIZATION_ID,
    name: 'CORO Démo',
  });
  assert.equal(
    report.projectOwnership.every((project) => project.belongsToTargetOrganization),
    true,
  );
  assert.deepEqual(report.projectOwnership[0].clientNames, [
    'Groupe Immobilier Prémont',
  ]);
});

test('refuses ambiguous homonymous identities even when both point at Demo Coro', async () => {
  const h = createPrisma({
    user: { id: 'user-1', role: 'ADMIN', isActive: true, organizationId: TARGET_ORGANIZATION_ID, organization },
    clientUser: {
      id: 'client-user-1', role: 'CLIENT_CORPORATE', isActive: true,
      organizationId: TARGET_ORGANIZATION_ID, clientId: 'client-1', buildingIds: [],
      incidentPermissions: [], populationPermissions: [], organization,
      client: { isActive: true },
    },
  });
  const report = await runReadOnly(h.prisma);
  assert.equal(report.decision, 'TARGET_NOT_VERIFIED_NO_WRITES');
  assert.equal(report.identityCount, 2);
});

test('refuses an internal or mismatched organization', () => {
  const summary = summarizeIdentity('INTERNAL_USER', {
    id: 'user-1', role: 'ADMIN', isActive: true, organizationId: 'org-real',
    organization: { name: 'Client réel', isActive: true, isInternal: true },
  });
  assert.equal(summary.organizationNameMatchesTarget, false);
  assert.equal(summary.organizationInternal, true);
});

test('never emits the target email or identity identifier', async () => {
  const h = createPrisma({
    user: { id: 'canonical-user-id', role: 'ADMIN', isActive: true, organizationId: 'canonical-org-id', organization },
  });
  const serialized = JSON.stringify(await runReadOnly(h.prisma));
  assert.equal(serialized.includes(TARGET_EMAIL), false);
  assert.equal(serialized.includes('canonical-user-id'), false);
  assert.equal(serialized.includes('canonical-org-id'), true);
});

test('requires the explicit fixed runtime switch used by the governed workflow', () => {
  const source = fs.readFileSync(require.resolve('./demo-coro-readiness-inventory.cjs'), 'utf8');
  assert.match(source, /CORO_DEMO_READINESS_INVENTORY_RUN/);
  assert.match(source, /SET TRANSACTION READ ONLY/);
});
