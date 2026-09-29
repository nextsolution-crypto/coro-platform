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
const mandateFormState = loadTypescript('../projects/[id]/mandate/mandateFormState.ts');
const mandateCommercial = loadTypescript('../projects/[id]/mandate/mandateCommercialState.ts');
const mandateOperational = loadTypescript('../projects/[id]/mandate/mandateOperationalState.ts');
const mandateSave = loadTypescript('../projects/[id]/mandate/mandateSavePlan.ts');

test('Mandate save plan separates Fiche, Services and first-Mandate bootstrap', () => {
  assert.deepEqual(mandateSave.mandateSavePlan({ mandateExists: true, mandateFieldsDirty: true,
    servicesDirty: false, commercialRevision: 'r' }),
  { saveMandate: true, bootstrapCommercialRevision: false, saveServices: false });
  assert.deepEqual(mandateSave.mandateSavePlan({ mandateExists: true, mandateFieldsDirty: false,
    servicesDirty: true, commercialRevision: 'r' }),
  { saveMandate: false, bootstrapCommercialRevision: false, saveServices: true });
  assert.deepEqual(mandateSave.mandateSavePlan({ mandateExists: false, mandateFieldsDirty: false,
    servicesDirty: true, commercialRevision: null }),
  { saveMandate: true, bootstrapCommercialRevision: true, saveServices: true });
});

test('Mandate commercial drafts preserve persisted identity, removed rows and duplicate ActivityTypes', () => {
  const rows = mandateCommercial.serviceDraftsFromServer([
    { id: 'second', projectMandateId: 'm', activityTypeId: 'type-a', commercialStatus: 'REMOVED', recurrenceMode: 'ANNUAL', quantity: 2, displayOrder: 1, nameFRSnapshot: 'A', nameENSnapshot: null, removedAt: 'now', createdAt: 'then', updatedAt: 'now' },
    { id: 'first', projectMandateId: 'm', activityTypeId: 'type-a', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0, nameFRSnapshot: 'A', nameENSnapshot: null, removedAt: null, createdAt: 'then', updatedAt: 'then' },
  ]);
  assert.deepEqual(rows.map(item => item.id), ['first', 'second']);
  assert.equal(rows[1].commercialStatus, 'REMOVED');
  assert.equal(mandateCommercial.mandateServicesAreDirty(rows, mandateCommercial.cloneServiceDrafts(rows)), false);
  const changed = mandateCommercial.updateServiceDraft(rows, 'first', { quantity: 3 });
  assert.equal(mandateCommercial.mandateServicesAreDirty(changed, rows), true);
  assert.deepEqual(mandateCommercial.resetServiceDrafts(rows), rows);
});

test('Mandate commercial draft mutations use row identity and build the canonical save payload', () => {
  let rows = mandateCommercial.addServiceDraft([], 'type-a', 'local-1');
  assert.equal(mandateCommercial.addServiceDraft(rows, 'type-a', 'blocked').length, 1);
  rows = mandateCommercial.addServiceDraft(rows, 'type-a', 'local-2', true);
  assert.deepEqual(rows.map(item => item.localDraftId), ['local-1', 'local-2']);
  rows = mandateCommercial.removeServiceDraft(rows, 'local-1');
  assert.deepEqual(rows.map(item => item.localDraftId), ['local-2']);
  rows = mandateCommercial.removeServiceDraft(rows, 'local-2');
  assert.deepEqual(mandateCommercial.buildSaveMandateServicesPayload('revision', rows), {
    expectedRevision: 'revision', services: [],
  });
});

test('Mandate historical transition detects history without deriving commercial selection', () => {
  assert.equal(mandateCommercial.deriveHistoricalCommercialTransition(false, [], [{ sourceMandate: true }]), 'NEW_EMPTY');
  assert.equal(mandateCommercial.deriveHistoricalCommercialTransition(true, [], []), 'NEW_EMPTY');
  assert.equal(mandateCommercial.deriveHistoricalCommercialTransition(true, [], [{ sourceMandate: true, activityTypeId: null }]),
    'HISTORICAL_CONFIRMATION_REQUIRED');
  const suggestions = mandateCommercial.historicalServiceSuggestions([
    { sourceMandate: true, activityTypeId: 'a' }, { sourceMandate: true, activityTypeId: 'a' },
  ]);
  assert.deepEqual(suggestions, [{ activityTypeId: 'a', activityCount: 2, selected: false }]);
});

test('Mandate catalog classification prevents accidental duplicate additions and restorations', () => {
  const active = { id: 'active', activityTypeId: 'a', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0 };
  const removed = { id: 'removed', activityTypeId: 'a', commercialStatus: 'REMOVED', recurrenceMode: 'ANNUAL', quantity: 2, displayOrder: 0 };
  assert.deepEqual(mandateCommercial.classifyCatalogService('a', []), { state: 'AVAILABLE' });
  assert.deepEqual(mandateCommercial.classifyCatalogService('a', [removed]),
    { state: 'REMOVED_RESTORABLE', restorableId: 'removed' });
  assert.equal(mandateCommercial.canRestoreService([removed], 'removed', new Set(['a'])), true);
  assert.equal(mandateCommercial.canRestoreService([active, removed], 'removed', new Set(['a'])), false);
  assert.equal(mandateCommercial.classifyCatalogService('a', [active, removed]).state, 'ALREADY_ACTIVE');
  assert.equal(mandateCommercial.classifyCatalogService('a', [removed, { ...removed, id: 'removed-2' }]).state,
    'MULTIPLE_EXISTING');
  assert.equal(mandateCommercial.canRestoreService([removed], 'removed', new Set()), false);
});

