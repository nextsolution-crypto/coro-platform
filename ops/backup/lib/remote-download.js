'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

function downloadVerified({ manifest, destinationPartial, destinationFinal, expectedVersionId }) {
  const endpoint = process.env.CORO_BACKUP_SPACES_ENDPOINT || '';
  const region = process.env.CORO_BACKUP_SPACES_REGION || '';
  if (!endpoint.startsWith('https://') || /[?#]/.test(endpoint)) throw new Error('REMOTE_DOWNLOAD_ENDPOINT_INVALID');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(region)) throw new Error('REMOTE_DOWNLOAD_REGION_INVALID');
  if (!manifest.remoteBucket || !manifest.remoteObjectKey) throw new Error('REMOTE_DOWNLOAD_EVIDENCE_MISSING');
  if (fs.existsSync(destinationPartial) || fs.existsSync(destinationFinal)) throw new Error('REMOTE_DOWNLOAD_COLLISION');

  const args = ['--no-cli-pager', '--endpoint-url', endpoint, 's3api', 'get-object', '--bucket', manifest.remoteBucket, '--key', manifest.remoteObjectKey];
  if (expectedVersionId) args.push('--version-id', expectedVersionId);
  args.push(destinationPartial, '--output', 'json');
  const result = spawnSync('aws', args, {
    encoding: 'utf8', env: process.env, maxBuffer: 1024 * 1024,
    timeout: Number(process.env.CORO_RESTORE_REMOTE_TIMEOUT_MS || 300000),
  });
  if (result.status !== 0) throw new Error(/403|AccessDenied|InvalidAccessKey/i.test(result.stderr || '') ? 'REMOTE_DOWNLOAD_AUTH_FAILED' : 'REMOTE_DOWNLOAD_FAILED');
  let response;
  try { response = JSON.parse(result.stdout || '{}'); } catch { throw new Error('REMOTE_DOWNLOAD_RESPONSE_INVALID'); }
  if (!fs.existsSync(destinationPartial) || !fs.lstatSync(destinationPartial).isFile() || fs.lstatSync(destinationPartial).isSymbolicLink()) throw new Error('REMOTE_DOWNLOAD_PARTIAL_INVALID');
  if (Number(response.ContentLength) !== manifest.sizeBytes || fs.statSync(destinationPartial).size !== manifest.sizeBytes) throw new Error('REMOTE_DOWNLOAD_SIZE_MISMATCH');
  const metadata = response.Metadata || {};
  if (metadata.sha256 !== manifest.sha256 || metadata['backup-id'] !== manifest.backupId) throw new Error('REMOTE_DOWNLOAD_METADATA_MISMATCH');
  if (expectedVersionId && response.VersionId !== expectedVersionId) throw new Error('REMOTE_DOWNLOAD_VERSION_MISMATCH');
  fs.renameSync(destinationPartial, destinationFinal);
  fs.chmodSync(destinationFinal, 0o600);
  return { remoteObjectKey: manifest.remoteObjectKey, remoteVersionId: response.VersionId || expectedVersionId || null };
}

module.exports = { downloadVerified };
