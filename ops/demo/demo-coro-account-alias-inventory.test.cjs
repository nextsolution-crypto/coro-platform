'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { ALIASES, TARGET_ORGANIZATION_ID, runReadOnly } = require('./demo-coro-account-alias-inventory.cjs');

function harness({ internal = {}, clients = {} } = {}) {
  let transactionStatement = null;
  const tx = {
    $executeRawUnsafe: async (statement) => { transactionStatement = statement; },
    organization: { findUnique: async () => ({ id: TARGET_ORGANIZATION_ID, name: 'CORO Démo', isActive: true, isInternal: false }) },
    user: { findUnique: async ({ where }) => internal[where.email] ?? null },
    clientUser: { findUnique: async ({ where }) => clients[where.email] ?? null },
  };
  return { prisma: { $transaction: async (fn) => fn(tx) }, statement: () => transactionStatement };
}

test('reports the three fixed aliases as available without mutating', async () => {
  const h = harness();
  const report = await runReadOnly(h.prisma);
  assert.equal(h.statement(), 'SET TRANSACTION READ ONLY');
  assert.equal(report.aliases.length, 3);
  assert.equal(report.aliases.every((entry) => entry.creationDisposition === 'AVAILABLE_FOR_GOVERNED_CREATION'), true);
  assert.equal(report.creationAuthorizedByInventory, true);
});

test('reports a compatible existing ClientUser and preserves assignment evidence', async () => {
  const alias = ALIASES.find((entry) => entry.key === 'CLIENT_MANAGER');
  const h = harness({ clients: { [alias.email]: {
    id: 'client-user-1', role: 'CLIENT_MANAGER', isActive: true,
    organizationId: TARGET_ORGANIZATION_ID, clientId: 'client-1', buildingIds: ['building-1'],
    incidentPermissions: [], populationPermissions: ['POPULATION_READ'], operationalReviewPermissions: [], correctiveActionPermissions: [],
    organization: { name: 'CORO Démo', isActive: true }, client: { name: 'Client Démo', isActive: true },
  } } });
  const report = await runReadOnly(h.prisma);
  const result = report.aliases.find((entry) => entry.alias === 'CLIENT_MANAGER');
  assert.equal(result.creationDisposition, 'EXISTS_COMPATIBLE_REVIEW_REQUIRED_NO_AUTOMATIC_CHANGE');
  assert.equal(result.identities[0].assignedBuildingCount, 1);
  assert.equal(result.identities[0].populationPermissionCount, 1);
});

test('stops on a cross-authority or wrong-tenant collision', async () => {
  const alias = ALIASES[0];
  const h = harness({ clients: { [alias.email]: {
    id: 'client-user-1', role: 'CLIENT_MANAGER', isActive: true,
    organizationId: 'other-org', clientId: 'client-1', buildingIds: [],
    incidentPermissions: [], populationPermissions: [], operationalReviewPermissions: [], correctiveActionPermissions: [],
    organization: { name: 'Other', isActive: true }, client: { name: 'Other', isActive: true },
  } } });
  const report = await runReadOnly(h.prisma);
  assert.equal(report.collisionCount, 1);
  assert.equal(report.creationAuthorizedByInventory, false);
});

test('never emits raw alias emails or identity ids', async () => {
  const alias = ALIASES[0];
  const h = harness({ internal: { [alias.email]: {
    id: 'secret-user-id', role: 'OPERATOR', isActive: true, organizationId: TARGET_ORGANIZATION_ID,
    organization: { name: 'CORO Démo', isActive: true },
    _count: { projects: 2, bookingAssignments: 1, projectAdvisorEligibilities: 3 },
  } } });
  const serialized = JSON.stringify(await runReadOnly(h.prisma));
  assert.equal(serialized.includes(alias.email), false);
  assert.equal(serialized.includes('secret-user-id'), false);
});

test('requires an explicit runtime switch and a read-only transaction', () => {
  const source = fs.readFileSync(require.resolve('./demo-coro-account-alias-inventory.cjs'), 'utf8');
  assert.match(source, /CORO_DEMO_ACCOUNT_ALIAS_INVENTORY_RUN/);
  assert.match(source, /SET TRANSACTION READ ONLY/);
});