test('Mandate desired payload preserves existing duplicates, removes omitted rows and normalizes order', () => {
  const rows = [
    { id: 'a1', activityTypeId: 'a', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0 },
    { id: 'a2', activityTypeId: 'a', commercialStatus: 'REMOVED', recurrenceMode: 'ANNUAL', quantity: 2, displayOrder: 1 },
    { id: 'b', activityTypeId: 'b', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 2 },
  ];
  const payload = mandateCommercial.buildSaveMandateServicesPayload('revision', rows);
  assert.deepEqual(payload.services.map(item => [item.id, item.displayOrder]), [['a1', 0], ['b', 1]]);
  const restored = mandateCommercial.restoreServiceAtEnd(rows, 'a2');
  assert.equal(restored.find(item => item.id === 'a2').displayOrder, 3);
});

test('Mandate commercial validation targets desired active rows and permits archived persisted active rows', () => {
  const persisted = { id: 'old', activityTypeId: 'archived', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0 };
  assert.equal(mandateCommercial.validateMandateServices([persisted], [persisted], new Set()).valid, true);
  const invalid = mandateCommercial.validateMandateServices([
    { localDraftId: 'new', activityTypeId: 'active', commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE', quantity: 0, displayOrder: 1 },
  ], [], new Set(['active']));
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.new, /entier/);
});

test('Mandate operational preview is fail-safe for unknown actions and reasons', () => {
  const unknownAction = mandateOperational.mapPreviewOperation({ serviceId: 's1', action: 'SURPRISE', reasonCode: 'NO_ACTIVITY_EXISTS' });
  const unknownReason = mandateOperational.mapPreviewOperation({ serviceId: 's1', action: 'CREATE_ACTIVITY', reasonCode: 'SURPRISE' });
  assert.equal(unknownAction.label, 'Vérification requise');
  assert.equal(unknownAction.mutationAllowed, false);
  assert.equal(unknownReason.label, 'Vérification requise');
  assert.equal(unknownReason.mutationAllowed, false);
});

test('Mandate operational preview maps canonical actions and planning statuses', () => {
  const cases = [
    ['NO_ACTION', 'ACTIVE_ACTIVITY_EXISTS', 'ACTIVE'],
    ['NO_ACTION', 'COMPLETED_ACTIVITY_EXISTS', 'COMPLETED'],
    ['CREATE_ACTIVITY', 'NO_ACTIVITY_EXISTS', 'TO_APPLY'],
    ['REQUIRES_DECISION', 'LEGACY_ACTIVITY_CANDIDATE', 'ACTION_REQUIRED'],
    ['REQUIRES_DECISION', 'LEGACY_MULTIPLE_CANDIDATES', 'ACTION_REQUIRED'],
    ['REQUIRES_DECISION', 'LATEST_ACTIVITY_CANCELLED', 'ACTION_REQUIRED'],
    ['REQUIRES_DECISION', 'MULTIPLE_ACTIVE_ACTIVITIES', 'ACTION_REQUIRED'],
    ['BLOCKED', 'ACTIVITY_TYPE_ARCHIVED', 'BLOCKED'],
  ];
  for (const [action, reasonCode, status] of cases) {
    assert.equal(mandateOperational.mapPreviewOperation({ serviceId: 's', action, reasonCode }).status, status);
  }
  assert.equal(mandateOperational.planningStatusLabel('TO_PLAN'), 'À planifier');
  assert.equal(mandateOperational.planningStatusLabel('LEAD_PENDING'), 'Affectation à confirmer');
  assert.equal(mandateOperational.planningStatusLabel('UNKNOWN'), 'Vérification requise');
});

test('Mandate permissions and API errors remain tenant-safe and domain-specific', () => {
  assert.equal(mandateCommercial.canEditMandateServices('ADMIN'), true);
  assert.equal(mandateCommercial.canEditMandateServices('SUPER_ADMIN'), true);
  assert.equal(mandateCommercial.canEditMandateServices('OPERATOR'), false);
  assert.equal(mandateCommercial.canApplyMandateOperations('OPERATOR'), false);
  assert.equal(mandateCommercial.normalizeMandateApiError({ response: { status: 409, data: { message: 'Conflit' } } }).kind,
    'conflict');
  assert.equal(mandateCommercial.normalizeMandateApiError(new Error('offline')).kind, 'network');
});

