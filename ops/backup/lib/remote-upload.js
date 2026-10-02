#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const manifestPath = process.argv[2];
const endpoint = process.env.CORO_BACKUP_SPACES_ENDPOINT || '';
const region = process.env.CORO_BACKUP_SPACES_REGION || '';
const bucket = process.env.CORO_BACKUP_SPACES_BUCKET || '';
const prefix = process.env.CORO_BACKUP_SPACES_PREFIX || '';
const maxAttempts = Number(process.env.CORO_BACKUP_REMOTE_MAX_ATTEMPTS || 3);
const baseDelayMs = Number(process.env.CORO_BACKUP_RETRY_BASE_MS || 1000);
const statePath = process.env.CORO_BACKUP_STATE_PATH || (manifestPath ? path.join(path.dirname(manifestPath), 'backup-state.json') : '');

let currentBackupId = null;
let stateAllowed = false;

function fail(code, message) {
  updateState(false, code);
  process.stderr.write(`ERROR_CODE=${code}\nERROR_MESSAGE=${message}\n`);
  process.exit(1);
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function safeJson(file, code) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail(code, 'JSON document is unavailable or invalid');
  }
}

function atomicJson(file, value) {
  const partial = `${file}.partial`;
  if (fs.existsSync(partial) || fs.lstatSync(path.dirname(file)).isSymbolicLink()) {
    throw new Error('unsafe state path');
  }
  fs.writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  JSON.parse(fs.readFileSync(partial, 'utf8'));
  fs.renameSync(partial, file);
  fs.chmodSync(file, 0o600);
}

function updateState(success, errorCode, values = {}) {
  if (!stateAllowed) return;
  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* first state */ }
  const now = new Date().toISOString();
  const state = success ? {
    stateVersion: 1,
    lastAttemptAt: now,
    lastSuccessAt: now,
    lastBackupId: values.backupId,
    lastRemoteObject: values.remoteObject,
    lastSizeBytes: values.sizeBytes,
    lastSha256: values.sha256,
    consecutiveFailures: 0,
    lastErrorCode: null,
  } : {
    stateVersion: 1,
    lastAttemptAt: now,
    lastSuccessAt: previous.lastSuccessAt || null,
    lastBackupId: previous.lastBackupId || currentBackupId,
    lastRemoteObject: previous.lastRemoteObject || null,
    lastSizeBytes: previous.lastSizeBytes || null,
    lastSha256: previous.lastSha256 || null,
    consecutiveFailures: Number(previous.consecutiveFailures || 0) + 1,
    lastErrorCode: errorCode,
  };
  try { atomicJson(statePath, state); } catch { /* primary error remains authoritative */ }
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function sleep(ms) {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryable(text) {
  return /timeout|timed out|connection reset|temporar|429|500|502|503|504|slowdown|service unavailable/i.test(text);
}

function aws(args, errorCode, allowNotFound = false) {
  let lastText = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync('aws', ['--no-cli-pager', '--endpoint-url', endpoint, 's3api', ...args], {
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: Number(process.env.CORO_BACKUP_REMOTE_COMMAND_TIMEOUT_MS || 300000),
    });
    lastText = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.status === 0) return { found: true, stdout: result.stdout || '' };
    if (allowNotFound && /404|not found|nosuchkey/i.test(lastText)) return { found: false, stdout: '' };
    if (!isRetryable(lastText) || attempt === maxAttempts) break;
    const jitter = crypto.randomInt(0, Math.max(1, baseDelayMs + 1));
    sleep(baseDelayMs * (2 ** (attempt - 1)) + jitter);
  }
  if (/401|403|accessdenied|invalidaccesskey|signaturedoesnotmatch/i.test(lastText)) {
    fail('REMOTE_AUTH_FAILED', 'Remote authentication or authorization failed');
  }
  fail(errorCode, 'Remote S3-compatible operation failed');
}

function metadataValue(head, key) {
  const metadata = head.Metadata || head.metadata || {};
  return metadata[key] || metadata[key.toLowerCase()] || null;
}

