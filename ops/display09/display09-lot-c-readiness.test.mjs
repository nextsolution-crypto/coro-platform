import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './display09-lot-c-readiness.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('./display09-lot-c-manifest.json', import.meta.url), 'utf8'));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const clone = () => structuredClone(manifest);

test('canonical Lot C manifest is executable but non-mutating readiness data', () => {
  assert.deepEqual(validateManifest(clone(), root), []);
});

test('rejects a different tenant, fixture or building fingerprint', () => {
  for (const mutate of [
    (m) => { m.organization.id = crypto.randomUUID(); },
    (m) => { m.organization.fixtureKey = 'another-building'; },
    (m) => { m.organization.canonicalBuildingFingerprint = '0'.repeat(64); },
  ]) {
    const candidate = clone();
    mutate(candidate);
    assert.notEqual(validateManifest(candidate, root).length, 0);
  }
});

test('rejects elevated player capabilities or missing independent approval', () => {
  const candidate = clone();
  candidate.player.capability = 'WEB_EMERGENCY_ELIGIBLE';
  candidate.player.emergencyEligible = true;
  candidate.publication.requiresDistinctReviewAndApproval = false;
  assert.ok(validateManifest(candidate, root).length >= 3);
});

test('rejects a changed or missing PDF', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'display09-lot-c-'));
  try {
    const candidate = clone();
    candidate.assets[0].path = 'changed.pdf';
    fs.writeFileSync(path.join(temp, 'changed.pdf'), 'not the approved PDF');
    assert.ok(validateManifest(candidate, temp).some((code) => code.endsWith('HASH_MISMATCH')));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('requires iPad V1/V2 observation and post-revocation refusal', () => {
  const candidate = clone();
  candidate.requiredSequence = candidate.requiredSequence.filter((step) => !step.startsWith('IPAD_') && step !== 'SERVER_REFUSAL_AFTER_REVOCATION_VERIFIED');
  const failures = validateManifest(candidate, root);
  assert.ok(failures.includes('SEQUENCE_IPAD_SAFARI_V1_OBSERVED_MISSING'));
  assert.ok(failures.includes('SEQUENCE_IPAD_SAFARI_V2_SYNC_OBSERVED_MISSING'));
  assert.ok(failures.includes('SEQUENCE_SERVER_REFUSAL_AFTER_REVOCATION_VERIFIED_MISSING'));
});