test('Mandate apply intent keeps one UUID across retries and changes it for a new intent', () => {
  const decisions = [{ mandateServiceId: 's1', action: 'CREATE_ACTIVITY' }];
  const signature = mandateOperational.applyIntentSignature('revision', decisions);
  const first = mandateOperational.idempotencyKeyForIntent(null, signature, () => 'uuid-1');
  const retry = mandateOperational.idempotencyKeyForIntent(first, signature, () => 'uuid-2');
  const next = mandateOperational.idempotencyKeyForIntent(first,
    mandateOperational.applyIntentSignature('other', decisions), () => 'uuid-2');
  const adoptX = mandateOperational.applyIntentSignature('revision',
    [{ mandateServiceId: 's1', action: 'ADOPT_LEGACY_ACTIVITY', activityId: 'x' }]);
  const adoptY = mandateOperational.applyIntentSignature('revision',
    [{ mandateServiceId: 's1', action: 'ADOPT_LEGACY_ACTIVITY', activityId: 'y' }]);
  assert.equal(retry.key, 'uuid-1');
  assert.equal(next.key, 'uuid-2');
  assert.notEqual(adoptX, signature);
  assert.notEqual(adoptX, adoptY);
  assert.equal(mandateOperational.clearApplyIntent(), null);
  assert.deepEqual(mandateOperational.buildApplyMandateOperationsPayload(retry.key, 'revision', decisions),
    { idempotencyKey: 'uuid-1', expectedRevision: 'revision', decisions });
});

test('Mandate G3 operational projection fails closed and only enables canonical CREATE', () => {
  const operation = (action, reasonCode, extra = {}) => ({ serviceId: 's1', action, reasonCode, ...extra });
  const base = { serviceId: 's1', commercialStatus: 'ACTIVE', commerciallyClean: true,
    previewCurrent: true, canApply: true, applyStatus: 'IDLE', applyingServiceId: null };
  const create = mandateOperational.operationalViewForService({ ...base,
    operations: [operation('CREATE_ACTIVITY', 'NO_ACTIVITY_EXISTS')] });
  assert.equal(create.primaryAction, 'CREATE');
  assert.equal(create.mutationAllowed, true);
  for (const changed of [
    { commerciallyClean: false }, { previewCurrent: false }, { canApply: false },
    { commercialStatus: 'REMOVED' }, { operations: [] },
    { operations: [operation('CREATE_ACTIVITY', 'NO_ACTIVITY_EXISTS'), operation('CREATE_ACTIVITY', 'NO_ACTIVITY_EXISTS')] },
    { operations: [operation('CREATE_ACTIVITY', 'SURPRISE')] },
  ]) {
    const view = mandateOperational.operationalViewForService({ ...base,
      operations: [operation('CREATE_ACTIVITY', 'NO_ACTIVITY_EXISTS')], ...changed });
    assert.equal(view.mutationAllowed, false);
    assert.equal(view.primaryAction, null);
  }
  const unsaved = mandateOperational.operationalViewForService({ ...base, serviceId: undefined, operations: [] });
  assert.equal(unsaved.status, 'UNSAVED');
});

test('Mandate G3 projection uses service identity, planning status and one unknown retry', () => {
  const indexed = mandateOperational.indexPreviewOperations([
    { serviceId: 's1', action: 'NO_ACTION', reasonCode: 'ACTIVE_ACTIVITY_EXISTS', linkedActivities: [{ id: 'a1', planningStatus: 'TO_PLAN' }] },
    { serviceId: 's2', action: 'CREATE_ACTIVITY', reasonCode: 'NO_ACTIVITY_EXISTS' },
  ]);
  assert.equal(indexed.get('s1')[0].linkedActivities[0].id, 'a1');
  assert.equal(indexed.get('s2')[0].action, 'CREATE_ACTIVITY');
  const planned = mandateOperational.operationalViewForService({ serviceId: 's1', commercialStatus: 'ACTIVE',
    commerciallyClean: true, previewCurrent: true, operations: indexed.get('s1'), canApply: true,
    applyStatus: 'IDLE', applyingServiceId: null });
  assert.equal(planned.planningAction, true);
  const retry = mandateOperational.operationalViewForService({ serviceId: 's2', commercialStatus: 'ACTIVE',
    commerciallyClean: true, previewCurrent: true, operations: indexed.get('s2'), canApply: true,
    applyStatus: 'UNKNOWN', applyingServiceId: 's2' });
  assert.equal(retry.primaryAction, 'RETRY_CREATE');
});

