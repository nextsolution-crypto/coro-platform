import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const source = readFileSync(new URL('./coro-capacity-cleanup.sh', import.meta.url), 'utf8');
const assignment = source.split('\n').find(line => line.startsWith('marker="$(find '));
assert.ok(assignment);
const run = path => spawnSync('bash', ['-c', `set -euo pipefail\n${assignment}\nprintf '%s' "$marker"`], {env:{...process.env,state_root:path},encoding:'utf8'});
test('selects newest reconciled marker without SIGPIPE on a large history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'coro-marker-history-'));
  try {
    let expected;
    for(let i=0;i<6000;i++) {
      const file = join(dir, `production-${String(i).padStart(40,'0')}.reconciled.json`);
      writeFileSync(file, '{}'); utimesSync(file, 1700000000+i, 1700000000+i); expected=file;
    }
    const result=run(dir);
    assert.equal(result.status,0,result.stderr);
    assert.equal(result.stdout,expected);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('preserves pipefail when reading the marker directory fails', () => {
  const dir = mkdtempSync(join(tmpdir(),'coro-marker-missing-'));
  try {assert.notEqual(run(join(dir,'does-not-exist')).status,0);}
  finally {rmSync(dir,{recursive:true,force:true});}
});
