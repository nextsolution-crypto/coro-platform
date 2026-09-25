/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const filename = path.join(__dirname, 'activityTypePresentation.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const loaded = new Module(filename, module.parent); loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(__dirname); loaded._compile(output, filename);
const presentation = loaded.exports;

test('color tokens have friendly French labels and a controlled fallback', () => {
  assert.equal(presentation.colorPresentation('CYAN').label, 'Turquoise');
  assert.equal(presentation.colorPresentation('NAVY').label, 'Bleu marine');
  assert.deepEqual(presentation.colorPresentation('url(evil)'), { value: 'NEUTRAL', label: 'Neutre', color: '#7b858d' });
});

test('icon keys have friendly French labels and a controlled fallback', () => {
  assert.equal(presentation.iconPresentation('INSPECTION').label, 'Inspection');
  assert.equal(presentation.iconPresentation('TRAINING').label, 'Formation');
  assert.equal(presentation.iconPresentation('<svg>').value, 'OTHER');
});

test('durations are humanized without changing stored minutes', () => {
  assert.equal(presentation.formatDefaultDuration(60), '1 h');
  assert.equal(presentation.formatDefaultDuration(90), '1 h 30');
  assert.equal(presentation.formatDefaultDuration(120), '2 h');
  assert.equal(presentation.formatDefaultDuration(210), '3 h 30');
  assert.equal(presentation.formatDefaultDuration(null), 'Durée libre');
});

test('creation payload keeps API tokens and numeric values', () => {
  assert.deepEqual(presentation.activityTypePayload({ nameFR:' Inspection ', nameEN:' Visit ', visualToken:'CYAN',
    iconKey:'INSPECTION', defaultDurationMinutes:'120', clientBookableDefault:false, displayOrder:'130' }),
  { nameFR:'Inspection', nameEN:'Visit', visualToken:'CYAN', iconKey:'INSPECTION',
    defaultDurationMinutes:120, clientBookableDefault:false, displayOrder:130 });
});

test('archived state exposes an explicit label and restore action', () => {
  assert.deepEqual(presentation.activityTypeState(false), { label: 'Archivé', action: 'Réactiver' });
  assert.deepEqual(presentation.activityTypeState(true), { label: 'Actif', action: 'Archiver' });
});

test('task-list settings expose tenant modes, effective resolution and no instantiation action', () => {
  const source = fs.readFileSync(path.join(__dirname, 'ActivityTypeTaskLists.tsx'), 'utf8');
  for (const contract of ['INHERIT', 'APPEND', 'REPLACE', 'DISABLE', 'Configuration CORO',
    'Votre organisation', 'Résultat effectif']) assert.match(source, new RegExp(contract));
  assert.match(source, /save\('tenant'\)/);
  assert.match(source, /scope,mode:selectedMode/);
  assert.doesNotMatch(source, />\s*(Générer|Instancier|Synchroniser)/);
});

test('global editing is restricted in the UI to SUPER_ADMIN and system types', () => {
  const source = fs.readFileSync(path.join(__dirname, 'ActivityTypeTaskLists.tsx'), 'utf8');
  assert.match(source, /role==='SUPER_ADMIN'&&isSystem/);
  assert.match(source, /save\('global'\)/);
});
