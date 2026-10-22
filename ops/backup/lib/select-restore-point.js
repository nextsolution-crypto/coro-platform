#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function refuse(code, message) {
  process.stderr.write(`ERROR_CODE=${code}\nERROR_MESSAGE=${message}\n`);
  process.exit(1);
}

const backupId = process.argv[2] || '';
const backupDir = process.env.CORO_BACKUP_DIR || '/opt/coro-ops/backups/database';
const idPattern = /^[A-Za-z_][A-Za-z0-9_-]*-([0-9]{8}T[0-9]{6}Z)-[a-f0-9]{12}$/;
const match = backupId.match(idPattern);
if (!match) refuse('RESTORE_SELECTION_INVALID', 'Exact backup identifier is invalid');
if (!path.isAbsolute(backupDir) || !fs.existsSync(backupDir)) refuse('RESTORE_SELECTION_INVALID', 'Backup directory is unavailable');
const directory = fs.lstatSync(backupDir);
if (!directory.isDirectory() || directory.isSymbolicLink()) refuse('RESTORE_SELECTION_INVALID', 'Backup directory is unsafe');

const localPath = path.join(backupDir, `${backupId}.manifest.json`);
const remotePath = path.join(backupDir, `${backupId}.remote.manifest.json`);
for (const file of [localPath, remotePath]) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) {
    refuse('RESTORE_SELECTION_EVIDENCE_MISSING', 'Exact backup evidence is missing or unsafe');
  }
}

let local;
let remote;
try {
  local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  remote = JSON.parse(fs.readFileSync(remotePath, 'utf8'));
} catch {
  refuse('RESTORE_SELECTION_EVIDENCE_INVALID', 'Backup evidence is invalid JSON');
}

const shaPattern = /^[a-f0-9]{64}$/;
const createdAt = new Date(remote.createdAt);
const stamp = match[1];
const idTime = new Date(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`);
const valid =
  local.backupId === backupId && remote.backupId === backupId &&
  local.status === 'LOCAL_VERIFIED' && remote.status === 'REMOTE_VERIFIED' &&
  remote.remoteVerification === 'PASSED' &&
  shaPattern.test(local.sha256 || '') && remote.sha256 === local.sha256 &&
  Number.isSafeInteger(remote.sizeBytes) && remote.sizeBytes > 0 && remote.sizeBytes === local.sizeBytes &&
  typeof remote.databaseLogicalName === 'string' && remote.databaseLogicalName.length > 0 &&
  typeof remote.migrationHead === 'string' && remote.migrationHead.length > 0 && remote.migrationHead !== 'UNKNOWN' &&
  typeof remote.remoteObjectKey === 'string' && remote.remoteObjectKey.length > 0 &&
  typeof remote.remoteVersionId === 'string' && remote.remoteVersionId.length > 0 && remote.remoteVersionId !== 'null' &&
  remote.remoteRetentionStatus === 'VERSIONED_NO_WORM_GUARANTEE' &&
  Number.isFinite(createdAt.getTime()) && Number.isFinite(idTime.getTime()) && Math.abs(createdAt.getTime() - idTime.getTime()) < 1000;
if (!valid) refuse('RESTORE_SELECTION_EVIDENCE_INVALID', 'Backup provenance, integrity, migration or version evidence is inconsistent');

process.stdout.write(`${JSON.stringify({
  selectionVersion: 1,
  backupId,
  createdAt: remote.createdAt,
  databaseLogicalName: remote.databaseLogicalName,
  migrationHead: remote.migrationHead,
  sizeBytes: remote.sizeBytes,
  sha256: remote.sha256,
  remoteObjectKey: remote.remoteObjectKey,
  remoteVersionId: remote.remoteVersionId,
  retentionStatus: remote.remoteRetentionStatus,
  manifestPath: remotePath,
}, null, 2)}\n`);
