/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadTypescript(name) {
  const filename = path.join(__dirname, name);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(filename, module.parent);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(__dirname);
  loaded._compile(output, filename);
  return loaded.exports;
}

const time = loadTypescript('time.ts');
const projection = loadTypescript('projection.ts');

test('work week and day navigation stay on civil dates', () => {
  assert.deepEqual(time.viewDays('2026-09-23', 'week'), [
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
  ]);
  assert.equal(time.addDays('2026-09-23', -7), '2026-09-16');
  assert.equal(time.addDays('2026-09-23', 7), '2026-09-30');
  assert.deepEqual(time.viewDays('2026-09-23', 'day'), ['2026-09-23']);
});

test('request window uses local boundaries in the display time zone', () => {
  const window = time.requestWindow(time.viewDays('2026-09-23', 'week'), 'America/Toronto');
  assert.equal(window.start, '2026-09-21T04:00:00.000Z');
  assert.equal(window.end, '2026-09-26T04:00:00.000Z');
  assert.equal(time.dateKey(new Date('2026-09-23T02:00:00Z'), 'America/Toronto'), '2026-09-22');
  assert.equal(time.validTimeZone('Invalid/Zone'), false);
});

test('09:10–11:40 is positioned to the minute and early/late events extend the scale', () => {
  const hours = { start: 420, end: 1140 };
  const slot = time.segmentForDay({ startUtc: '2026-09-23T13:10:00Z',
    endUtc: '2026-09-23T15:40:00Z' }, '2026-09-23', 'America/Toronto', hours);
  assert.ok(Math.abs(slot.left - 130 / 720 * 100) < 0.001);
  assert.ok(Math.abs(slot.width - 150 / 720 * 100) < 0.001);
  assert.deepEqual(time.visibleHours(['2026-09-23'], 'America/Toronto', [
    { startUtc: '2026-09-23T10:00:00Z', endUtc: '2026-09-23T11:00:00Z' },
    { startUtc: '2026-09-24T01:00:00Z', endUtc: '2026-09-24T01:30:00Z' },
  ]), { start: 360, end: 1320 });
});

test('text projections distinguish requested, confirmed, pending and legacy events', () => {
  const base = { source: 'BOOKING', label: 'Visite', status: 'REQUESTED' };
  assert.match(projection.eventStatus(base), /non confirmée/);
  assert.equal(projection.eventStatus({ ...base, status: 'CONFIRMED' }), 'Confirmée');
  assert.match(projection.eventStatus({ ...base, status: 'PROVISIONAL' }), /attente/);
  assert.match(projection.eventStatus({ ...base, source: 'LEGACY_ACTIVITY' }), /Legacy/);
  const teamEvent = { ...base, status: 'PROVISIONAL', assignments: [
    { userId: 'accepted', role: 'LEAD', status: 'ACCEPTED' },
    { userId: 'pending', role: 'SUPPORT', status: 'PENDING' },
  ] };
  assert.equal(projection.eventStatus(projection.eventForUser(teamEvent, 'accepted')), 'Confirmée');
  assert.match(projection.eventStatus(projection.eventForUser(teamEvent, 'pending')), /attente/);
});

test('absence and colleague busy labels stay generic even with a private source label', () => {
  assert.equal(projection.eventLabel({ source: 'USER_UNAVAILABILITY', label: 'SICK privateNote', status: 'UNAVAILABLE' }), 'Indisponible');
  assert.equal(projection.eventLabel({ source: 'BOOKING', label: 'Client secret', status: 'BUSY' }), 'Occupé');
});

test('oversized API windows explain how to narrow the query', () => {
  assert.match(projection.planningErrorMessage(400), /Réduisez la période/);
  assert.match(projection.planningErrorMessage(400), /filtre/);
  assert.doesNotMatch(projection.planningErrorMessage(500), /Projection trop large/);
});
