#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const command = process.argv[2];

function atomicJson(file, value) {
  const partial = `${file}.partial`;
  if (fs.existsSync(partial)) fs.rmSync(partial);
  fs.writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  fs.renameSync(partial, file);
  fs.chmodSync(file, 0o600);
}

function recordFailure() {
  const statePath = process.argv[3];
  const errorCode = process.argv[4];
  if (!path.isAbsolute(statePath || '') || !/^[A-Z0-9_]+$/.test(errorCode || '')) process.exit(2);
  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* first failure */ }
  atomicJson(statePath, {
    stateVersion: 1,
    lastAttemptAt: new Date().toISOString(),
    lastSuccessAt: previous.lastSuccessAt || null,
    lastBackupId: previous.lastBackupId || null,
    lastRemoteObject: previous.lastRemoteObject || null,
    lastSizeBytes: previous.lastSizeBytes || null,
    lastSha256: previous.lastSha256 || null,
    consecutiveFailures: Number(previous.consecutiveFailures || 0) + 1,
    lastErrorCode: errorCode,
  });
}

function safeAge(iso, now) {
  const time = Date.parse(iso || '');
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 1000)) : null;
}

function check() {
  const backupDir = process.env.CORO_BACKUP_DIR || '/opt/coro-ops/backups/database';
  const statePath = process.env.CORO_BACKUP_STATE_PATH || path.join(backupDir, 'backup-state.json');
  const restoreDir = process.env.CORO_RESTORE_WORKSPACE || '/opt/coro-ops/restore-drills';
  const warningSeconds = Number(process.env.CORO_BACKUP_WARNING_SECONDS || 7 * 3600);
  const criticalSeconds = Number(process.env.CORO_BACKUP_CRITICAL_SECONDS || 8 * 3600);
  const restoreWarningSeconds = Number(process.env.CORO_RESTORE_WARNING_SECONDS || 35 * 86400);
  const restoreCriticalSeconds = Number(process.env.CORO_RESTORE_CRITICAL_SECONDS || 45 * 86400);
  const now = process.env.CORO_HEALTH_NOW ? Date.parse(process.env.CORO_HEALTH_NOW) : Date.now();
  let status = 'HEALTHY';
  let reason = 'OK';
  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    state = null;
    status = 'CRITICAL'; reason = 'STATE_MISSING_OR_MALFORMED';
  }
  let backupAgeSeconds = null;
  let evidence = null;
  if (state) {
    backupAgeSeconds = safeAge(state.lastSuccessAt, now);
    const failures = Number(state.consecutiveFailures);
    if (backupAgeSeconds === null || !Number.isInteger(failures) || failures < 0) { status = 'CRITICAL'; reason = 'STATE_MALFORMED'; }
    else {
      const evidencePath = path.join(backupDir, `${state.lastBackupId}.remote.manifest.json`);
      try { evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); } catch { evidence = null; }
      if (!evidence || evidence.status !== 'REMOTE_VERIFIED' || evidence.backupId !== state.lastBackupId || evidence.sha256 !== state.lastSha256) { status = 'CRITICAL'; reason = 'REMOTE_EVIDENCE_MISSING'; }
      else if (failures >= 2 || backupAgeSeconds > criticalSeconds) { status = 'CRITICAL'; reason = failures >= 2 ? 'CONSECUTIVE_FAILURES' : 'BACKUP_STALE_CRITICAL'; }
      else if (failures > 0 || backupAgeSeconds > warningSeconds) { status = 'WARNING'; reason = failures > 0 ? 'RECENT_FAILURE' : 'BACKUP_STALE_WARNING'; }
    }
  }
  let lastRestoreSuccessAt = null;
  let lastRestoreAttemptAt = null;
  let lastRestoreStatus = null;
  let lastRestoreErrorCode = null;
  let restoreAgeSeconds = null;
  if (fs.existsSync(restoreDir) && fs.lstatSync(restoreDir).isDirectory() && !fs.lstatSync(restoreDir).isSymbolicLink()) {
    for (const name of fs.readdirSync(restoreDir)) {
      if (!name.endsWith('.restore-report.json')) continue;
      try {
        const report = JSON.parse(fs.readFileSync(path.join(restoreDir, name), 'utf8'));
        if (!lastRestoreAttemptAt || Date.parse(report.completedAt) > Date.parse(lastRestoreAttemptAt)) {
          lastRestoreAttemptAt = report.completedAt;
          lastRestoreStatus = report.status || null;
          lastRestoreErrorCode = report.errorCode || null;
        }
        if (report.status === 'RESTORE_VERIFIED' && (!lastRestoreSuccessAt || Date.parse(report.completedAt) > Date.parse(lastRestoreSuccessAt))) lastRestoreSuccessAt = report.completedAt;
      } catch { /* malformed reports are not successes */ }
    }
  }
  restoreAgeSeconds = safeAge(lastRestoreSuccessAt, now);
  if (restoreAgeSeconds === null || restoreAgeSeconds > restoreCriticalSeconds) { status = 'CRITICAL'; reason = restoreAgeSeconds === null ? 'RESTORE_SUCCESS_MISSING' : 'RESTORE_STALE_CRITICAL'; }
  else if (status === 'HEALTHY' && restoreAgeSeconds > restoreWarningSeconds) { status = 'WARNING'; reason = 'RESTORE_STALE_WARNING'; }
  const output = { status, reason, lastSuccessAt: state?.lastSuccessAt || null, backupAgeSeconds, consecutiveFailures: state?.consecutiveFailures ?? null, lastBackupId: state?.lastBackupId || null, lastErrorCode: state?.lastErrorCode || null, lastRestoreAttemptAt, lastRestoreSuccessAt, lastRestoreStatus, lastRestoreErrorCode, restoreAgeSeconds, alertProvider: 'NOT_CONFIGURED' };
  for (const [key, value] of Object.entries(output)) process.stdout.write(`${key}=${value === null ? '' : value}\n`);
  process.exit(status === 'HEALTHY' ? 0 : status === 'WARNING' ? 1 : 2);
}

if (command === 'record-failure') recordFailure();
else if (command === 'check') check();
else process.exit(2);
