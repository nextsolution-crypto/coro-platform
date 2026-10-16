import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_DEPLOYMENT_EVIDENCE, validateDeploymentEvidence, validateImageSet, validateReleaseEvidence, validateReleaseManifest, validateReleaseRequest } from './release-policy.mjs';

const digest = `sha256:${'a'.repeat(64)}`;
const valid = {
  RELEASE_COMMIT: 'b'.repeat(40),
  PRODUCTION_APPROVAL: 'DEPLOY_PRODUCTION',
  MIGRATION_COMPATIBILITY_APPROVAL: 'CONFIRMED_BACKWARD_COMPATIBLE',
  BACKEND_IMAGE: `ghcr.io/coro/coro-backend@${digest}`,
  FRONTEND_IMAGE: `ghcr.io/coro/coro-frontend@${digest}`,
  CLIENT_PORTAL_IMAGE: `ghcr.io/coro/coro-client-portal@${digest}`,
  WEBSITE_IMAGE: `ghcr.io/coro/coro-website@${digest}`,
};

test('accepts a complete approved immutable release', () => assert.doesNotThrow(() => validateReleaseEvidence(valid)));
test('rejects missing approval', () => assert.throws(() => validateReleaseRequest({ ...valid, PRODUCTION_APPROVAL: '' }), /RELEASE_APPROVAL_MISSING/));
test('rejects a non-canonical commit', () => assert.throws(() => validateReleaseRequest({ ...valid, RELEASE_COMMIT: 'main' }), /RELEASE_COMMIT_INVALID/));
test('rejects missing migration compatibility approval', () => assert.throws(() => validateReleaseRequest({ ...valid, MIGRATION_COMPATIBILITY_APPROVAL: '' }), /MIGRATION_COMPATIBILITY_APPROVAL_MISSING/));
test('rejects every incomplete image set', () => {
  for (const name of ['BACKEND_IMAGE', 'FRONTEND_IMAGE', 'CLIENT_PORTAL_IMAGE', 'WEBSITE_IMAGE']) {
    assert.throws(() => validateImageSet({ ...valid, [name]: '' }), new RegExp(`${name}_INVALID`));
  }
});
test('rejects tags and arbitrary registries', () => {
  assert.throws(() => validateImageSet({ ...valid, BACKEND_IMAGE: 'ghcr.io/coro/coro-backend:latest' }), /BACKEND_IMAGE_INVALID/);
  assert.throws(() => validateImageSet({ ...valid, BACKEND_IMAGE: `evil.invalid/coro/backend@${digest}` }), /BACKEND_IMAGE_INVALID/);
});
test('simulates all post-request release failures as fail-closed', () => {
  assert.doesNotThrow(() => validateDeploymentEvidence(REQUIRED_DEPLOYMENT_EVIDENCE));
  for (const [name, expected] of Object.entries(REQUIRED_DEPLOYMENT_EVIDENCE)) {
    const failed = { ...REQUIRED_DEPLOYMENT_EVIDENCE, [name]: typeof expected === 'boolean' ? !expected : 'FAIL' };
    assert.throws(() => validateDeploymentEvidence(failed), new RegExp(name.toUpperCase()));
  }
});
test('validates complete secret-free release and rollback evidence', () => {
  const manifest = {
    status: 'SUCCESS', gitCommit: valid.RELEASE_COMMIT,
    images: { backend: valid.BACKEND_IMAGE, frontend: valid.FRONTEND_IMAGE, clientPortal: valid.CLIENT_PORTAL_IMAGE, website: valid.WEBSITE_IMAGE },
    backupSha256: 'c'.repeat(64), backupVersionId: 'version-1', restoreEvidence: { status: 'RESTORE_VERIFIED' },
    previousImages: [valid.BACKEND_IMAGE, valid.FRONTEND_IMAGE, valid.CLIENT_PORTAL_IMAGE, valid.WEBSITE_IMAGE],
    previousCompose: '/safe/previous-compose.yml', previousMigrationHead: '20261001000000_example', healthChecks: { backend: 'PASS' },
  };
  assert.doesNotThrow(() => validateReleaseManifest(manifest));
  assert.throws(() => validateReleaseManifest({ ...manifest, backupVersionId: null }), /RECOVERY_EVIDENCE/);
});