async function main() {
  assert(manifestPath && path.isAbsolute(manifestPath), 'REMOTE_PRECHECK_FAILED', 'Manifest path must be absolute');
  assert(endpoint.startsWith('https://') && !/[?#]/.test(endpoint), 'REMOTE_PRECHECK_FAILED', 'Spaces endpoint must be a plain HTTPS endpoint');
  assert(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket), 'REMOTE_PRECHECK_FAILED', 'Spaces bucket is invalid');
  assert(/^[a-z0-9][a-z0-9-]*$/.test(region), 'REMOTE_PRECHECK_FAILED', 'Spaces region is invalid');
  assert(prefix && !prefix.startsWith('/') && !prefix.includes('..') && /^[A-Za-z0-9/_-]+\/$/.test(prefix), 'REMOTE_PRECHECK_FAILED', 'Spaces prefix is invalid');
  assert(Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 5, 'REMOTE_PRECHECK_FAILED', 'Retry count is invalid');
  assert(Number.isFinite(baseDelayMs) && baseDelayMs >= 0 && baseDelayMs <= 60000, 'REMOTE_PRECHECK_FAILED', 'Retry delay is invalid');
  assert(fs.existsSync(manifestPath) && fs.lstatSync(manifestPath).isFile() && !fs.lstatSync(manifestPath).isSymbolicLink(), 'REMOTE_PRECHECK_FAILED', 'Local manifest is unavailable or unsafe');

  const local = safeJson(manifestPath, 'REMOTE_PRECHECK_FAILED');
  currentBackupId = local.backupId;
  assert(local.status === 'LOCAL_VERIFIED' && local.remoteVerification === 'NOT_ATTEMPTED', 'REMOTE_PRECHECK_FAILED', 'Manifest is not LOCAL_VERIFIED');
  assert(/^[A-Za-z_][A-Za-z0-9_-]*-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$/.test(local.backupId), 'REMOTE_PRECHECK_FAILED', 'Backup ID is invalid');
  assert(typeof local.sha256 === 'string' && /^[a-f0-9]{64}$/.test(local.sha256), 'REMOTE_PRECHECK_FAILED', 'Manifest SHA-256 is invalid');
  assert(Number.isSafeInteger(local.sizeBytes) && local.sizeBytes > 0, 'REMOTE_PRECHECK_FAILED', 'Manifest size is invalid');
  assert(path.basename(manifestPath) === `${local.backupId}.manifest.json`, 'REMOTE_PRECHECK_FAILED', 'Manifest filename does not match backup ID');

  const directory = path.dirname(manifestPath);
  assert(!fs.lstatSync(directory).isSymbolicLink(), 'REMOTE_PRECHECK_FAILED', 'Backup directory must not be a symbolic link');
  const realDirectory = fs.realpathSync(directory);
  assert(path.isAbsolute(statePath) && path.dirname(statePath) === directory && fs.realpathSync(path.dirname(statePath)) === realDirectory, 'REMOTE_PRECHECK_FAILED', 'State path must be inside the backup directory');
  assert(!fs.existsSync(statePath) || (fs.lstatSync(statePath).isFile() && !fs.lstatSync(statePath).isSymbolicLink()), 'REMOTE_PRECHECK_FAILED', 'State path is unsafe');
  stateAllowed = true;
  const dumpPath = path.join(directory, `${local.backupId}.dump`);
  const remoteManifestPath = path.join(directory, `${local.backupId}.remote.manifest.json`);
  const pendingRemoteManifestPath = path.join(directory, `${local.backupId}.remote.manifest.json.pending`);
  const verifyDumpPath = path.join(directory, `${local.backupId}.remote-verify.dump.partial`);
  const verifyManifestPath = path.join(directory, `${local.backupId}.remote-verify.manifest.partial`);
  assert(fs.existsSync(dumpPath) && fs.lstatSync(dumpPath).isFile() && !fs.lstatSync(dumpPath).isSymbolicLink(), 'REMOTE_PRECHECK_FAILED', 'Local dump is unavailable or unsafe');
  assert(fs.statSync(dumpPath).size === local.sizeBytes, 'REMOTE_PRECHECK_FAILED', 'Local dump size does not match manifest');
  assert(await sha256File(dumpPath) === local.sha256, 'REMOTE_PRECHECK_FAILED', 'Local dump checksum does not match manifest');
  assert(!fs.existsSync(remoteManifestPath) && !fs.existsSync(pendingRemoteManifestPath) && !fs.existsSync(verifyDumpPath) && !fs.existsSync(verifyManifestPath), 'REMOTE_PRECHECK_FAILED', 'Remote transition artifact already exists');

  const match = local.backupId.match(/-([0-9]{4})([0-9]{2})([0-9]{2})T/);
  assert(match, 'REMOTE_PRECHECK_FAILED', 'Backup ID has no usable UTC date');
  const objectBase = `${prefix}${match[1]}/${match[2]}/${match[3]}/${local.backupId}`;
  const dumpKey = `${objectBase}.dump`;
  const manifestKey = `${objectBase}.manifest.json`;

  for (const key of [dumpKey, manifestKey]) {
    const existing = aws(['head-object', '--bucket', bucket, '--key', key, '--output', 'json'], 'REMOTE_PRECHECK_FAILED', true);
    assert(!existing.found, 'REMOTE_PRECHECK_FAILED', 'Refusing to overwrite an existing remote object');
  }

  aws(['put-object', '--bucket', bucket, '--key', dumpKey, '--body', dumpPath, '--acl', 'private', '--metadata', `sha256=${local.sha256},backup-id=${local.backupId}`, '--output', 'json'], 'REMOTE_UPLOAD_FAILED');
  const dumpHeadResult = aws(['head-object', '--bucket', bucket, '--key', dumpKey, '--output', 'json'], 'REMOTE_OBJECT_MISSING');
  const dumpHead = JSON.parse(dumpHeadResult.stdout);
  assert(Number(dumpHead.ContentLength) === local.sizeBytes, 'REMOTE_SIZE_MISMATCH', 'Remote dump size mismatch');
  assert(metadataValue(dumpHead, 'sha256') === local.sha256 && metadataValue(dumpHead, 'backup-id') === local.backupId, 'REMOTE_CHECKSUM_MISMATCH', 'Remote dump metadata mismatch');
  aws(['get-object', '--bucket', bucket, '--key', dumpKey, verifyDumpPath, '--output', 'json'], 'REMOTE_VERIFICATION_FAILED');
  assert(await sha256File(verifyDumpPath) === local.sha256, 'REMOTE_CHECKSUM_MISMATCH', 'Downloaded remote dump checksum mismatch');
  fs.rmSync(verifyDumpPath);

  const remoteManifest = {
    ...local,
    remoteVerification: 'PASSED',
    status: 'REMOTE_VERIFIED',
    remoteVerifiedAt: new Date().toISOString(),
    remoteBucket: bucket,
    remoteObjectKey: dumpKey,
    remoteManifestKey: manifestKey,
  };
  atomicJson(pendingRemoteManifestPath, remoteManifest);
  const remoteManifestSha = await sha256File(pendingRemoteManifestPath);
  const remoteManifestSize = fs.statSync(pendingRemoteManifestPath).size;
  aws(['put-object', '--bucket', bucket, '--key', manifestKey, '--body', pendingRemoteManifestPath, '--acl', 'private', '--metadata', `sha256=${remoteManifestSha},backup-id=${local.backupId}`, '--output', 'json'], 'REMOTE_MANIFEST_FAILED');
  const manifestHeadResult = aws(['head-object', '--bucket', bucket, '--key', manifestKey, '--output', 'json'], 'REMOTE_MANIFEST_FAILED');
  const manifestHead = JSON.parse(manifestHeadResult.stdout);
  assert(Number(manifestHead.ContentLength) === remoteManifestSize, 'REMOTE_MANIFEST_FAILED', 'Remote manifest size mismatch');
  assert(metadataValue(manifestHead, 'sha256') === remoteManifestSha && metadataValue(manifestHead, 'backup-id') === local.backupId, 'REMOTE_MANIFEST_FAILED', 'Remote manifest metadata mismatch');
  aws(['get-object', '--bucket', bucket, '--key', manifestKey, verifyManifestPath, '--output', 'json'], 'REMOTE_MANIFEST_FAILED');
  assert(await sha256File(verifyManifestPath) === remoteManifestSha, 'REMOTE_MANIFEST_FAILED', 'Downloaded remote manifest checksum mismatch');
  fs.rmSync(verifyManifestPath);
  fs.renameSync(pendingRemoteManifestPath, remoteManifestPath);
  fs.chmodSync(remoteManifestPath, 0o600);

  updateState(true, null, { backupId: local.backupId, remoteObject: dumpKey, sizeBytes: local.sizeBytes, sha256: local.sha256 });
  process.stdout.write(`backupId=${local.backupId}\nstatus=REMOTE_VERIFIED\nremoteObject=${dumpKey}\nsizeBytes=${local.sizeBytes}\nsha256=${local.sha256}\n`);
}

main().catch(() => fail('REMOTE_VERIFICATION_FAILED', 'Remote verification failed unexpectedly'));
