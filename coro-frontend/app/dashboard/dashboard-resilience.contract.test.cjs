/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dashboard = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('dashboard distinguishes core failure, partial failure and empty data', () => {
  assert.match(dashboard, /Promise\.allSettled/);
  assert.match(dashboard, /Données principales indisponibles/);
  assert.match(dashboard, /Certaines informations sont temporairement indisponibles/);
  assert.match(dashboard, /Aucune activité prévue dans les 30 prochains jours/);
  assert.match(dashboard, /Réessayer/);
});

test('dashboard discards stale responses and exposes freshness', () => {
  assert.match(dashboard, /const sequence = \+\+requestSequence\.current/);
  assert.match(dashboard, /if \(sequence !== requestSequence\.current\) return/);
  assert.match(dashboard, /Actualisé à/);
});

test('dashboard uses native links and buttons for interactive cards', () => {
  assert.match(dashboard, /<Link key=\{kpi\.label\} href=\{kpi\.path\}/);
  assert.match(dashboard, /<button key=\{i\} type="button" disabled=\{item\.done \|\| item\.unavailable\}/);
  assert.doesNotMatch(dashboard, /<tr[\s\S]{0,120}onClick=/);
});

test('late tasks come from the canonical assigned-task endpoint', () => {
  assert.match(dashboard, /api\.get\('\/projects\/dashboard\/late-tasks'\)/);
  assert.match(dashboard, /setLateTasks\(dataAt\(6, 'tasks'\) \|\| \[\]\)/);
  assert.doesNotMatch(dashboard, /const \[lateTasks, setLateTasks\] = useState<any\[\]>\(\[\]\);[\s\S]*setLateTasks\(\[\]\)/);
});
