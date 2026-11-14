import assert from 'node:assert/strict';
import { test } from 'node:test';
import { githubOutputs, loadApprovedRelease } from './approved-immutable-release.mjs';

const approved = '82125e27d70f4c763fd4c14da48dc8f152f8435a';

test('resolves the exact approved application commit and immutable digests', () => {
  const release = loadApprovedRelease(approved);
  assert.equal(release.migrationHead, '20261207010000_display_permanent_url_web_player');
  assert.match(release.images.backend, /@sha256:[0-9a-f]{64}$/);
  assert.match(githubOutputs(approved, release), new RegExp(`application_commit=${approved}`));
});

test('rejects unapproved or malformed application commits', () => {
  assert.throws(() => loadApprovedRelease('0'.repeat(40)), /APPLICATION_COMMIT_NOT_APPROVED/);
  assert.throws(() => loadApprovedRelease('main'), /APPLICATION_COMMIT_INVALID/);
});
