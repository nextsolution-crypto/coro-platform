import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./coro-production-inspect', import.meta.url), 'utf8');

test('inspection resolves the active successful release rather than newest failed attempt', () => {
  assert.match(source, /m\.status==="SUCCESS"/);
  assert.match(source, /m\.state==="SUCCEEDED"&&m\.stage==="COMPLETED"/);
  assert.doesNotMatch(source, /name 'production-\*\.json'.*sed -n '1p'/);
});
