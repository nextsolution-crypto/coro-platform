'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const manifest = require('./coro-demo-report-03-manifest.json');
const source = fs.readFileSync(path.join(__dirname, 'coro-demo-report-03.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'production-coro-demo-report-03.yml'), 'utf8');

test('contract is pinned to two existing identities and canonical Tour Premont', () => {
  assert.equal(manifest.organizationId, '916f54ec-af22-45e0-99db-a369d9630002');
  assert.equal(manifest.buildingFingerprint, '5ba4072e9e0027d5b74ff469e5424463f671eb76b9c052db8f024b2450b0f3ec');
  assert.deepEqual(Object.keys(manifest.identities).sort(), ['agent', 'supervisor']);
  assert.equal(manifest.identities.agent.role, 'CLIENT_MANAGER');
  assert.equal(manifest.identities.supervisor.role, 'CLIENT_CORPORATE');
  assert.equal(manifest.durationDays, 30);
});

test('least privilege and site trial are fixed', () => {
  assert.deepEqual(manifest.identities.agent.permissions, ['INCIDENT_REPORT_READ', 'INCIDENT_REPORT_CREATE', 'INCIDENT_REPORT_EDIT']);
  assert.deepEqual(manifest.identities.supervisor.permissions, ['INCIDENT_REPORT_READ', 'INCIDENT_REPORT_REVIEW', 'INCIDENT_REPORT_APPROVE', 'INCIDENT_REPORT_EXPORT']);
  assert.match(source, /scope: 'SITE'/);
  assert.match(source, /source: 'TRIAL'/);
  assert.match(source, /distributable: false/);
  assert.match(source, /permissions: \['INCIDENT_READ'\]/);
  assert.equal(Object.values(manifest.identities).flatMap((identity) => identity.permissions).some((permission) => permission.startsWith('OPERATIONAL_')), false);
});

test('provisioning refuses to overwrite unrelated access state', () => {
  assert.match(source, /TRIAL_NOT_ALLOWED_FOR_INTERNAL_ORGANIZATION/);
  assert.match(source, /PREEXISTING_PERMISSIONS_\$\{profile\.toUpperCase\(\)\}_NOT_OWNED/);
  assert.match(source, /PREEXISTING_ASSIGNMENT_\$\{profile\.toUpperCase\(\)\}_NOT_OWNED/);
  assert.match(source, /PREEXISTING_AUTHORITY_\$\{profile\.toUpperCase\(\)\}_NOT_OWNED/);
});

test('workflow is locked, backed up and fail-closed', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /coro-db-backup\.service/);
  assert.match(workflow, /coro-db-restore-test\.service/);
  assert.match(workflow, /PROVISION_CORO_DEMO_REPORT_03/);
  assert.match(workflow, /ROLLBACK_CORO_DEMO_REPORT_03/);
  assert.match(workflow, /state\.OPERATIONAL_LOG_ENABLED\|\|state\.OPERATIONAL_SHIFTS_ENABLED/);
  assert.match(workflow, /ACTIVE_BACKEND_RELEASE_MISMATCH/);
  assert.match(workflow, /production-\*\.reconciled\.json/);
  assert.match(workflow, /expected_backend/);
  assert.match(workflow, /backend-immutable\.yml/);
  assert.match(workflow, /up -d --no-deps --no-build backend/);
  assert.doesNotMatch(workflow, /docker compose -f "\$repo\/docker-compose\.yml" up -d --no-deps backend/);
  assert.match(workflow, /set_flag false; stage=rollback_data; run_script rollback/);
  assert.match(source, /execution: 'FAIL', mode, errorCode/);
  assert.match(workflow, /\[A-Z\]\[A-Z0-9_\]\{2,80\}/);
  assert.match(workflow, /CORO_DEMO_REPORT_03_WORKFLOW_FAILED stage=\$stage rc=\$rc/);
  assert.match(workflow, /RestartCount/);
  assert.match(workflow, /127\.0\.0\.1:3002\/api\/auth\/login/);
  assert.match(workflow, /release-smoke-nonexistent@example\.invalid/);
  assert.doesNotMatch(workflow, /State\.Health|Health\.Status/);
  assert.doesNotMatch(workflow, /docker system prune|prisma migrate/);
});
