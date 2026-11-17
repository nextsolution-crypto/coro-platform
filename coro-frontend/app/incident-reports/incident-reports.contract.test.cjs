const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

test('connects draft resume, update and submit to governed endpoints', () => {
  assert.match(source, /incident-reports\/\$\{report\.id\}`/);
  assert.match(source, /api\.patch\(`\/organizations\/\$\{organizationId\}\/incident-reports\/\$\{active\.id\}`/);
  assert.match(source, /incident-reports\/\$\{active\.id\}\/submit/);
});

test('uploads an accepted attachment only after an explicit save', () => {
  assert.match(source, /incident-reports\/\$\{report\.id\}\/attachments/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /10 \* 1024 \* 1024/);
  assert.match(source, /if \(file\) await upload\(report, file\)/);
});

test('preserves independent review by assigning the signed-in reviewer', () => {
  assert.match(source, /reviewerUserId: user\.id/);
  assert.match(source, /incident-reports\/\$\{report\.id\}\/reviewer/);
  assert.match(source, /decision: 'APPROVED' \| 'CORRECTION_REQUESTED'/);
});
