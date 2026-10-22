import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('./coro-single-service-maintenance.sh', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../../.github/workflows/production-single-service-maintenance.yml', import.meta.url), 'utf8');

test('shares the production deployment lock and rejects concurrency', () => {
  assert.match(script, /coro-production-deployment\.lock/);
  assert.match(script, /flock --nonblock/);
});
test('accepts backend only and requires an immutable manifest image', () => {
  assert.match(script, /SERVICE" == backend/);
  assert.match(script, /TARGET_NOT_IN_RELEASE_MANIFEST/);
  assert.match(script, /@sha256:/);
  assert.match(script, /MUTABLE_TAG_REJECTED/);
  assert.doesNotMatch(workflow, /force-recreate/);
});
test('preserves unrelated services and provides governed rollback', () => {
  for (const name of ['coro_frontend', 'coro_client_portal', 'coro_website']) assert.match(script, new RegExp(name));
  assert.match(script, /UNRELATED_SERVICE_CHANGED/);
  assert.match(script, /single-service-rollback/);
});

test('writes snapshots into secure files created by mktemp and keeps final evidence exclusive', () => {
  assert.match(script, /before="\$\(mktemp \/tmp\/coro-maintenance-before/);
  assert.match(script, /after="\$\(mktemp \/tmp\/coro-maintenance-after/);
  assert.match(script, /fs\.writeFileSync\(out,[\s\S]*?flag:'w'/);
  assert.match(script, /fs\.writeFileSync\(process\.argv\[4\],[\s\S]*?flag:'wx'/);
});

test('fails closed on SMS drift and keeps the global gate closed', () => {
  for (const marker of ['GLOBAL_SMS_GATE_OPEN', 'SMS_WEBHOOK_SECRET_MISSING', 'SMS_EVIDENCE_MOUNT_INVALID', 'DRY_RUN_EVIDENCE_MISSING', 'LIVE_EVIDENCE_CORRELATION_MISSING', 'SMS_CONFIGURATION_OR_EVIDENCE_CHANGED']) assert.match(script, new RegExp(marker));
  assert.doesNotMatch(script, /console\.log\(.*POPULATION_BREVO_SMS_WEBHOOK_SECRET/);
});

test('workflow has no arbitrary command input and uses production protection', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /packages: read/);
  assert.match(workflow, /options: \[backend\]/);
  assert.doesNotMatch(workflow, /command:/);
});
