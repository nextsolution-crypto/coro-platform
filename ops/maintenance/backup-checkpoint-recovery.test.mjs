import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./coro-backup-checkpoint-recovery.sh', import.meta.url), 'utf8');

test('recovery preserves governed safety gates', () => {
  assert.match(source, /RECOVER_BACKUP_CHECKPOINT/);
  assert.match(source, /coro-production-deployment\.lock/);
  assert.match(source, /flock --nonblock/);
  assert.match(source, /docker image prune --force/);
  assert.doesNotMatch(source, /image prune .*--all|system prune|volume prune|rm -rf/);
});

test('recovery requires remote verification and restore readiness', () => {
  assert.match(source, /REMOTE_VERIFIED/);
  assert.match(source, /lastRemoteVersionId/);
  assert.match(source, /coro-db-restore-test\.service/);
  assert.match(source, /SAFE_RECLAIM_INSUFFICIENT/);
});