test('Mandate operational runtime uses one Preview/Apply architecture and keeps mutations separate from Save', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/useMandateOperations.ts'), 'utf8');
  const editor = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/MandateServicesEditor.tsx'), 'utf8');
  assert.match(runtime, /previewMandateOperations\(projectId, revision, signal\)/);
  assert.match(runtime, /applyMandateOperations\(projectId, next\.payload\)/);
  assert.match(runtime, /if \(axios\.isAxiosError\(error\) && !error\.response\)/);
  assert.match(runtime, /void sendApply\(applyState\)/);
  assert.match(runtime, /setPreviewState\(\{ status: 'READY'.*result\.preview/s);
  assert.match(editor, /Créer l’activité/);
  assert.match(runtime, /ADOPT_LEGACY_ACTIVITY/);
  assert.match(runtime, /CREATE_REPLACEMENT/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage/);
});

test('Mandate G4 exposes explicit ADOPT only for exact Preview candidates', () => {
  const base = { serviceId: 'service', commercialStatus: 'ACTIVE', commerciallyClean: true,
    previewCurrent: true, canApply: true, applyStatus: 'IDLE', applyingServiceId: null };
  const candidate = { id: 'activity', label: 'Historique', status: 'a_faire' };
  const single = mandateOperational.operationalViewForService({ ...base, operations: [{ serviceId: 'service',
    action: 'REQUIRES_DECISION', reasonCode: 'LEGACY_ACTIVITY_CANDIDATE', legacyCandidates: [candidate] }] });
  const multiple = mandateOperational.operationalViewForService({ ...base, operations: [{ serviceId: 'service',
    action: 'REQUIRES_DECISION', reasonCode: 'LEGACY_MULTIPLE_CANDIDATES', legacyCandidates: [candidate, { ...candidate, id: 'other' }] }] });
  assert.equal(single.primaryAction, 'EXAMINE_ADOPT');
  assert.equal(multiple.primaryAction, 'EXAMINE_ADOPT');
  for (const legacyCandidates of [[], [candidate, candidate]]) {
    const unsafe = mandateOperational.operationalViewForService({ ...base, operations: [{ serviceId: 'service',
      action: 'REQUIRES_DECISION', reasonCode: 'LEGACY_ACTIVITY_CANDIDATE', legacyCandidates }] });
    assert.equal(unsafe.primaryAction, null);
  }
  assert.equal(mandateOperational.operationalViewForService({ ...base, canApply: false, operations: [{ serviceId: 'service',
    action: 'REQUIRES_DECISION', reasonCode: 'LEGACY_ACTIVITY_CANDIDATE', legacyCandidates: [candidate] }] }).primaryAction, null);
});

test('Mandate G4 replacement requires one exact cancelled source and creatable policy', () => {
  const source = { id: 'cancelled', label: 'Ancienne', status: 'annule' };
  const base = { serviceId: 'service', commercialStatus: 'ACTIVE', commerciallyClean: true,
    previewCurrent: true, activityTypeActive: true, canApply: true, applyStatus: 'IDLE', applyingServiceId: null };
  const operation = { serviceId: 'service', action: 'REQUIRES_DECISION', reasonCode: 'LATEST_ACTIVITY_CANCELLED',
    recurrenceMode: 'ONCE', quantity: 1, linkedActivities: [source] };
  assert.equal(mandateOperational.operationalViewForService({ ...base, operations: [operation] }).primaryAction,
    'EXAMINE_REPLACEMENT');
  for (const changed of [
    { operations: [{ ...operation, linkedActivities: [source, { ...source, id: 'other' }] }] },
    { operations: [{ ...operation, recurrenceMode: 'ANNUAL' }] },
    { operations: [{ ...operation, quantity: 2 }] }, { activityTypeActive: false, operations: [operation] },
    { operations: [{ ...operation, reasonCodes: ['LATEST_ACTIVITY_CANCELLED', 'OPEN_BOOKING_EXISTS'] }] },
    { commercialStatus: 'REMOVED', operations: [operation] },
  ]) assert.equal(mandateOperational.operationalViewForService({ ...base, ...changed }).primaryAction, null);
});

test('Mandate G4 dialog requires human selection and exposes accessible controls without heuristics', () => {
  const dialog = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/MandateOperationDecisionDialog.tsx'), 'utf8');
  const runtime = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/useMandateOperations.ts'), 'utf8');
  assert.match(dialog, /role="dialog"/); assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /role=\{state\.mode === 'ADOPT' \? 'radiogroup'/);
  assert.match(dialog, /useState<string \| null>\(null\)/);
  assert.match(dialog, /event\.key === 'Escape'/); assert.match(dialog, /previousFocus\.current\?\.focus/);
  assert.doesNotMatch(dialog, /candidates\[0\]\.id/);
  assert.doesNotMatch(runtime, /sort\(|matchScore|confidence|similarity|projects\/\$\{.*\}\/activities/);
});

test('Mandate G4 payload signatures separate action, candidate, revision and project', () => {
  const adopt = [{ mandateServiceId: 's', action: 'ADOPT_LEGACY_ACTIVITY', activityId: 'a' }];
  const replace = [{ mandateServiceId: 's', action: 'CREATE_REPLACEMENT', activityId: 'a' }];
  assert.notEqual(mandateOperational.applyIntentSignature('r1', adopt), mandateOperational.applyIntentSignature('r1', replace));
  assert.notEqual(mandateOperational.applyIntentSignature('r1', adopt), mandateOperational.applyIntentSignature('r1', [{ ...adopt[0], activityId: 'b' }]));
  assert.notEqual(mandateOperational.applyIntentSignature('r1', adopt), mandateOperational.applyIntentSignature('r2', adopt));
  const projectA = JSON.stringify({ projectId: 'a', intent: mandateOperational.applyIntentSignature('r1', adopt) });
  const projectB = JSON.stringify({ projectId: 'b', intent: mandateOperational.applyIntentSignature('r1', adopt) });
  assert.notEqual(projectA, projectB);
});

test('Mandate G2 loads and saves commercial services without legacy generation or operational runtime', () => {
  const page = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/page.tsx'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/mandateApi.ts'), 'utf8');
  assert.ok(page.includes("mandateContext?.projectId !== projectId || !mandateContext.exists"));
  assert.ok(page.includes('getMandateServices(projectId, controller.signal)'));
  assert.ok(page.includes('controller.abort()'));
  assert.ok(page.includes('request !== commercialRequest.current'));
  assert.ok(page.includes('putMandateServices(projectId'));
  assert.doesNotMatch(page, /reconstructMandateServices|activities\/from-mandate|previewMandateOperations|applyMandateOperations/);
  for (const wrapper of ['getMandateServices', 'putMandateServices', 'previewMandateOperations', 'applyMandateOperations']) {
    assert.ok(api.includes(`const ${wrapper}`));
  }
});

