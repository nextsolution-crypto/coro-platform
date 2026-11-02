const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

test('archived or inactive projects expose a visible read-only explanation', () => {
  const page = source('page.tsx');
  assert.match(page, /project\?\.isActive === false \|\| project\?\.status === 'ARCHIVED'/);
  assert.match(page, /demeurent consultables en lecture seule/);
  assert.match(page, /role="status"/);
});

test('work and comments receive the server-authoritative read-only state', () => {
  const page = source('page.tsx');
  const work = source('MandateWorkTab.tsx');
  const comments = source('CommentsTab.tsx');
  assert.match(page, /readOnly=\{projectReadOnly\}/);
  assert.match(work, /const canMutate = !readOnly/);
  assert.match(comments, /!readOnly && <div/);
  assert.match(comments, /cause\.response\?\.data\?\.message/);
});
