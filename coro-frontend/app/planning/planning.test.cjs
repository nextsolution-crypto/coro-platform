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
const teamPicker = loadTypescript('teamPickerState.ts');
const previewCycle = loadTypescript('previewCycle.ts');

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

test('timeline grid keeps the advisor column separate for day, workweek and week', () => {
  for (const dayCount of [1, 5, 7]) {
    const layout = time.timelineGridLayout(dayCount, 3);
    assert.equal(layout.columnCount, dayCount + 1);
    assert.equal(layout.advisorColumn, 1);
    assert.equal(layout.dayColumns.length, dayCount);
    assert.deepEqual(layout.dayColumns, Array.from({ length: dayCount }, (_, index) => index + 2));
    assert.ok(layout.dayColumns.every(column => column !== layout.advisorColumn));
    assert.deepEqual(layout.resourceRows, [2, 3, 4]);
  }
});

test('timeline label density is detailed by day and readable over seven days', () => {
  const hours = { start: 7 * 60, end: 19 * 60 };
  const day = time.timelineLabelTicks(hours, 1);
  const workweek = time.timelineLabelTicks(hours, 5);
  const week = time.timelineLabelTicks(hours, 7);
  assert.ok(day.length > week.length);
  assert.deepEqual(workweek, [420, 540, 660, 780, 900, 1020, 1140]);
  assert.deepEqual(week, workweek);
  assert.ok(week.every((tick, index) => index === 0 || tick - week[index - 1] >= 120));
});

test('now marker resolves to one day column and one resource-row span', () => {
  const marker = time.nowMarker(new Date('2026-09-22T14:30:00Z'),
    time.viewDays('2026-09-22', 'week'), 'America/Toronto', { start: 420, end: 1140 });
  const layout = time.timelineGridLayout(7, 3);
  assert.deepEqual(marker && { count: 1, column: marker.dayIndex + 2 }, { count: 1, column: 3 });
  assert.equal(layout.nowRowStart, 2);
  assert.equal(layout.nowRowSpan, 3);
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

test('team picker keeps incomplete slots unknown and groups all three server statuses', () => {
  assert.equal(teamPicker.completeSlot('2026-09-23', '', 90), false);
  assert.equal(teamPicker.completeSlot('2026-09-23', '13:30', 90), true);
  const candidates = [
    { userId: 'available', availabilityStatus: 'AVAILABLE' },
    { userId: 'unknown', availabilityStatus: 'UNKNOWN' },
    { userId: 'blocked', availabilityStatus: 'BLOCKED' },
  ];
  const groups = teamPicker.groupCandidates(candidates);
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.map(row => row.userId)])), {
    AVAILABLE: ['available'], UNKNOWN: ['unknown'], BLOCKED: ['blocked'],
  });
});

test('capacity stays informational and never changes availability grouping', () => {
  const candidates = [
    { userId: 'blocked-low-load', availabilityStatus: 'BLOCKED', capacityCommittedPercent: 1, genericReason: 'Indisponible.' },
    { userId: 'available-high-load', availabilityStatus: 'AVAILABLE', capacityCommittedPercent: 90, genericReason: 'Disponible' },
  ];
  const groups = teamPicker.groupCandidates(candidates);
  assert.equal(groups.AVAILABLE[0].userId, 'available-high-load');
  assert.equal(groups.BLOCKED[0].userId, 'blocked-low-load');
  assert.equal(JSON.stringify(groups).includes('privateNote'), false);
});

test('AVAILABLE and UNKNOWN can be selected while BLOCKED cannot', () => {
  const candidates = [
    { userId: 'available', availabilityStatus: 'AVAILABLE' },
    { userId: 'unknown', availabilityStatus: 'UNKNOWN' },
    { userId: 'blocked', availabilityStatus: 'BLOCKED' },
  ];
  const empty = { leadId: '', supportIds: [] };
  assert.equal(teamPicker.selectLead(empty, 'available', candidates).leadId, 'available');
  assert.equal(teamPicker.selectLead(empty, 'unknown', candidates).leadId, 'unknown');
  assert.equal(teamPicker.selectLead(empty, 'blocked', candidates).leadId, '');
});

test('one LEAD excludes duplicate SUPPORT and SUPPORT remains unique', () => {
  const candidates = ['lead', 'support'].map(userId => ({ userId, availabilityStatus: 'AVAILABLE' }));
  let team = teamPicker.selectLead({ leadId: '', supportIds: ['lead'] }, 'lead', candidates);
  assert.deepEqual(team, { leadId: 'lead', supportIds: [] });
  team = teamPicker.toggleSupport(team, 'lead', candidates);
  assert.deepEqual(team.supportIds, []);
  team = teamPicker.toggleSupport(team, 'support', candidates);
  assert.deepEqual(team.supportIds, ['support']);
  team = teamPicker.toggleSupport(team, 'support', candidates);
  assert.deepEqual(team.supportIds, []);
});

