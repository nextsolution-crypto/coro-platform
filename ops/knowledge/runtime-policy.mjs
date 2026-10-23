import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const POLICY_PATH = '/etc/coro-ai/runtime-policy.json';
const credentials = ['/etc/coro-ai', '/usr/local/bin/aws_signing_helper'];

export function validatePolicy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !['schemaVersion', 'bedrockEnabled', 'localOcrEnabled'].includes(k)) ||
      value.schemaVersion !== 1 || typeof value.bedrockEnabled !== 'boolean' ||
      typeof value.localOcrEnabled !== 'boolean') throw new Error('KNOWLEDGE_POLICY_INVALID');
  return { schemaVersion: 1, bedrockEnabled: value.bedrockEnabled, localOcrEnabled: value.localOcrEnabled };
}

export function loadPolicy(path = POLICY_PATH) {
  let stat;
  try { stat = lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return validatePolicy({ schemaVersion: 1, bedrockEnabled: false, localOcrEnabled: false });
    throw error;
  }
  const parent = lstatSync(dirname(path));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o077) ||
      !parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== 0 || (parent.mode & 0o077) || stat.size > 2048)
    throw new Error('KNOWLEDGE_POLICY_PERMISSIONS_INVALID');
  return validatePolicy(JSON.parse(readFileSync(path, 'utf8')));
}

export function overlay(policy, image) {
  policy = validatePolicy(policy);
  if (!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image)) throw new Error('KNOWLEDGE_IMAGE_INVALID');
  const environment = {
    CORO_AI_PROVIDER: policy.bedrockEnabled ? 'bedrock' : 'deterministic-simulated',
    CORO_AI_BEDROCK_INVOCATION_ENABLED: String(policy.bedrockEnabled),
    KNOWLEDGE_LOCAL_OCR_ENABLED: String(policy.localOcrEnabled),
  };
  const backend = { image, environment };
  if (policy.bedrockEnabled) {
    Object.assign(environment, {
      CORO_AI_BEDROCK_REGION: 'ca-central-1', CORO_AI_BEDROCK_MODEL_ID: 'ca.amazon.nova-lite-v1:0',
      CORO_AI_ROLES_ANYWHERE_SESSION_SECONDS: '900', AWS_PROFILE: 'coro-ai-production',
      AWS_CONFIG_FILE: '/etc/coro-ai/aws-config', AWS_EC2_METADATA_DISABLED: 'true', AWS_MAX_ATTEMPTS: '1',
    });
    backend.volumes = credentials.map(path => ({ type: 'bind', source: path, target: path, read_only: true }));
  }
  return { services: { backend } };
}

export function verifyRuntime(runtime, expected) {
  const env = Object.fromEntries(runtime.Config.Env.map(value => value.split(/=(.*)/s).slice(0, 2)));
  const backend = expected.services.backend;
  if (runtime.Config.Image !== backend.image || !runtime.State.Running || runtime.RestartCount !== 0 ||
      Object.entries(backend.environment).some(([k, v]) => env[k] !== v)) throw new Error('KNOWLEDGE_RUNTIME_MISMATCH');
  for (const mount of backend.volumes ?? []) {
    if (!runtime.Mounts.some(m => m.Destination === mount.target && m.Source === mount.source && m.RW === false))
      throw new Error('KNOWLEDGE_CREDENTIAL_MOUNT_INVALID');
  }
  if (env.CORO_AI_PROVIDER !== 'bedrock' && runtime.Mounts.some(m => credentials.includes(m.Destination)))
    throw new Error('KNOWLEDGE_DISABLED_CREDENTIAL_MOUNT');
  return { bedrock: env.CORO_AI_PROVIDER === 'bedrock' ? 'PASS' : 'DISABLED',
    localOcr: env.KNOWLEDGE_LOCAL_OCR_ENABLED === 'true' ? 'ENABLED' : 'DISABLED',
    sessionSeconds: env.CORO_AI_PROVIDER === 'bedrock' ? 900 : null };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, image, output] = process.argv.slice(2);
    const expected = overlay(loadPolicy(), image);
    if (command === 'overlay' && output) {
      if (expected.services.backend.volumes) {
        for (const path of [...credentials, '/etc/coro-ai/aws-config', '/etc/coro-ai/pki/coro-production.pem']) {
          const stat = lstatSync(path);
          if (stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022)) throw new Error('KNOWLEDGE_CREDENTIAL_PATH_UNSAFE');
        }
      }
      writeFileSync(output, JSON.stringify(expected) + '\n', { mode: 0o600, flag: 'wx' });
      console.log('KNOWLEDGE_RUNTIME_OVERLAY_READY');
    } else if (command === 'verify') {
      const runtime = JSON.parse(execFileSync('docker', ['inspect', 'coro_backend'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }))[0];
      console.log(JSON.stringify(verifyRuntime(runtime, expected)));
    } else throw new Error('KNOWLEDGE_COMMAND_INVALID');
  } catch (error) {
    console.error(/^KNOWLEDGE_[A-Z_]+$/.test(error.message) ? error.message : 'KNOWLEDGE_RUNTIME_VALIDATION_FAILED');
    process.exitCode = 1;
  }
}
