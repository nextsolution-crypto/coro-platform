#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { pipeline } = require('stream');
const { downloadVerified } = require('./remote-download');

const inputManifestPath = process.argv[2];
const sourceMode = process.env.CORO_RESTORE_SOURCE || 'local';
const workspace = process.env.CORO_RESTORE_WORKSPACE || '/opt/coro-ops/restore-drills';
const createWorkspace = process.env.CORO_RESTORE_CREATE_WORKSPACE === 'true';
const cleanupEnabled = process.env.CORO_RESTORE_CLEANUP !== 'false';
const preserveOnFailure = process.env.CORO_RESTORE_PRESERVE_ON_FAILURE === 'true';
const postgresImage = process.env.CORO_RESTORE_POSTGRES_IMAGE || 'postgres:16-alpine';
const startupAttempts = Number(process.env.CORO_RESTORE_STARTUP_ATTEMPTS || 30);
const startupDelayMs = Number(process.env.CORO_RESTORE_STARTUP_DELAY_MS || 1000);

const startedAt = new Date().toISOString();
const timestamp = startedAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const suffix = crypto.randomBytes(6).toString('hex');
const restoreId = `${timestamp}-${suffix}`;
const restoreDatabase = `coro_restore_test_${timestamp.toLowerCase()}_${suffix}`;
const restoreContainer = `coro_restore_test_${suffix}_postgres_disposable`;
let reportPath = null;
let containerCreated = false;
let backupId = null;
let sourceDescription = sourceMode;
let remoteObjectKey = null;
let remoteVersionId = null;
let expectedSha256 = null;
let verifiedSha256 = null;
let migrationHeadExpected = null;
let migrationHeadRestored = null;
let versions = {};
let tableChecks = {};
let aggregateCounts = {};
let consistencyChecks = {};
let applicationSmoke = { status: 'NOT_RUN' };

class RestoreError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function ensure(condition, code, message) {
  if (!condition) throw new RestoreError(code, message);
}

function runDocker(args, code, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: options.timeout || 120000 });
  if (result.status !== 0) throw new RestoreError(code, options.message || 'Disposable Docker operation failed');
  return (result.stdout || '').trim();
}

function runDockerOptional(args) {
  return spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 30000 });
}

function streamIntoDocker(args, file, code) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const source = fs.createReadStream(file);
    const stdoutLimit = 4 * 1024 * 1024;
    const stderrLimit = 1024 * 1024;
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let pipelineComplete = false;
    let childClosed = false;
    let childStatus = null;
    let childSignal = null;
    let pendingFailure = null;
    let settled = false;

    const stopStreaming = () => {
      source.unpipe(child.stdin);
      if (!source.destroyed) source.destroy();
      if (!child.stdin.destroyed) child.stdin.destroy();
    };

    const settleFailure = () => {
      if (settled || !pendingFailure) return;
      settled = true;
      stopStreaming();
      reject(new RestoreError(code, pendingFailure));
    };

    const requestFailure = (message, terminateChild = true) => {
      if (settled || pendingFailure) return;
      pendingFailure = message;
      stopStreaming();
      if (terminateChild && !childClosed && child.exitCode === null && child.signalCode === null) child.kill();
      if (childClosed) settleFailure();
    };

    const maybeResolve = () => {
      if (settled) return;
      if (pendingFailure) {
        if (childClosed) settleFailure();
        return;
      }
      if (pipelineComplete && childClosed && childStatus === 0 && childSignal === null) {
        settled = true;
        resolve(stdout);
      }
    };

    const capture = (chunk, streamName) => {
      const bytes = Buffer.byteLength(chunk);
      if (streamName === 'stdout') {
        stdoutBytes += bytes;
        if (stdoutBytes > stdoutLimit) return requestFailure('Disposable restore stdout exceeded its safety limit');
        stdout += chunk.toString();
      } else {
        stderrBytes += bytes;
        if (stderrBytes > stderrLimit) return requestFailure('Disposable restore stderr exceeded its safety limit');
        stderr += chunk.toString();
      }
    };

    child.stdout.on('data', chunk => capture(chunk, 'stdout'));
    child.stderr.on('data', chunk => capture(chunk, 'stderr'));
    child.stdout.on('error', () => requestFailure('Disposable restore stdout failed'));
    child.stderr.on('error', () => requestFailure('Disposable restore stderr failed'));
    child.stdin.on('error', () => requestFailure('Backup artifact stream was rejected'));
    child.on('error', () => {
      pendingFailure = pendingFailure || 'Disposable restore process could not start';
      childClosed = true;
      settleFailure();
    });
    child.on('close', (status, signal) => {
      childClosed = true;
      childStatus = status;
      childSignal = signal;
      if (status !== 0 || signal !== null) pendingFailure = pendingFailure || 'Disposable restore process failed';
      if (!pipelineComplete && !pendingFailure) pendingFailure = 'Disposable restore process closed before the backup stream completed';
      if (pendingFailure) settleFailure(); else maybeResolve();
    });

    pipeline(source, child.stdin, error => {
      if (error) requestFailure('Backup artifact could not be streamed');
      else pipelineComplete = true;
      maybeResolve();
    });
  });
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('error', reject).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')));
  });
}