test('slot or team edits mark the drawer dirty', () => {
  assert.equal(teamPicker.teamDirty({ leadId: '', supportIds: [] }, '', '', null), false);
  assert.equal(teamPicker.teamDirty({ leadId: 'steve', supportIds: [] }, '', '', null), true);
  assert.equal(teamPicker.teamDirty({ leadId: '', supportIds: [] }, '2026-09-23', '13:30', 90), true);
});

test('planner creation uses a single click and ignores event buttons', () => {
  const source = fs.readFileSync(path.join(__dirname, 'ResourceTimeline.tsx'), 'utf8');
  assert.match(source, /onClick=\{event =>/);
  assert.match(source, /closest\('button'\)/);
  assert.doesNotMatch(source, /onDoubleClick=/);
  assert.match(source, /onKeyDown=/);
});

test('planner mutations disable submit while saving and refresh projections without reload', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'ActivityPlanningDrawer.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.match(drawer, /disabled=\{planningSaving/);
  assert.match(drawer, /create-and-plan/);
  assert.match(drawer, /\/plan`/);
  assert.match(page, /setRefreshKey/);
  assert.doesNotMatch(page + drawer, /window\.location\.reload/);
});
test('3D drawer exposes explicit workflow modes without prompt-driven mutations', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  for (const mode of ['VIEW', 'EDIT_SLOT', 'RESCHEDULE', 'REASSIGN', 'CANCEL_SCHEDULE']) {
    assert.match(drawer, new RegExp(`['"]${mode}['"]`));
  }
  assert.doesNotMatch(drawer, /window\.(prompt|confirm)/);
  assert.match(drawer, /\/slot`/);
  assert.match(drawer, /\/team`/);
  assert.match(drawer, /cancel-schedule/);
});

test('3D Action Center covers every category with empty states and contextual actions', () => {
  const center = fs.readFileSync(path.join(__dirname, 'PlanningActionCenter.tsx'), 'utf8');
  for (const type of ['BOOKING_REQUESTED', 'NO_ACCEPTED_LEAD', 'PENDING_ASSIGNMENT',
    'SCHEDULING_BLOCKED', 'SCHEDULING_UNKNOWN', 'UNPLANNED_ACTIVITY']) assert.match(center, new RegExp(type));
  assert.match(center, /Aucune action requise/);
  assert.match(center, /Aucun conflit/);
  assert.match(center, /Planifier/);
  assert.match(center, /REASSIGN/);
  assert.match(center, /RESCHEDULE/);
});

test('3D preserves drafts, explicit UNKNOWN consent, loading and administrator-only mutations', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const activity = fs.readFileSync(path.join(__dirname, 'ActivityPlanningDrawer.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.match(drawer + activity, /confirmDiscard/);
  assert.match(drawer + activity, /confirmUnknown/);
  for (const label of ['previewLoading', 'saving', 'refreshing']) assert.match(drawer, new RegExp(label));
  assert.match(page, /\['ADMIN', 'SUPER_ADMIN'\]/);
  assert.doesNotMatch(drawer + activity, /window\.(prompt|confirm)/);
  assert.doesNotMatch(page + drawer + activity, /window\.location\.reload/);
});

test('3D mobile drawer and destructive confirmation remain keyboard-usable', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'planning.module.css'), 'utf8');
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /role="alertdialog"/);
  assert.match(drawer, /key\.key === 'Escape'/);
  assert.match(css, /100dvh/);
  assert.match(css, /\.candidateRow/);
});

test('mutation preview keeps the current team and rechecks every editable mode with the effective event slot', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  assert.ok(drawer.includes('setDate(dateKey(new Date(event.startUtc), event.sourceTimeZone))'));
  assert.ok(drawer.includes('setTime(formatClock(event.startUtc, event.sourceTimeZone))'));
  assert.ok(drawer.includes('[editable, previewBuildingId, previewTimeZone, date, time, durationMinutes]'));
  assert.ok(drawer.includes('buildingId: previewBuildingId, timeZone: previewTimeZone'));
  assert.equal(drawer.includes('setTeam(current =>'), false);
});

