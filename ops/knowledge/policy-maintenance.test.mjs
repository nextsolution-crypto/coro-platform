import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialReport, credentialsReady, withSemantic, withWebPublic } from './policy-maintenance.mjs';

const base = { schemaVersion: 1, bedrockEnabled: false, webPublicBedrockEnabled: false, localOcrEnabled: true };

test('turning semantic embeddings on keeps every other switch', () => {
  assert.deepEqual(withSemantic(base, true), { ...base, semanticEmbeddingsEnabled: true });
  assert.deepEqual(withSemantic({ ...base, semanticEmbeddingsEnabled: true }, false), { ...base, semanticEmbeddingsEnabled: false });
  assert.throws(() => withSemantic(base, 'on'));
});

test('credential report reveals presence only, never values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'coro-cred-'));
  try {
    const awsConfig = join(dir, 'aws-config');
    writeFileSync(awsConfig, '[profile coro-ai-production]\ncredential_process = /usr/local/bin/aws_signing_helper credential-process --role-arn SECRET-ARN\n');
    writeFileSync(join(dir, 'helper'), '');
    writeFileSync(join(dir, 'cert.pem'), 'CERT');
    const report = credentialReport({ awsConfig, signingHelper: join(dir, 'helper'), pki: join(dir, 'cert.pem') });
    assert.deepEqual(report, { awsConfig: true, profileCoroAiProduction: true, rolesAnywhereCredentialProcess: true,
      signingHelper: true, certificate: true });
    assert.ok(credentialsReady(report));
    assert.doesNotMatch(JSON.stringify(report), /SECRET|CERT/);
    const missing = credentialReport({ awsConfig: join(dir, 'none'), signingHelper: join(dir, 'helper'), pki: join(dir, 'cert.pem') });
    assert.equal(credentialsReady(missing), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Sophie on Bedrock keeps every other switch', () => {
  assert.deepEqual(withWebPublic({ ...base, bedrockEnabled: true }, true),
    { ...base, bedrockEnabled: true, webPublicBedrockEnabled: true, semanticEmbeddingsEnabled: false });
  assert.throws(() => withWebPublic(base, 1));
});
