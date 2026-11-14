import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../../.github/workflows/deploy-approved-immutable-release.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const release = fs.readFileSync(new URL('./coro-production-release.sh', import.meta.url), 'utf8');
const gate = fs.readFileSync(new URL('../display09/display09-gate1b.sql', import.meta.url), 'utf8');

test('separates approved application commit from governed tooling commit', () => {
  assert.match(workflow, /application_commit:/);
  assert.match(workflow, /RELEASE_TOOLING_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /merge-base --is-ancestor "\$APPLICATION_COMMIT" HEAD/);
  assert.match(workflow, /test "\$\(git -C "\$repo" rev-parse origin\/main\)" = "\$RELEASE_TOOLING_COMMIT"/);
});

test('reuses only policy-bound remote manifests and never builds images', () => {
  assert.match(workflow, /approved-immutable-release\.mjs/);
  assert.match(workflow, /docker buildx imagetools inspect/);
  assert.doesNotMatch(workflow, /docker\/build-push-action|docker build |push: true/);
  for (const name of ['BACKEND_IMAGE', 'FRONTEND_IMAGE', 'CLIENT_PORTAL_IMAGE', 'WEBSITE_IMAGE']) assert.match(workflow, new RegExp(name));
});

test('migration head discovery excludes migration_lock.toml', () => {
  assert.match(workflow, /git ls-tree -d --name-only/);
});

test('retains protected production environment, deployment lock and recovery gates', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: coro-production-deployment/);
  assert.match(release, /flock --nonblock/);
  for (const evidence of ['REMOTE_VERIFIED', 'RESTORE_VERIFIED', 'RELEASE_CAPACITY_INSUFFICIENT', 'previousImages']) assert.match(release, new RegExp(evidence));
});

test('approved ancestor becomes the exact active checkout without accepting unrelated commits', () => {
  assert.match(release, /git merge-base --is-ancestor "\$RELEASE_COMMIT" origin\/main/);
  assert.match(release, /git checkout --force -B release-active "\$RELEASE_COMMIT"/);
  assert.doesNotMatch(release, /git merge --ff-only origin\/main/);
});

test('Gate 1B is read-only and verifies migrations, authority and spatial isolation', () => {
  assert.match(gate, /BEGIN TRANSACTION READ ONLY/);
  assert.match(gate, /migration_count <> 11/);
  assert.match(gate, /DisplayPermission/);
  assert.match(gate, /WEB_VIEW_ONLY/);
  assert.match(gate, /GATE_1B=PASS/);
  assert.doesNotMatch(gate, /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i);
});