function sleep(ms) { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function psqlScalar(sql, code = 'RESTORE_SMOKE_FAILED') {
  return runDocker(['exec', restoreContainer, 'psql', '--no-password', '--username', 'postgres', '--dbname', restoreDatabase, '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', sql], code);
}

function safeJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new RestoreError(code, 'Required JSON evidence is invalid'); }
}

function atomicReport(status, errorCode = null) {
  if (!reportPath) return;
  const report = {
    reportVersion: 1, restoreId, backupId, startedAt, completedAt: new Date().toISOString(),
    source: sourceDescription, remoteObjectKey, remoteVersionId, expectedSha256, verifiedSha256,
    postgresBackupVersion: versions.backup || null, postgresRestoreVersion: versions.restore || null,
    restoreDatabase, restoreContainer, migrationHeadExpected, migrationHeadRestored,
    tableChecks, aggregateCounts, consistencyChecks, applicationSmoke, status, errorCode,
  };
  const partial = `${reportPath}.partial`;
  if (fs.existsSync(partial)) fs.rmSync(partial);
  fs.writeFileSync(partial, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  JSON.parse(fs.readFileSync(partial, 'utf8'));
  fs.renameSync(partial, reportPath);
  fs.chmodSync(reportPath, 0o600);
}

function cleanup() {
  if (!containerCreated) return 'NOT_REQUIRED';
  ensure(/^coro_restore_test_[a-f0-9]{12}_postgres_disposable$/.test(restoreContainer), 'CLEANUP_GUARD_REFUSED', 'Container name failed cleanup guard');
  ensure(restoreDatabase.startsWith('coro_restore_test_') && !['coro_db', 'postgres', 'template0', 'template1'].includes(restoreDatabase), 'CLEANUP_GUARD_REFUSED', 'Database name failed cleanup guard');
  const labels = runDocker(['inspect', '--format', '{{index .Config.Labels "io.getcoro.restore-owned"}}|{{index .Config.Labels "io.getcoro.restore-id"}}', restoreContainer], 'CLEANUP_GUARD_REFUSED');
  ensure(labels === `true|${restoreId}`, 'CLEANUP_GUARD_REFUSED', 'Disposable ownership labels do not match');
  runDocker(['rm', '-f', restoreContainer], 'CLEANUP_FAILED');
  containerCreated = false;
  return 'REMOVED';
}

async function main() {
  ensure(path.isAbsolute(inputManifestPath || ''), 'RESTORE_PRECHECK_FAILED', 'Manifest path must be absolute');
  ensure(/^coro_restore_test_/.test(restoreDatabase) && !['coro_db', 'postgres', 'template0', 'template1'].includes(restoreDatabase), 'RESTORE_PRECHECK_FAILED', 'Generated restore database is unsafe');
  ensure(restoreContainer.endsWith('_disposable') && restoreContainer !== 'coro_postgres', 'RESTORE_PRECHECK_FAILED', 'Generated restore container is unsafe');
  ensure(/^postgres:16(?:-|$)/.test(postgresImage), 'RESTORE_VERSION_MISMATCH', 'Restore image must be PostgreSQL 16');
  ensure(Number.isInteger(startupAttempts) && startupAttempts >= 1 && startupAttempts <= 120, 'RESTORE_PRECHECK_FAILED', 'Startup attempts are invalid');

  if (!fs.existsSync(workspace)) {
    ensure(createWorkspace, 'RESTORE_PRECHECK_FAILED', 'Private restore workspace does not exist');
    fs.mkdirSync(workspace, { recursive: true, mode: 0o700 });
  }
  ensure(path.isAbsolute(workspace) && fs.lstatSync(workspace).isDirectory() && !fs.lstatSync(workspace).isSymbolicLink(), 'RESTORE_PRECHECK_FAILED', 'Restore workspace is unsafe');
  fs.chmodSync(workspace, 0o700);
  reportPath = path.join(workspace, `${restoreId}.restore-report.json`);

  ensure(fs.existsSync(inputManifestPath) && fs.lstatSync(inputManifestPath).isFile() && !fs.lstatSync(inputManifestPath).isSymbolicLink(), 'RESTORE_MANIFEST_MISSING', 'Source manifest is missing or unsafe');
  const evidence = safeJson(inputManifestPath, 'RESTORE_MANIFEST_INVALID');
  backupId = evidence.backupId;
  expectedSha256 = evidence.sha256;
  migrationHeadExpected = evidence.migrationHead;
  versions.backup = evidence.pgDumpVersion;
  ensure(/^[A-Za-z_][A-Za-z0-9_-]*-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$/.test(backupId || ''), 'RESTORE_MANIFEST_INVALID', 'Backup ID is invalid');
  ensure(evidence.format === 'postgres-custom' && evidence.structuralValidation === 'PASSED', 'RESTORE_MANIFEST_INVALID', 'Backup format or structural evidence is invalid');
  ensure(Number.isSafeInteger(evidence.sizeBytes) && evidence.sizeBytes > 0 && /^[a-f0-9]{64}$/.test(expectedSha256 || ''), 'RESTORE_MANIFEST_INVALID', 'Backup size or checksum evidence is invalid');

  let dumpPath;
  if (sourceMode === 'remote') {
    ensure(evidence.status === 'REMOTE_VERIFIED' && evidence.remoteVerification === 'PASSED', 'REMOTE_EVIDENCE_MISSING', 'REMOTE_VERIFIED evidence is required');
    ensure(path.basename(inputManifestPath) === `${backupId}.remote.manifest.json`, 'REMOTE_EVIDENCE_MISSING', 'Remote evidence filename is invalid');
    const localEvidencePath = path.join(path.dirname(inputManifestPath), `${backupId}.manifest.json`);
    const localEvidence = safeJson(localEvidencePath, 'REMOTE_EVIDENCE_MISSING');
    ensure(localEvidence.backupId === backupId && localEvidence.status === 'LOCAL_VERIFIED' && localEvidence.sha256 === expectedSha256, 'REMOTE_EVIDENCE_MISSING', 'Original LOCAL_VERIFIED evidence does not match');
    const partial = path.join(workspace, `${restoreId}.download.dump.partial`);
    dumpPath = path.join(workspace, `${restoreId}.download.dump`);
    const downloaded = downloadVerified({ manifest: evidence, destinationPartial: partial, destinationFinal: dumpPath, expectedVersionId: process.env.CORO_RESTORE_REMOTE_VERSION_ID || null });
    remoteObjectKey = downloaded.remoteObjectKey;
    remoteVersionId = downloaded.remoteVersionId;
    sourceDescription = 'REMOTE_FRESH_DOWNLOAD';
  } else {
    ensure(evidence.status === 'LOCAL_VERIFIED' && evidence.remoteVerification === 'NOT_ATTEMPTED', 'RESTORE_MANIFEST_INVALID', 'Local source must use original LOCAL_VERIFIED evidence');
    ensure(path.basename(inputManifestPath) === `${backupId}.manifest.json`, 'RESTORE_MANIFEST_INVALID', 'Local manifest filename is invalid');
    dumpPath = path.join(path.dirname(inputManifestPath), `${backupId}.dump`);
  }
  ensure(fs.existsSync(dumpPath) && fs.lstatSync(dumpPath).isFile() && !fs.lstatSync(dumpPath).isSymbolicLink(), 'RESTORE_DUMP_MISSING', 'Verified dump is missing or unsafe');
  ensure(fs.statSync(dumpPath).size === evidence.sizeBytes, 'RESTORE_SIZE_MISMATCH', 'Dump size does not match manifest');
  verifiedSha256 = await sha256File(dumpPath);
  ensure(verifiedSha256 === expectedSha256, 'RESTORE_CHECKSUM_MISMATCH', 'Dump checksum does not match manifest');

  const collision = runDockerOptional(['inspect', restoreContainer]);
  ensure(collision.status !== 0, 'RESTORE_RESOURCE_COLLISION', 'Generated disposable container already exists');
  runDocker(['run', '--detach', '--name', restoreContainer, '--label', 'io.getcoro.restore-owned=true', '--label', `io.getcoro.restore-id=${restoreId}`, '--network', 'none', '--env', `POSTGRES_DB=${restoreDatabase}`, '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', postgresImage], 'POSTGRES_START_FAILED');
  containerCreated = true;
  let ready = false;
  for (let attempt = 0; attempt < startupAttempts; attempt += 1) {
    const result = runDockerOptional(['exec', restoreContainer, 'pg_isready', '--username', 'postgres', '--dbname', restoreDatabase]);
    if (result.status === 0) {
      sleep(startupDelayMs);
      const stableResult = runDockerOptional(['exec', restoreContainer, 'pg_isready', '--username', 'postgres', '--dbname', restoreDatabase]);
      if (stableResult.status === 0) { ready = true; break; }
    }
    sleep(startupDelayMs);
  }
  ensure(ready, 'POSTGRES_START_FAILED', 'Disposable PostgreSQL did not become ready');
  versions.restore = psqlScalar('SHOW server_version;', 'RESTORE_VERSION_MISMATCH');
  const backupMajorMatch = String(versions.backup || '').match(/([0-9]+)(?:\.[0-9]+)?/);
  ensure(backupMajorMatch && Number(backupMajorMatch[1]) === 16 && Number(versions.restore.split('.')[0]) === 16, 'RESTORE_VERSION_MISMATCH', 'PostgreSQL major versions are incompatible');

  const listOutput = await streamIntoDocker(['exec', '--interactive', restoreContainer, 'pg_restore', '--list'], dumpPath, 'RESTORE_ARCHIVE_INVALID');
  ensure(/^[0-9]+;\s+[0-9]+\s+/m.test(listOutput), 'RESTORE_ARCHIVE_INVALID', 'Archive contains no meaningful objects');
  await streamIntoDocker(['exec', '--interactive', restoreContainer, 'pg_restore', '--no-owner', '--no-privileges', '--exit-on-error', '--username', 'postgres', '--dbname', restoreDatabase], dumpPath, 'PG_RESTORE_FAILED');

  ensure(psqlScalar(`SELECT datname FROM pg_database WHERE datname = '${restoreDatabase}';`) === restoreDatabase, 'STRUCTURAL_CHECK_FAILED', 'Restore database is missing');
  ensure(psqlScalar("SELECT schema_name FROM information_schema.schemata WHERE schema_name='public';") === 'public', 'STRUCTURAL_CHECK_FAILED', 'Public schema is missing');
  const criticalTables = ['_prisma_migrations', 'Organization', 'Client', 'Building', 'User', 'PopulationSubscriber'];
  for (const table of criticalTables) {
    const exists = psqlScalar(`SELECT to_regclass('public.\"${table}\"') IS NOT NULL;`) === 't';
    tableChecks[table] = { exists };
    ensure(exists, 'CRITICAL_TABLE_MISSING', `Required table is missing: ${table}`);
    const count = Number(psqlScalar(`SELECT count(*) FROM \"${table}\";`));
    ensure(Number.isSafeInteger(count) && count >= 0, 'RESTORE_SMOKE_FAILED', `Invalid aggregate for table: ${table}`);
    aggregateCounts[table] = count;
  }
  migrationHeadRestored = psqlScalar('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1;');
  if (migrationHeadExpected && migrationHeadExpected !== 'UNKNOWN') ensure(migrationHeadRestored === migrationHeadExpected, 'MIGRATION_HEAD_MISMATCH', 'Restored migration head differs from backup evidence');

  const checks = {
    orphanUsers: 'SELECT count(*) FROM "User" u LEFT JOIN "Organization" o ON o.id=u."organizationId" WHERE o.id IS NULL;',
    orphanClients: 'SELECT count(*) FROM "Client" c LEFT JOIN "Organization" o ON o.id=c."organizationId" WHERE o.id IS NULL;',
    orphanBuildingsOrganization: 'SELECT count(*) FROM "Building" b LEFT JOIN "Organization" o ON o.id=b."organizationId" WHERE o.id IS NULL;',
    orphanBuildingsClient: 'SELECT count(*) FROM "Building" b LEFT JOIN "Client" c ON c.id=b."clientId" WHERE c.id IS NULL;',
    orphanPopulationSubscribers: 'SELECT count(*) FROM "PopulationSubscriber" s LEFT JOIN "PopulationProgram" p ON p.id=s."programId" WHERE p.id IS NULL;',
    invalidCanonicalPopulationPhones: `SELECT count(*) FROM "PopulationSubscriber" WHERE "phoneCanonical" IS NOT NULL AND "phoneCanonical" !~ '^\\+[1-9][0-9]{7,14}$';`,
  };
  for (const [name, sql] of Object.entries(checks)) {
    const count = Number(psqlScalar(sql));
    ensure(Number.isSafeInteger(count) && count >= 0, 'CONSISTENCY_CHECK_FAILED', 'Consistency aggregate is invalid');
    consistencyChecks[name] = count;
  }
  applicationSmoke = { status: 'PASSED', mode: 'READ_ONLY_SQL', checks: ['database-connectivity', 'critical-model-counts'] };
  atomicReport('RESTORE_VERIFIED');
  if (cleanupEnabled) cleanup();
  if (sourceMode === 'remote' && cleanupEnabled && dumpPath.startsWith(`${path.resolve(workspace)}${path.sep}`)) fs.rmSync(dumpPath);
  process.stdout.write(`restoreId=${restoreId}\nstatus=RESTORE_VERIFIED\nreportPath=${reportPath}\ncleanup=${cleanupEnabled ? 'COMPLETED' : 'SKIPPED'}\n`);
}

main().catch(error => {
  const code = error instanceof RestoreError ? error.code : (error && /^[A-Z0-9_]+$/.test(error.message || '') ? error.message : 'RESTORE_FAILED');
  try { atomicReport('RESTORE_FAILED', code); } catch { /* retain primary failure */ }
  if (containerCreated && cleanupEnabled && !preserveOnFailure) {
    try { cleanup(); } catch { /* never widen cleanup after guard refusal */ }
  }
  process.stderr.write(`ERROR_CODE=${code}\nERROR_MESSAGE=Restore drill did not complete\n`);
  process.exit(1);
});
