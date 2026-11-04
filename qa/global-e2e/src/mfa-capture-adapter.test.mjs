import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertMfaCaptureDirectory } from './mfa-capture-adapter.mjs';

test('accepts an MFA capture directory contained by the operating-system temp directory', () => {
  assert.equal(assertMfaCaptureDirectory(join(tmpdir(), 'coro-mfa-qa')), join(tmpdir(), 'coro-mfa-qa'));
});

test('rejects a capture directory outside the operating-system temp directory', () => {
  assert.throws(() => assertMfaCaptureDirectory('D:\\CORO-QA\\secrets'), /temporary directory/);
});
