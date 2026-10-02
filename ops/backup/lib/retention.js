#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const [directory, dryRunText, keepDaysText, keepCountText, keepNewestText] = process.argv.slice(2);
const dryRun = dryRunText === 'true';
const keepDays = Number(keepDaysText);
const keepCount = Number(keepCountText);
const keepNewest = Number(keepNewestText);

function stop(message) {
  process.stderr.write(`ERROR_CODE=RETENTION_PRECHECK_FAILED\nERROR_MESSAGE=${message}\n`);
  process.exit(1);
}

const realDirectory = fs.realpathSync(directory);
if (fs.lstatSync(directory).isSymbolicLink()) stop('Backup directory must not be a symbolic link');

const pattern = /^([A-Za-z_][A-Za-z0-9_-]*-([0-9]{8})T([0-9]{6})Z-[a-f0-9]{12})\.remote\.manifest\.json$/;
const backups = [];
for (const name of fs.readdirSync(directory)) {
  const match = name.match(pattern);
  if (!match) continue;
  const manifestPath = path.join(realDirectory, name);
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) continue;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { continue; }
  const backupId = match[1];
  if (manifest.backupId !== backupId || manifest.status !== 'REMOTE_VERIFIED' || manifest.remoteVerification !== 'PASSED') continue;
  const timestamp = `${match[2].slice(0, 4)}-${match[2].slice(4, 6)}-${match[2].slice(6, 8)}T${match[3].slice(0, 2)}:${match[3].slice(2, 4)}:${match[3].slice(4, 6)}Z`;
  const createdAt = Date.parse(timestamp);
  if (!Number.isFinite(createdAt)) continue;
  const names = [`${backupId}.dump`, `${backupId}.manifest.json`, `${backupId}.remote.manifest.json`];
  const files = names.map(candidate => path.join(realDirectory, candidate));
  if (!files.every(file => {
    if (!fs.existsSync(file)) return false;
    const fileStat = fs.lstatSync(file);
    return fileStat.isFile() && !fileStat.isSymbolicLink() && path.dirname(fs.realpathSync(file)) === realDirectory;
  })) continue;
  backups.push({ backupId, createdAt, files });
}

backups.sort((a, b) => b.createdAt - a.createdAt || b.backupId.localeCompare(a.backupId));
const cutoff = Date.now() - keepDays * 86400000;
const candidates = backups.filter((backup, index) => index >= keepNewest && (index >= keepCount || backup.createdAt < cutoff));

for (const candidate of candidates) {
  process.stdout.write(`${dryRun ? 'WOULD_DELETE' : 'DELETE'} backupId=${candidate.backupId}\n`);
  if (!dryRun) {
    for (const file of candidate.files) fs.unlinkSync(file);
  }
}
process.stdout.write(`retentionMode=${dryRun ? 'DRY_RUN' : 'APPLY'}\neligibleBackups=${backups.length}\ncandidates=${candidates.length}\n`);
