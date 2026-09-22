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
const activityVisual = loadTypescript('activityTypeVisual.ts');

test('activity type visual mapping is controlled and shared by planner views', () => {
  assert.deepEqual(activityVisual.getActivityTypeVisual({ nameFR: 'Formation', visualToken: 'VIOLET', iconKey: 'TRAINING' }),
    { label: 'Formation', color: '#7d3c98', icon: '◆' });
  assert.equal(activityVisual.getActivityTypeVisual({ nameFR: 'Inconnu', visualToken: 'url(evil)', iconKey: 'HTML' }).color, '#7b858d');
});

test('day, full week and work week use exact civil windows', () => {
  assert.deepEqual(time.viewDays('2026-09-23', 'workweek'), [
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
  ]);
  assert.deepEqual(time.viewDays('2026-09-23', 'week'), [
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27',
  ]);
  assert.deepEqual(time.viewDays('2026-09-23', 'day'), ['2026-09-23']);
  assert.equal(time.requestWindow(time.viewDays('2026-09-23', 'day'), 'America/Toronto').end, '2026-09-24T04:00:00.000Z');
});

test('request window uses local boundaries in the display time zone', () => {
  const window = time.requestWindow(time.viewDays('2026-09-23', 'workweek'), 'America/Toronto');
  assert.equal(window.start, '2026-09-21T04:00:00.000Z');
  assert.equal(window.end, '2026-09-26T04:00:00.000Z');
  assert.equal(time.dateKey(new Date('2026-09-23T02:00:00Z'), 'America/Toronto'), '2026-09-22');
  assert.equal(time.validTimeZone('Invalid/Zone'), false);
});

test('civil months include leap, common, 30-day and 31-day boundaries', () => {
  assert.equal(time.viewDays('2028-02-10', 'month').length, 29);
  assert.equal(time.viewDays('2027-02-10', 'month').length, 28);
  assert.equal(time.viewDays('2026-04-10', 'month').length, 30);
  assert.equal(time.viewDays('2026-01-10', 'month').length, 31);
  assert.equal(time.requestWindow(time.viewDays('2028-02-10', 'month'), 'America/Toronto').end, '2028-03-01T05:00:00.000Z');
});

test('month navigation crosses year boundaries without UTC date drift', () => {
  assert.equal(time.moveDate('2026-12-31', 'month', 1), '2027-01-31');
  assert.equal(time.moveDate('2027-01-31', 'month', -1), '2026-12-31');
  assert.equal(time.moveDate('2028-01-31', 'month', 1), '2028-02-29');
  assert.equal(time.monthGridDays('2027-02-12').length, 35);
  assert.equal(time.monthGridDays('2026-08-12').length, 42);
});

test('today and now position respect the selected IANA zone and DST', () => {
  const instant = new Date('2026-09-22T14:30:00Z');
  assert.equal(time.dateKey(instant, 'America/Toronto'), '2026-09-22');
  assert.equal(time.dateKey(instant, 'America/Vancouver'), '2026-09-22');
  assert.equal(time.nowPosition(instant, '2026-09-22', 'America/Toronto', { start: 480, end: 1020 }), 150 / 540 * 100);
  assert.equal(time.nowPosition(instant, '2026-09-21', 'America/Toronto', { start: 0, end: 1440 }), null);
  assert.deepEqual(time.nowMarker(instant, ['2026-09-21', '2026-09-22', '2026-09-23'], 'America/Toronto', { start: 480, end: 1020 }),
    { day: '2026-09-22', dayIndex: 1, position: 150 / 540 * 100 });
  const dst = time.requestWindow(time.viewDays('2026-03-08', 'day'), 'America/Toronto');
  assert.equal((new Date(dst.end) - new Date(dst.start)) / 3_600_000, 23);
});

test('timeline adapts day widths and renders one global now marker', () => {
  assert.equal(time.timelineDayMinWidth(1), 720);
  assert.equal(time.timelineDayMinWidth(5), 240);
  assert.equal(time.timelineDayMinWidth(7), 180);
  assert.equal(time.nowMarker(new Date('2026-09-22T14:30:00Z'), ['2026-09-22'], 'America/Toronto', { start: 480, end: 1020 }).dayIndex, 0);
});

test('month cell summary keeps textual request, conflict and unknown counts', () => {
  const startUtc = '2026-09-22T13:00:00Z';
  const events = Array.from({ length: 3 }, (_, index) => ({ id: `e${index}`, startUtc }));
  const actions = [
    { id: 'a1', type: 'BOOKING_REQUESTED', startUtc }, { id: 'a2', type: 'SCHEDULING_BLOCKED', startUtc },
    { id: 'a3', type: 'SCHEDULING_UNKNOWN', startUtc }, { id: 'a4', type: 'UNPLANNED_ACTIVITY', startUtc },
  ];
  const summary = time.monthDaySummary('2026-09-22', events, actions, 'America/Toronto');
  assert.equal(summary.events.length, 3); assert.equal(summary.requested, 1); assert.equal(summary.conflicts, 1);
  assert.equal(summary.unknown, 1); assert.equal(summary.unplanned, 1);
});

test('period labels and month-to-day URL retain filters', () => {
  assert.match(time.periodLabel(time.viewDays('2026-09-22', 'day'), 'day'), /22 septembre 2026/);
  assert.match(time.periodLabel(time.viewDays('2026-09-22', 'week'), 'week'), /21–27 septembre 2026/);
  assert.match(time.periodLabel(time.viewDays('2026-09-22', 'month'), 'month'), /septembre 2026/);
  const url = time.plannerDayUrl('date=2026-09-01&view=month&tz=America%2FToronto&clientId=c1&needsAction=true', '2026-09-22');
  assert.match(url, /date=2026-09-22/); assert.match(url, /view=day/); assert.match(url, /clientId=c1/); assert.match(url, /needsAction=true/);
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
