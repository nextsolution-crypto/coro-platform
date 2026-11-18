'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runReadOnly } = require('./client01d-demo-readiness.cjs');

function harness(overrides = {}) {
  const results = [
    [{ id: '916f54ec-af22-45e0-99db-a369d9630002', name: 'CORO Démo', isActive: true, status: 'ACTIVE', communicationMode: 'SIMULATE', externalProvidersDisabled: true }],
    [1, 2, 3].map((n) => ({ entityId: `building-${n}`, name: `Building ${n}`, clientId: 'client-1', isActive: true })),
    Array.from({ length: 6 }, (_, n) => ({ id: `identity-${n}`, role: n ? 'CLIENT_MANAGER' : 'CLIENT_CORPORATE', isActive: true, permissionCount: 0n, activeAssignments: 0n })),
    ['INCIDENT_REPORTS', 'OPERATIONAL_LOG', 'OPERATIONAL_SHIFTS', 'OPERATIONAL_DIRECTIVES', 'OPERATIONAL_FOLLOWUPS', 'SECURITY_WORKSTATION'].map((code) => ({ code, lifecycle: 'ACTIVE', isAvailable: true, siteAllowed: true })),
    [],
    [{ templates: 0n, reports: 0n, log_entries: 0n, shifts: 0n, directives: 0n, followups: 0n }],
  ];
  Object.entries(overrides).forEach(([index, value]) => { results[Number(index)] = value; });
  let call = 0;
  const tx = { $executeRawUnsafe: async () => 0, $queryRawUnsafe: async () => results[call++] };
  return { prisma: { $transaction: (fn) => fn(tx) } };
}

test('readiness is read-only, fail-closed and ready only before target entitlements exist', async () => {
  const result = await runReadOnly(harness().prisma, {});
  assert.equal(result.readOnly, true);
  assert.equal(result.activationReady, true);
  assert.equal(result.mutationExecuted, false);
  assert.equal(result.preconditions.flagsDisabled, true);
  assert.equal(result.identities.length, 6);
});

test('a globally enabled flag or another-tenant entitlement blocks readiness', async () => {
  const other = [{ organizationId: 'other', code: 'INCIDENT_REPORTS', scope: 'SITE', lifecycle: 'GRANTED', enabled: true, effectiveFrom: new Date(0), effectiveUntil: null }];
  const result = await runReadOnly(harness({ 4: other }).prisma, { INCIDENT_REPORTS_ENABLED: 'true' });
  assert.equal(result.activationReady, false);
  assert.equal(result.preconditions.flagsDisabled, false);
  assert.equal(result.preconditions.noCrossTenantEntitlement, false);
});

test('production readiness workflow is fixed, read-only and emits no activation command', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '..', '.github', 'workflows', 'production-coro-demo-report-readiness.yml'),
    'utf8',
  );
  const source = fs.readFileSync(path.join(__dirname, 'client01d-demo-readiness.cjs'), 'utf8');
  assert.match(workflow, /INVENTORY_CORO_DEMO_REPORT_READ_ONLY/);
  assert.match(source, /SET TRANSACTION READ ONLY/);
  assert.doesNotMatch(workflow, /\b(activate|provision|enable)\b/i);
  assert.doesNotMatch(source, /tx\.\w+\.(create|update|delete|upsert)\s*\(/);
});
