'use strict';
const assert = require('node:assert/strict');
const { planReconciliation } = require('./incident-report-private-object-reconciliation.cjs');
const now = new Date('2026-12-15T12:00:00Z');
const base = 'tenant-org-a/incident-report-exports/report/version/';
const report = planReconciliation({ organizationId: 'org-a', now, graceHours: 24,
  authorityKeys: new Set([`${base}kept.pdf`]), inFlightKeys: new Set([`${base}processing.pdf`]), objects: [
    { key: `${base}kept.pdf`, size: 10, lastModified: '2026-12-01T00:00:00Z' },
    { key: `${base}processing.pdf`, size: 20, lastModified: '2026-12-01T00:00:00Z' },
    { key: `${base}recent.pdf`, size: 30, lastModified: '2026-12-15T00:00:00Z' },
    { key: `${base}orphan.pdf`, size: 40, lastModified: '2026-12-01T00:00:00Z' },
    { key: 'tenant-org-b/incident-report-exports/other.pdf', size: 99, lastModified: '2026-12-01T00:00:00Z' },
  ] });
assert.equal(report.candidates, 1); assert.equal(report.bytesRecoverable, 40); assert.equal(report.inspected, 4);
assert.deepEqual(report.plan.map((item) => item.disposition), ['REFERENCED', 'IN_FLIGHT', 'GRACE_PERIOD', 'ORPHAN_CANDIDATE']);
assert.ok(report.plan.every((item) => !('key' in item)));
console.log('incident-report private object reconciliation tests: PASS');
