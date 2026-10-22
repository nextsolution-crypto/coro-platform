import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./coro-backup-diagnose.sh', import.meta.url), 'utf8');

test('backup diagnosis is read-only and redacts configuration', () => {
  assert.match(source, /df -Pk/);
  assert.match(source, /df -Pi/);
  assert.match(source, /systemctl show/);
  assert.match(source, /journalctl/);
  assert.match(source, /docker system df/);
  assert.match(source, /APT_CACHE_BYTES/);
  assert.doesNotMatch(source, /systemctl start|systemctl restart|docker prune|rm -/);
  assert.doesNotMatch(source, /^\s*(cat .*backup\.env|printenv|env)\s*$/m);
});

test('backup diagnosis calculates the canonical free-space gate', () => {
  assert.match(source, /CORO_BACKUP_MIN_FREE_BYTES:-5368709120/);
  assert.match(source, /CORO_BACKUP_MIN_FREE_PERCENT:-10/);
  assert.match(source, /largest_dump \* 2 \+ margin_bytes/);
  assert.match(source, /failure_code=LOW_DISK/);
});