test('Mandate G2 save advances each domain snapshot only after its own successful write', () => {
  const page = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/page.tsx'), 'utf8');
  const mandatePut = page.indexOf("api.put(`/projects/${projectId}/mandate`, form)");
  const revisionGet = page.indexOf('getMandateServices(projectId)', mandatePut);
  const servicesPut = page.indexOf('putMandateServices(projectId', revisionGet);
  assert.ok(mandatePut > 0 && revisionGet > mandatePut && servicesPut > revisionGet);
  assert.ok(page.includes('setServerSnapshot(persisted)'));
  assert.ok(page.includes('snapshot: services, draft: services.map'));
  assert.ok(page.includes('let servicesAttempted = false'));
  assert.ok(page.includes('if (servicesAttempted) setOfferSaveError'));
  assert.ok(page.includes('Votre brouillon est conservé'));
  assert.ok(page.includes('resetServiceDrafts(current.snapshot)'));
});

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

test('civil Activity dates keep the entered calendar day through winter and summer DST', () => {
  assert.equal(time.formatCivilDate('2026-09-28T00:00:00.000Z'), '28 septembre 2026');
  assert.equal(time.formatCivilDate('2026-01-15T00:00:00.000Z'), '15 janvier 2026');
  assert.equal(time.formatCivilDate('2026-07-15T00:00:00.000Z'), '15 juillet 2026');
  assert.equal(time.formatClock('2026-07-15T14:30:00.000Z', 'America/Toronto'), '10 h 30');
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
  assert.ok(drawer.includes('setTime(timeValue(event.startUtc, event.sourceTimeZone))'));
  assert.equal(drawer.includes('setTime(formatClock(event.startUtc, event.sourceTimeZone))'), false);
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

test('planner machine time stays HH:mm while French clock formatting remains display-only', () => {
  const cases = [
    ['2026-09-24T13:00:00.000Z', '09:00'],
    ['2026-09-24T17:15:00.000Z', '13:15'],
    ['2026-09-24T17:45:00.000Z', '13:45'],
    ['2026-09-24T04:00:00.000Z', '00:00'],
    ['2026-09-25T03:30:00.000Z', '23:30'],
  ];
  for (const [instant, expected] of cases) {
    assert.equal(time.timeValue(instant, 'America/Toronto'), expected);
    assert.match(time.timeValue(instant, 'America/Toronto'), /^(?:[01]\d|2[0-3]):[0-5]\d$/);
  }
  assert.equal(time.timeValue('2026-03-08T07:30:00.000Z', 'America/Toronto'), '03:30');
  assert.equal(time.timeValue('2026-11-01T05:30:00.000Z', 'America/Toronto'), '01:30');
  assert.equal(time.timeValue('2026-11-01T06:30:00.000Z', 'America/Toronto'), '01:30');
});

test('09:00 reassignment initialization builds one valid preview payload', () => {
  const machineTime = time.timeValue('2026-09-24T13:00:00.000Z', 'America/Toronto');
  assert.equal(machineTime, '09:00');
  assert.notEqual(machineTime, '09 h 00');
  const request = previewCycle.buildTeamPreviewRequest({ buildingId: 'tour-premont', timeZone: 'America/Toronto',
    date: '2026-09-24', time: machineTime, durationMinutes: 90 }, time.localBoundary);
  assert.deepEqual(request, { buildingId: 'tour-premont', startUtc: '2026-09-24T13:00:00.000Z', durationMinutes: 90 });
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

test('backlog distinguishes replanning context and keeps destructive actions explicit', () => {
  const center = fs.readFileSync(path.join(__dirname, 'PlanningActionCenter.tsx'), 'utf8');
  const drawer = fs.readFileSync(path.join(__dirname, 'ActivityPlanningDrawer.tsx'), 'utf8');
  const planningDrawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const preview = fs.readFileSync(path.join(__dirname, 'SchedulingPreview.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  for (const label of ['À replanifier', 'Dernier créneau', 'Dernier LEAD', 'Replanifier',
    'Supprimer cette activité ?', 'Supprimer définitivement', 'Annuler cette activité ?', 'Annuler l’activité']) {
    assert.ok(center.includes(label));
  }
  for (const label of ['actionTitle', 'actionHistory', 'activityTypeName', 'Toutes les activités sont planifiées ou traitées']) {
    assert.ok(center.includes(label));
  }
  assert.ok(drawer.includes('action?.lastEffectiveStartUtc'));
  assert.ok(drawer.includes('timeValue(historicalStart, historicalZone)'));
  assert.ok(drawer.includes('action?.lastDurationMinutes'));
  assert.ok(drawer.includes('action?.lastLead?.userId'));
  assert.ok(page.includes("api.delete(`/planning/activities/${item.activityId}`)"));
  assert.ok(page.includes("api.post(`/planning/activities/${item.activityId}/cancel`)"));
  assert.doesNotMatch(center, /window\.confirm/);
  assert.ok(drawer.includes('Ajouter à « À planifier »'));
  assert.ok(drawer.includes('Planifier maintenant'));
  assert.ok(drawer.includes('Vérifier les disponibilités'));
  assert.doesNotMatch(drawer, /comportement 3A|Créer sans créneau|Créer et planifier/);
  assert.ok(preview.includes('Disponibilité de l’équipe'));
  assert.doesNotMatch(preview, /<h3>SchedulingPreview<\/h3>/);
  assert.ok(planningDrawer.includes("event.source === 'USER_UNAVAILABILITY'"));
  assert.ok(planningDrawer.includes('Retirer cette activité du calendrier ?'));
  assert.ok(planningDrawer.includes('Retirer du calendrier'));
  assert.doesNotMatch(planningDrawer, /<dt>Booking<\/dt>/);
  assert.doesNotMatch(page, /<label>Booking /);
});

test('fresh Activities with retained history use cancellation wording instead of fake deplanning', () => {
  const center = fs.readFileSync(path.join(__dirname, 'PlanningActionCenter.tsx'), 'utf8');
  for (const label of ['Annuler l’activité', 'Annuler cette activité ?', 'Ses tâches et son historique seront conservés.']) {
    assert.ok(center.includes(label));
  }
  assert.doesNotMatch(center, /Ne plus planifier/);
  assert.match(center, /item\.removalAction === 'DELETE' \? 'Supprimer' : 'Annuler l’activité'/);
});

test('Planner success feedback follows successful API mutations and closing remains silent', () => {
  const activityDrawer = fs.readFileSync(path.join(__dirname, 'ActivityPlanningDrawer.tsx'), 'utf8');
  const bookingDrawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const assignments = fs.readFileSync(path.join(__dirname, 'MyAssignmentsPanel.tsx'), 'utf8');
  for (const label of ['Activité créée.', 'Activité planifiée.']) assert.ok(activityDrawer.includes(`toast('${label}')`));
  for (const label of ['Équipe réaffectée.', 'Planification reportée.', 'Planification retirée.']) assert.ok(bookingDrawer.includes(label));
  assert.doesNotMatch(activityDrawer.match(/const requestClose[\s\S]*?useEffect/)?.[0] ?? '', /toast\(/);
  assert.doesNotMatch(bookingDrawer.match(/const requestClose[\s\S]*?useEffect/)?.[0] ?? '', /toast\(/);
  assert.match(assignments, /setOpen\(value => !value\); setMessage\(''\); setError\(''\)/);
});

test('Project Activity cards distinguish equal titles with exact civil dates and visible status', () => {
  const activities = fs.readFileSync(path.join(__dirname, '../projects/[id]/activities/page.tsx'), 'utf8');
  assert.ok(activities.includes('formatCivilDate(activity.scheduledDate)'));
  assert.ok(activities.includes('STATUS_CONFIG[activity.status]'));
  assert.ok(activities.includes('<select value={activity.status}'));
  assert.doesNotMatch(activities, /new Date\(activity\.scheduledDate\)\.toLocaleDateString/);
});

test('advisor assignment inbox is personal, actionable and independent from planner filters', () => {
  const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  const panel = fs.readFileSync(path.join(__dirname, 'MyAssignmentsPanel.tsx'), 'utf8');
  const projection = fs.readFileSync(path.join(__dirname, 'projection.ts'), 'utf8');
  const notifications = fs.readFileSync(path.join(__dirname, '..', 'notifications', 'page.tsx'), 'utf8');
  assert.ok(page.includes("['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(authUser.role)"));
  assert.ok(page.includes('<MyAssignmentsPanel'));
  assert.ok(panel.includes("api.get<MyAssignmentsResponse>('/planning/my-assignments')"));
  assert.doesNotMatch(panel, /requestRange|clientId|buildingId|projectId.*params|bookingStatus.*params/);
  assert.ok(panel.includes('Mes affectations à confirmer'));
  for (const label of ['Accepter', 'Refuser', 'En attente de votre confirmation', 'Motif facultatif']) {
    assert.ok(panel.includes(label));
  }
  assert.ok(panel.includes('/assignments/${item.assignmentId}/respond'));
  assert.ok(panel.includes("status: 'ACCEPTED'"));
  assert.ok(panel.includes("respond(refusing, 'DECLINED')"));
  assert.ok(panel.includes('onChanged()'));
  assert.ok(panel.includes('count === 0'));
  assert.ok(page.includes("const canMutate = ['ADMIN', 'SUPER_ADMIN'].includes"));
  assert.ok(projection.includes('En attente de votre confirmation'));
  assert.ok(notifications.includes("notif.type.startsWith('BOOKING_ASSIGNMENT_')"));
  assert.ok(notifications.includes("router.push('/planning')"));
});

test('Activity tasks expose empty, aggregate, create, link and unlink contracts without delete', () => {
  const section = fs.readFileSync(path.join(__dirname, 'ActivityTasksSection.tsx'), 'utf8');
  const drawer = fs.readFileSync(path.join(__dirname, 'PlanningDrawer.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'planning.module.css'), 'utf8');
  for (const label of ['Aucune tâche liée à cette activité.', 'Ajouter une tâche',
    'Rattacher une tâche existante', 'Retirer de cette activité', 'Temps réalisé', 'Progression']) {
    assert.ok(section.includes(label));
  }
  assert.ok(section.includes('/activities/${activityId}/tasks'));
  assert.ok(section.includes('/activities/${activityId}/task-candidates'));
  assert.ok(section.includes('/tasks/${taskId}/activity'));
  assert.ok(section.includes("api.post(`/projects/${projectId}/tasks`"));
  assert.ok(section.includes("taskProgressPercent === null ? '—'"));
  assert.doesNotMatch(section, /api\.delete|Supprimer la tâche/);
  assert.ok(drawer.includes('<ActivityTasksSection'));
  assert.ok(css.includes('.taskRow,.taskCreate,.taskCandidates > div'));
});

test('Activity work groups current, historical, missing and direct tasks without duplicating data', () => {
  const section = fs.readFileSync(path.join(__dirname, 'ActivityTasksSection.tsx'), 'utf8');
  for (const label of ['Checklists', 'Actuelle', 'Historique', 'Tâches de l’activité',
    'Ajouter les checklists manquantes', 'Définissez d’abord un type d’activité']) {
    assert.ok(section.includes(label));
  }
  assert.ok(section.includes('/task-lists/instantiate'));
  assert.ok(section.includes('response.data.createdLists.length'));
  assert.ok(section.includes("count === 1 ? '1 checklist ajoutée'"));
  assert.ok(section.includes("count > 1 ? `${count} checklists ajoutées`"));
  assert.ok(section.includes("'Aucune nouvelle checklist à ajouter.'"));
  assert.ok(section.includes('!view.isCancelled'));
  assert.ok(section.includes('view.instantiatedTaskLists.map'));
  assert.ok(section.includes('renderTasks(view.directTasks)'));
  assert.doesNotMatch(section, /documentType/);
});

test('Mandate Tasks keeps listed tasks and adds independent tasks exactly once', () => {
  const mandateTasks = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'TaskListsTab.tsx'), 'utf8');
  assert.ok(mandateTasks.includes("api.get(`/projects/${projectId}/tasks`)"));
  assert.ok(mandateTasks.includes('task.projectTaskListId === null'));
  assert.ok(mandateTasks.includes("customName: 'Tâches indépendantes'"));
  assert.ok(mandateTasks.includes('tasks: independentTasks'));
  assert.ok(mandateTasks.includes('displayGroups.reduce'));
  assert.ok(mandateTasks.includes('displayGroups.map'));
  assert.ok(mandateTasks.includes('Activité : {task.activity.customLabel || task.activity.label}'));
  assert.ok(mandateTasks.includes('task.activityId && task.activity'));
  assert.ok(mandateTasks.includes('flex flex-wrap items-center'));
  assert.doesNotMatch(mandateTasks, /projectTaskListId\s*===\s*null.*activityId\s*===\s*null/);
});

test('Mandate Activities consolidates canonical, transversal and legacy work without eager task expansion', () => {
  const work = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'MandateWorkTab.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'page.tsx'), 'utf8');
  for (const label of ['Activités', 'Travail transversal', 'Listes de travail existantes', 'Tâches de l’activité',
    'Actuelle', 'Historique', 'Liste existante', 'Ajouter les checklists manquantes', 'Type canonique manquant',
    'Affectation à confirmer', 'Confirmée', 'Afficher les tâches']) assert.ok(work.includes(label));
  const workOwner = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'useMandateWork.ts'), 'utf8');
  assert.ok(workOwner.includes('/mandate/work'));
  assert.ok(work.includes('/task-lists/instantiate'));
  assert.ok(work.includes('/tasks/${taskId}/activity'));
  assert.ok(work.includes('/tasks/${timeTask.id}/time'));
  assert.ok(work.includes('expandedActivities[activity.id] === true'));
  assert.ok(work.includes('expandedGroups[key] === true'));
  assert.ok(work.includes("activity.status !== 'annule'"));
  assert.ok(page.includes('grid-cols-2 lg:grid-cols-4'));
  assert.ok(page.includes("['Planifiées', mandateWork.data.summary.plannedHours]"));
  assert.ok(page.includes("['Disponible', mandateWork.data.summary.budgetRemainingHours]"));
  assert.ok(page.includes('unplannedRemainingHours'));
  assert.doesNotMatch(work, /\['Restantes'/);
  assert.ok(page.includes("{ id: 'activities', domId: 'work', label: '✅ Activités' }"));
  assert.ok(page.includes('<MandateWorkTab'));
  assert.doesNotMatch(page, /<TaskListsTab/);
});

test('Mandate G5 shares Work with canonical KPI and accessible keyboard tabs', () => {
  const page = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/page.tsx'), 'utf8');
  const workOwner = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/useMandateWork.ts'), 'utf8');
  const operations = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/useMandateOperations.ts'), 'utf8');
  const timesheet = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/TimesheetTab.tsx'), 'utf8');
  for (const value of ['budgetHours', 'actualHours', 'plannedHours', 'budgetRemainingHours', 'unplannedRemainingHours']) assert.ok(workOwner.includes(value));
  for (const value of ['role="tablist"', 'role="tab"', 'aria-selected', 'aria-controls', 'role="tabpanel"']) assert.ok(page.includes(value));
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(page.includes(`event.key === '${key}'`));
  for (const id of ['offer', 'work', 'time', 'comments']) assert.ok(page.includes(`domId: '${id}'`));
  assert.ok(page.includes('overflow-x-auto'));
  assert.ok(page.includes('view={mandateWork.data}'));
  assert.ok(page.includes('onRefresh={mandateWork.refresh}'));
  assert.ok(operations.includes('onApplied?.()'));
  assert.ok(workOwner.includes('controller.current?.abort()'));
  assert.ok(workOwner.includes('request !== sequence.current'));
  assert.ok(timesheet.includes('grid grid-cols-2 lg:grid-cols-4'));
  assert.ok(timesheet.includes('overflow-x-auto'));
});

test('Mandate offer uses the authoritative ActivityType catalog and commercial service identities', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'page.tsx'), 'utf8');
  const editor = fs.readFileSync(path.join(__dirname, '..', 'projects', '[id]', 'mandate', 'MandateServicesEditor.tsx'), 'utf8');
  assert.ok(page.includes("api.get('/activities/catalog')"));
  assert.ok(page.includes('buildSaveMandateServicesPayload'));
  assert.ok(editor.includes('service.id || service.localDraftId'));
  assert.ok(editor.includes('crypto.randomUUID()'));
  assert.doesNotMatch(page, /activities\/from-mandate|selectedServices|reconstructMandateServices/);
  assert.doesNotMatch(page, /const ACTIVITY_CATALOG\s*=\s*\[/);
});

test('Mandate service catalog stays compact and filters its loaded ActivityTypes locally', () => {
  const editor = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/MandateServicesEditor.tsx'), 'utf8');
  assert.ok(editor.includes('placeholder="Rechercher un service..."'));
  assert.ok(editor.includes("item.label.toLocaleLowerCase('fr-CA')"));
  assert.ok(editor.includes("search.trim().toLocaleLowerCase('fr-CA')"));
  assert.ok(editor.includes('max-h-96 overflow-y-auto'));
  assert.ok(editor.includes('Aucun service ne correspond à votre recherche.'));
  assert.ok(editor.includes("setSearch(''); setCatalogOpen"));
  assert.ok(editor.includes('min-w-0 flex-1'));
  assert.ok(editor.includes('shrink-0'));
  assert.doesNotMatch(editor, /onChange=.*api\.|search.*api\./s);
  assert.ok(editor.includes('classifyCatalogService(item.activityTypeId, state.draft)'));
});

test('Mandate dirty state normalizes null, empty values, numbers, booleans and civil dates', () => {
  const server = mandateFormState.mandateFormFromServer({ montantVendu: 1200, tauxHoraire: null,
    heuresBudgetees: 10, dateDebutDelai: '2026-09-26T00:00:00.000Z', alerteActive: false });
  const equivalent = { ...server, montantVendu: '1200.00', tauxHoraire: '', heuresBudgetees: '10.0' };
  assert.equal(mandateFormState.mandateFieldsAreEqual(server, equivalent), true);
  assert.equal(mandateFormState.mandateFieldsAreEqual(server, { ...equivalent, heuresBudgetees: '11' }), false);
  assert.equal(mandateFormState.mandateFieldsAreEqual(server, { ...equivalent, heuresBudgetees: '10' }), true);
  assert.equal(mandateFormState.mandateFieldsAreEqual(server, { ...equivalent, alerteActive: true }), false);
  assert.equal(server.dateDebutDelai, '2026-09-26');
});

test('Mandate page preserves independent form and commercial drafts across save and tab changes', () => {
  const page = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/page.tsx'), 'utf8');
  assert.ok(page.includes('serverSnapshot'));
  assert.ok(page.includes('commercialState.snapshot'));
  assert.ok(page.includes('mandateFieldsDirty'));
  assert.ok(page.includes('commercialServicesDirty'));
  assert.ok(page.includes("window.addEventListener('beforeunload'"));
  assert.ok(page.includes("window.confirm('Des modifications ne sont pas enregistrées."));
  assert.doesNotMatch(page, /handleGenerateActivities|activities\/from-mandate/);
  assert.ok(page.includes('resetServiceDrafts(current.snapshot)'));
  assert.ok(page.includes("['ADMIN', 'SUPER_ADMIN'].includes"));
  assert.ok(page.includes('Fiche et offre en lecture seule'));
  assert.ok(page.includes('<MandateServicesEditor'));
});

test('Mandate comments and timesheet expose contextual errors and reject failed exports', () => {
  const comments = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/CommentsTab.tsx'), 'utf8');
  const timesheet = fs.readFileSync(path.join(__dirname, '../projects/[id]/mandate/TimesheetTab.tsx'), 'utf8');
  assert.ok(comments.includes('role="alert"'));
  assert.ok(comments.includes('aria-label="Modifier le commentaire"'));
  assert.ok(comments.includes('aria-label="Supprimer le commentaire"'));
  assert.ok(timesheet.includes('if (!res.ok)'));
  assert.ok(timesheet.includes('role="alert"'));
});
