import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const release = fs.readFileSync(new URL('./coro-production-release.sh', import.meta.url), 'utf8');
const control = fs.readFileSync(new URL('./coro-release-control.sh', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const reconcile = fs.readFileSync(new URL('./coro-release-reconcile.sh', import.meta.url), 'utf8');

test('push validates but cannot build or deploy', () => {
  assert.match(workflow, /build-images:\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /production-release:\n\s+if: github\.event_name == 'workflow_dispatch'/);
});
test('requires manual approval, environment and two concurrency locks', () => {
  assert.match(workflow, /production_approval:/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: coro-production-deployment/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(release, /flock --nonblock/);
});
test('uses a complete immutable image set', () => {
  assert.doesNotMatch(workflow, /coro-(backend|frontend|website|client-portal):latest/);
  for (const value of ['BACKEND_IMAGE', 'FRONTEND_IMAGE', 'CLIENT_PORTAL_IMAGE', 'WEBSITE_IMAGE']) assert.match(workflow, new RegExp(value));
  assert.match(release, /docker image inspect/);
});
test('fails closed through backup, remote evidence and restore gates', () => {
  for (const value of ['REMOTE_VERIFIED', 'VersionId', 'sha256', 'RESTORE_VERIFIED']) assert.match(release, new RegExp(value));
  assert.match(release, /coro-db-backup-health\.service/);
  assert.match(release, /coro-db-backup\.service/);
  assert.match(release, /coro-db-restore-run\.sh/);
});
test('fails before backup when release capacity headroom is insufficient', () => {
  assert.match(release, /RELEASE_CAPACITY_INSUFFICIENT/);
  assert.match(release, /active_image_bytes \* 125/);
  assert.match(release, /database_growth/);
  assert.match(release, /operational_reserve/);
  assert.ok(release.indexOf('RELEASE_CAPACITY_INSUFFICIENT') < release.indexOf('systemctl start coro-db-backup.service'));
});
test('migrates and verifies migration head before application rollout', () => {
  const migrate = release.indexOf('migrate deploy');
  const rollout = release.indexOf('up -d --no-build');
  assert.ok(migrate > 0 && rollout > migrate);
  assert.match(release, /MIGRATION_HEAD_MISMATCH/);
});
test('requires health, smoke, restart and log checks', () => {
  for (const value of ['BACKEND_READINESS_TIMEOUT', 'BACKEND_CONTAINER_EXITED', 'BACKEND_RESTART_LOOP', 'BACKEND_HEALTH_NETWORK_FAILED', 'BACKEND_HEALTH_RESPONSE_INVALID', 'BACKEND_HEALTH_SESSION_CREATED', 'CLIENT_AUTH_SMOKE_FAILED', 'BOOKING_SMOKE_FAILED', 'RENDEMENT_SMOKE_FAILED', 'READINESS_TIMEOUT', 'CONTAINER_EXITED', 'RESTART_LOOP', 'RESTART_COUNT_NONZERO', 'CRITICAL_LOGS_FOUND', 'MFA_QA_CAPTURE_ENABLED']) assert.match(release, new RegExp(value));
  for (const value of ['coro_frontend', 'coro_client_portal', 'coro_website']) assert.match(release, new RegExp(`wait_for_application_ready ${value}`));
  assert.match(release, /release-smoke-nonexistent@example\.invalid/);
  assert.ok(release.indexOf('wait_for_backend_ready coro_backend') < release.indexOf('run_backend_auth_smoke http:'));
  assert.doesNotMatch(release, /-d '\{\}' http:\/\/127\.0\.0\.1:3002\/api\/auth\/login/);
});
test('records rollback and release evidence without automatic database restore', () => {
  for (const value of ['previousCommit', 'previousImages', 'previousCompose', 'previousMigrationHead', 'backupVersionId', 'healthChecks']) assert.match(release, new RegExp(value));
  assert.doesNotMatch(release, /prisma migrate reset|dropdb|pg_restore.*coro_db/);
});
test('launches durable server-side work and reconciles an existing release without retry', () => {
  assert.match(workflow, /coro-release-control\.sh/);
  assert.match(control, /systemd-run/);
  assert.match(control, /production-\$\{RELEASE_COMMIT\}/);
  assert.match(control, /PREPARED\|RUNNING/);
  assert.match(control, /RELEASE_OUTCOME_UNKNOWN/);
  assert.match(control, /\$\{release_id\}\.reconcile\.sh/);
  assert.match(control, /CONCURRENT_CONTROLLER/);
  assert.match(control, /FOREIGN_RELEASE_\$\{other_state\}/);
  assert.match(control, /\$\{release_id\}\.state\.mjs/);
  assert.match(control, /set -a\nsource "\$runtime_dir\/\$\{release_id\}\.env"\nset \+a/);
  assert.doesNotMatch(control, /ROLLBACK_APPLICATIONS/);
});
test('reconciliation is read-only and verifies runtime against immutable evidence', () => {
  for (const value of ['MANIFEST_CHECKSUM_MISMATCH', 'DIGEST_MISMATCH', 'MIGRATION_HEAD_MISMATCH', 'CHECKOUT_COMMIT_MISMATCH', 'DEPLOYMENT_LOCK_BUSY']) {
    assert.match(reconcile, new RegExp(value));
  }
  assert.doesNotMatch(reconcile, /docker compose .*up|migrate deploy|pg_restore|ROLLBACK_APPLICATIONS/);
});
test('governed release injects and verifies the Client invitation outbox key without printing it', () => {
  assert.match(workflow, /CLIENT_INVITATION_OUTBOX_KEY_BASE64: \$\{\{ secrets\.CLIENT_INVITATION_OUTBOX_KEY_BASE64 \}\}/);
  assert.match(workflow, /CLIENT_INVITATION_OUTBOX_KEY_ID: \$\{\{ vars\.CLIENT_INVITATION_OUTBOX_KEY_ID \}\}/);
  assert.match(control, /CLIENT_INVITATION_OUTBOX_KEY_INVALID/);
  assert.match(control, /CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_INVALID/);
  assert.match(control, /CLIENT_INVITATION_OUTBOX_KEY_BASE64=\$CLIENT_INVITATION_OUTBOX_KEY_BASE64/);
  assert.match(release, /CLIENT_INVITATION_OUTBOX_CONFIGURATION_INVALID/);
  assert.match(reconcile, /OUTBOX_CONFIGURATION_MISMATCH/);
  assert.doesNotMatch(control, /echo .*CLIENT_INVITATION_OUTBOX_KEY_BASE64/);
});
test('durable Knowledge policy and real synthetic provider smoke gate release success', () => {
  assert.match(release, /runtime-policy\.mjs overlay/);
  assert.match(release, /knowledge-provider-smoke\.js/);
  assert.match(release, /KNOWLEDGE_PROVIDER_SMOKE_FAILED/);
  assert.match(release, /runtime-policy\.mjs verify/);
  assert.match(release, /knowledgeRuntime/);
  assert.match(reconcile, /runtime-policy\.mjs" verify/);
  assert.ok(release.indexOf('knowledge-provider-smoke.js') < release.indexOf('manifest.knowledgeRuntime'));
  assert.match(workflow, /node --test qa\/knowledge-master\/extraction.test.mjs/);
});
