import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSingleServiceRequest } from './single-service-policy.mjs';

const valid = {
  approval: 'RECONCILE_SINGLE_SERVICE',
  service: 'backend',
  releaseCommit: '2'.repeat(40),
  image: `ghcr.io/nextsolution-crypto/coro-backend@sha256:${'a'.repeat(64)}`,
};

test('accepts the authorized backend immutable image request', () => assert.equal(validateSingleServiceRequest(valid), true));
test('rejects a mutable latest tag', () => assert.throws(() => validateSingleServiceRequest({ ...valid, image: 'ghcr.io/nextsolution-crypto/coro-backend:latest' }), /IMAGE_NOT_IMMUTABLE|MUTABLE_TAG/));
test('rejects a service outside the current allowlist', () => assert.throws(() => validateSingleServiceRequest({ ...valid, service: 'frontend' }), /SERVICE_NOT_AUTHORIZED/));
test('rejects missing approval', () => assert.throws(() => validateSingleServiceRequest({ ...valid, approval: '' }), /APPROVAL_INVALID/));
test('rejects a malformed release commit', () => assert.throws(() => validateSingleServiceRequest({ ...valid, releaseCommit: 'main' }), /RELEASE_COMMIT_INVALID/));
