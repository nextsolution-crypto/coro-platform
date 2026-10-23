import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { overlay, loadPolicy, verifyRuntime, validatePolicy } from './runtime-policy.mjs';

const image = 'ghcr.io/nextsolution-crypto/coro-backend@sha256:' + 'a'.repeat(64);
const enabled = { schemaVersion: 1, bedrockEnabled: true, localOcrEnabled: true };
const runtime = expected => ({ Config: { Image: image, Env: Object.entries(expected.services.backend.environment).map(([k,v]) => `${k}=${v}`) },
  State: { Running: true }, RestartCount: 0,
  Mounts: (expected.services.backend.volumes ?? []).map(m => ({ Destination: m.target, Source: m.source, RW: false })) });

test('absent policy never activates a provider or exposes credentials', () => {
  const result = overlay(loadPolicy('/does-not-exist/coro-policy'), image);
  assert.equal(result.services.backend.environment.CORO_AI_BEDROCK_INVOCATION_ENABLED, 'false');
  assert.equal(result.services.backend.volumes, undefined);
});
test('unknown fields, implicit booleans and unpinned images fail closed', () => {
  for (const bad of [{...enabled, model: 'other'}, {...enabled, bedrockEnabled: 'true'}, {...enabled, schemaVersion: 2}, null])
    assert.throws(() => validatePolicy(bad));
  assert.throws(() => overlay(enabled, 'ghcr.io/coro/backend:latest'));
});
test('activation pins Canadian model, 900 seconds and readonly credential mounts', () => {
  const expected = overlay(enabled, image);
  assert.deepEqual(verifyRuntime(runtime(expected), expected), { bedrock: 'PASS', localOcr: 'ENABLED', sessionSeconds: 900 });
  for (const mutation of [r => r.Config.Env.push('CORO_AI_BEDROCK_REGION=us-east-1'), r => r.RestartCount++,
    r => r.Mounts[0].RW = true, r => r.Config.Image = 'wrong']) {
    const actual = runtime(expected); mutation(actual); assert.throws(() => verifyRuntime(actual, expected));
  }
});
test('disabled runtime must not retain AWS mounts', () => {
  const expected = overlay({...enabled, bedrockEnabled: false}, image);
  const actual = runtime(expected); actual.Mounts.push({Destination:'/etc/coro-ai'});
  assert.throws(() => verifyRuntime(actual, expected));
});
test('policy is private, root-owned and refuses symlinks', { skip: process.getuid?.() !== 0 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'coro-policy-')); const path = join(dir, 'policy.json');
  try {
    chmodSync(dir, 0o700); writeFileSync(path, JSON.stringify(enabled), {mode:0o600});
    assert.deepEqual(loadPolicy(path), enabled);
    chmodSync(path, 0o644); assert.throws(() => loadPolicy(path)); chmodSync(path, 0o600);
    symlinkSync(path, join(dir,'link.json')); assert.throws(() => loadPolicy(join(dir,'link.json')));
    chmodSync(dir,0o755); assert.throws(() => loadPolicy(path));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
