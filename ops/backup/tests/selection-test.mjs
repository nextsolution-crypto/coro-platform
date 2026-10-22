import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const subject = path.resolve('ops/backup/lib/select-restore-point.js');
const id = 'test-20261021T120000Z-abcdef123456';

function fixture(change = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coro-restore-selection-'));
  const base = {
    backupId: id, createdAt: '2026-10-21T12:00:00.000Z', databaseLogicalName: 'coro_qa_disposable',
    migrationHead: '20261101010000_test', sizeBytes: 123, sha256: 'a'.repeat(64),
  };
  const local = { ...base, status: 'LOCAL_VERIFIED', remoteVerification: 'NOT_ATTEMPTED' };
  const remote = { ...base, status: 'REMOTE_VERIFIED', remoteVerification: 'PASSED',
    remoteObjectKey: `database-backups/test/${id}.dump`, remoteVersionId: 'version-1',
    remoteRetentionStatus: 'VERSIONED_NO_WORM_GUARANTEE' };
  change(local, remote);
  fs.writeFileSync(path.join(dir, `${id}.manifest.json`), JSON.stringify(local));
  fs.writeFileSync(path.join(dir, `${id}.remote.manifest.json`), JSON.stringify(remote));
  return dir;
}

function run(dir, selectedId = id) {
  return spawnSync(process.execPath, [subject, selectedId], { encoding: 'utf8', env: { ...process.env, CORO_BACKUP_DIR: dir } });
}

test('selects only exact, internally consistent versioned evidence', () => {
  const selected = JSON.parse(run(fixture()).stdout);
  assert.equal(selected.backupId, id);
  assert.equal(selected.remoteVersionId, 'version-1');
  assert.equal(selected.retentionStatus, 'VERSIONED_NO_WORM_GUARANTEE');
});

for (const [name, change] of [
  ['wrong hash', (_l, r) => { r.sha256 = 'b'.repeat(64); }],
  ['unknown migration', (_l, r) => { r.migrationHead = 'UNKNOWN'; }],
  ['missing version', (_l, r) => { r.remoteVersionId = null; }],
  ['unverified retention', (_l, r) => { r.remoteRetentionStatus = 'UNKNOWN'; }],
  ['timestamp mismatch', (_l, r) => { r.createdAt = '2026-10-21T13:00:00.000Z'; }],
]) test(`rejects ${name}`, () => assert.notEqual(run(fixture(change)).status, 0));

test('does not fall back to another backup identifier', () => {
  assert.notEqual(run(fixture(), 'test-20261021T120001Z-abcdef123456').status, 0);
});
