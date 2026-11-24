'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { byMonth, monthKeys, tally } = require('./demo-advisor-inventory.cjs');

test('groups values by month with before/after buckets', () => {
  const keys = monthKeys(new Date('2026-11-24T12:00:00Z'));
  assert.deepStrictEqual(keys, ['2026-08', '2026-09', '2026-10', '2026-11']);
  const out = byMonth(
    [{ d: '2026-11-02', h: 2.5 }, { d: '2026-11-03', h: 1 }, { d: '2026-07-01', h: 4 }, { d: '2027-01-01', h: 1 }],
    'd', keys, 'h',
  );
  assert.strictEqual(out['2026-11'], 3.5);
  assert.strictEqual(out.before, 4);
  assert.strictEqual(out.after, 1);
  assert.deepStrictEqual(tally([{ s: 'A' }, { s: 'A' }, { s: null }], 's'), { A: 2, NULL: 1 });
});

test('is read-only and prints no free text', () => {
  const src = fs.readFileSync(path.join(__dirname, 'demo-advisor-inventory.cjs'), 'utf8');
  assert.doesNotMatch(src, /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRaw/);
  assert.doesNotMatch(src, /select: \{[^}]*(name|email|firstName|lastName|description|note|contenu|texte|title)\s*:/);
});