test('reschedule and reassign invalidate stale previews, expose API errors, and require complete preview coverage', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  assert.ok(drawer.includes("setCandidates([]); setConfirmUnknown(false); setPreviewError('')"));
  assert.ok(drawer.includes('previewCoversTeam'));
  assert.ok(drawer.includes('selectedIds.has(team.leadId)'));
  assert.ok(drawer.includes('team.supportIds.every'));
  assert.ok(drawer.includes('previewError ? <p className={styles.error} role="alert">'));
  assert.ok(drawer.includes('!previewError && <TeamPicker'));
  assert.ok(drawer.includes('hasBlocked && <p className={styles.error}'));
});

test('team preview retains AVAILABLE UNKNOWN and BLOCKED confidentiality contract', () => {
  const candidates = [
    { userId: 'demo', availabilityStatus: 'AVAILABLE' },
    { userId: 'unknown', availabilityStatus: 'UNKNOWN' },
    { userId: 'steve', availabilityStatus: 'BLOCKED' },
  ];
  const groups = teamPicker.groupCandidates(candidates);
  assert.deepEqual(groups.AVAILABLE.map(item => item.userId), ['demo']);
  assert.deepEqual(groups.UNKNOWN.map(item => item.userId), ['unknown']);
  assert.deepEqual(groups.BLOCKED.map(item => item.userId), ['steve']);
  const preview = fs.readFileSync(path.join(__dirname, 'SchedulingPreview.tsx'), 'utf8');
  assert.doesNotMatch(preview, /privateNote|absenceType|SICK|PERSONAL/);
});

test('VIEW stops mutation preview loading and refreshed projections never retain a stale Booking', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.ok(drawer.includes('previewCycles.current.invalidate()'));
  assert.ok(drawer.includes("setPreviewLoading(false); setPreviewError('')"));
  assert.ok(drawer.includes('editable && previewLoading'));
  assert.equal(page.includes('?? current : null'), false);
  assert.ok(page.includes('?? null : null'));
});

test('reassign preview depends on stable slot inputs and does not restart for an equivalent event object', () => {
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  assert.ok(drawer.includes('[editable, previewBuildingId, previewTimeZone, date, time, durationMinutes]'));
  assert.equal(drawer.includes('[event, mode, editable, date, time, durationMinutes]'), false);
  assert.ok(drawer.includes("api.post<TeamPreview>('/planning/team-preview', request, { signal: cycle.signal })"));
});

test('an aborted or stale preview cycle cannot publish over the latest cycle', () => {
  const guard = previewCycle.createPreviewCycleGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  first.cancel();
  assert.equal(first.signal.aborted, true);
  assert.equal(second.isCurrent(), true);
  second.cancel();
  assert.equal(second.isCurrent(), false);
});

test('normal preview cancellation is silent while a real HTTP failure remains reportable', () => {
  assert.equal(previewCycle.isPreviewCancellation({ name: 'AbortError' }), true);
  assert.equal(previewCycle.isPreviewCancellation({ name: 'CanceledError', code: 'ERR_CANCELED' }), true);
  assert.equal(previewCycle.isPreviewCancellation({ response: { status: 500 } }), false);
});

test('production reassign inputs build the expected request before Axios', () => {
  const request = previewCycle.buildTeamPreviewRequest({ buildingId: 'tour-premont', timeZone: 'America/Toronto',
    date: '2026-09-24', time: '13:15', durationMinutes: 90 }, time.localBoundary);
  assert.deepEqual(request, { buildingId: 'tour-premont', startUtc: '2026-09-24T17:15:00.000Z', durationMinutes: 90 });
});

test('invalid or throwing pre-fetch inputs cannot become a generic HTTP error', () => {
  const boundary = () => { throw new RangeError('invalid time zone'); };
  assert.throws(() => previewCycle.buildTeamPreviewRequest({ buildingId: 'building', timeZone: 'Invalid/Zone',
    date: '2026-09-24', time: '13:15', durationMinutes: 90 }, boundary), RangeError);
  assert.equal(previewCycle.buildTeamPreviewRequest({ buildingId: 'building', timeZone: 'America/Toronto',
    date: 'invalid', time: '13:15', durationMinutes: 90 }, time.localBoundary), null);
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  assert.ok(drawer.includes("setPreviewError('Le créneau est invalide. Vérifiez la date, l’heure et le fuseau horaire.')"));
});

test('VIEW and repeated mutation mode switches invalidate old preview cycles', () => {
  const guard = previewCycle.createPreviewCycleGuard();
  const reschedule = guard.begin();
  guard.invalidate();
  assert.equal(reschedule.isCurrent(), false);
  const reassign = guard.begin();
  assert.equal(reassign.isCurrent(), true);
  guard.invalidate();
  assert.equal(reassign.isCurrent(), false);
  assert.equal(previewCycle.createPreviewCycleGuard().begin().isCurrent(), true);
});
