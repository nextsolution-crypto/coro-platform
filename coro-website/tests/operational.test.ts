import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { opsAsset, opsCopy } from '../app/design-lab/operational-data.ts';
import { stateGlyph } from '../components/operational/types.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const files = readdirSync(join(root, 'components/operational')).map((name) => `components/operational/${name}`);
const css = read('components/operational/operational.module.css');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
const studies = read('app/design-lab/OperationalStudies.tsx');

test('Zone 05 exists with the vocabulary, the primitives, four studies and isolated views', () => {
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /<OperationalZone\b/);
  assert.ok(page.includes('#operational'));
  assert.match(page, /opsViewKeys/);
  for (const id of ['operational-a', 'operational-b', 'operational-c', 'operational-d']) assert.ok(studies.includes(`id="${id}"`), id);
  for (const key of ['operational-a', 'operational-b', 'operational-c', 'operational-d']) assert.ok(read('app/design-lab/operational-data.ts').includes(`'${key}'`), key);
  for (const name of ['StatusChip', 'OperationalPanel', 'MetricTile', 'Timeline', 'PeopleStatus', 'ActionItem', 'DocumentStatus']) assert.ok(existsSync(join(root, 'components/operational', `${name === 'Timeline' || name === 'ActionItem' || name === 'DocumentStatus' || name === 'StatusChip' || name === 'MetricTile' || name === 'PeopleStatus' || name === 'OperationalPanel' ? name : name}.tsx`)), name);
});

test('LiveIndicator is deliberately not a primitive and nothing pulses, loops or glows', () => {
  assert.ok(!files.some((f) => /LiveIndicator/.test(f)));
  assert.doesNotMatch(code, /infinite|@keyframes\s+(pulse|blink|flash|radar|glow)|radial-gradient|conic-gradient|blur\(|backdrop-filter|box-shadow|drop-shadow|text-shadow/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const locale of ['fr', 'en'] as const) assert.match(opsCopy[locale].zone.primitivesLead, /LiveIndicator/);
});

test('every state has a glyph and a written label, and critical never relies on colour alone', () => {
  const states = ['normal', 'info', 'attention', 'critical', 'complete'] as const;
  for (const state of states) assert.ok(stateGlyph[state].length > 0);
  assert.equal(new Set(Object.values(stateGlyph)).size, 5, 'glyphs are distinct');
  for (const locale of ['fr', 'en'] as const) assert.deepEqual(opsCopy[locale].zone.stateList.map(([key]) => key), [...states]);
  const chip = read('components/operational/StatusChip.tsx');
  assert.match(chip, /aria-hidden="true"/);
  assert.match(chip, /\{label\}/);
  assert.match(chip, /srPrefix/);
  assert.match(css, /\[data-state="critical"\] \.glyph \{[^}]*background: var\(--st-critical\)/, 'critical glyph is a solid shape');
});

test('every invented value is visibly marked as demonstration', () => {
  assert.match(read('components/operational/MetricTile.tsx'), /demo: string/);
  assert.match(read('components/operational/MetricTile.tsx'), /demoTag/);
  assert.match(read('components/operational/OperationalPanel.tsx'), /demo: string/);
  for (const locale of ['fr', 'en'] as const) {
    assert.match(opsCopy[locale].zone.demo, /(démonstration|demonstration)/i);
    assert.ok(opsCopy[locale].zone.demoTag.length > 0);
  }
  const panels = studies.match(/<OperationalPanel\b/g) ?? [];
  assert.equal(panels.length, 2, 'the strong plate is used only where presence is high (incident, people)');
  assert.ok((studies.match(/demo=\{t\.zone\.demoTag\}/g) ?? []).length >= 4);
  assert.ok((studies.match(/t\.zone\.demoTag/g) ?? []).length >= 6, 'every study marks its values as demo');
});

test('no study is a repeated dashboard-card grid; radius and depth stay restrained', () => {
  assert.doesNotMatch(studies, /repeat\(|\.card\b|kpi/i);
  assert.doesNotMatch(code, /repeat\(\s*[3-9]\s*,/);
  const panel = code.match(/\.panel \{[^}]*\}/)?.[0] ?? '';
  assert.match(panel, /radius-panel/);
  assert.doesNotMatch(panel, /shadow|radius-(md|lg|xl)/);
  assert.match(code, /\.sceneMedia \{[^}]*radius-image/);
  assert.doesNotMatch(code, /radius-(md|lg|xl)/);
  for (const study of ['StudyA', 'StudyB', 'StudyC', 'StudyD']) {
    const body = studies.slice(studies.indexOf(`function ${study}`)).split('\n/* ──')[0].split('\nfunction ')[0];
    assert.ok((body.match(/<OperationalPanel\b/g) ?? []).length <= 1, `${study}: at most one dominant plate`);
    assert.equal((body.match(/<MetricTile\b/g) ?? []).length <= 3, true, `${study}: metrics`);
  }
});

test('states and surfaces are independent: normal on navy, critical on white', () => {
  const a = studies.slice(studies.indexOf('function StudyA'), studies.indexOf('function StudyB'));
  const b = studies.slice(studies.indexOf('function StudyB'), studies.indexOf('function StudyC'));
  assert.match(a, /tone="dark"/); assert.match(a, /state="normal"/);
  assert.match(b, /tone="white"/); assert.match(b, /state="critical"/);
});

test('mobile is a composition, not a shrunk desktop panel', () => {
  assert.match(css, /\.scene\[data-first="media"\]/);
  assert.match(css, /\.scene\[data-first="panel"\]/);
  assert.match(css, /@media \(min-width: 68rem\)[\s\S]*grid-template-columns: minmax\(0, 7fr\) minmax\(0, 5fr\)/);
  assert.match(css, /aspect-ratio: 4 \/ 3/);
  assert.doesNotMatch(code, /overflow-x:\s*(auto|scroll)/);
  assert.doesNotMatch(studies, /<table\b/);
});

test('semantics: lists, time elements and labelled plates', () => {
  assert.match(read('components/operational/Timeline.tsx'), /<ol\b/);
  assert.match(read('components/operational/Timeline.tsx'), /<time dateTime=/);
  assert.match(read('components/operational/ActionItem.tsx'), /<ol\b/);
  assert.match(read('components/operational/DocumentStatus.tsx'), /<ul\b/);
  assert.match(read('components/operational/PeopleStatus.tsx'), /<dl\b/);
  assert.match(read('components/operational/OperationalPanel.tsx'), /aria-label=\{label\}/);
  assert.match(read('components/operational/MetricTile.tsx'), /<time dateTime=/);
});

test('recovery study treats the baked-in media text as a reference only', () => {
  for (const locale of ['fr', 'en'] as const) assert.match(opsCopy[locale].d.note, /(incrust|baked)/i);
  assert.ok(opsAsset.recovery.src.endsWith('normal-operations.webp'));
});

test('only committed assets, no new dependency, no production import, Lab stays noindex', () => {
  for (const asset of Object.values(opsAsset)) assert.ok(existsSync(join(root, 'public', asset.src.slice(1))), asset.src);
  const deps = Object.keys(JSON.parse(read('package.json')).dependencies).sort();
  assert.deepEqual(deps, ['lucide-react', 'next', 'react', 'react-dom']);
  for (const file of [...files.filter((f) => f.endsWith('.tsx')), 'app/design-lab/OperationalStudies.tsx']) {
    const imports = read(file).match(/from '[^']+'/g) ?? [];
    for (const imp of imports) assert.doesNotMatch(imp, /HomePageClient|ProductPage|Compositions|DemoForm|components\/hero|components\/spatial|components\/site\/(?!SiteHeader)/, `${file} ${imp}`);
  }
  assert.match(read('app/design-lab/page.tsx'), /robots: \{ index: false, follow: false/);
});

test('design lab copy is bilingual with identical structure', () => {
  const keys = (v: unknown, p = ''): string[] => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.entries(v).flatMap(([k, c]) => keys(c, `${p}${k}.`)) : [p];
  assert.deepEqual(keys(opsCopy.fr).sort(), keys(opsCopy.en).sort());
});

// LAB-05B: operational intensity controls UI presence; the four studies have different silhouettes.
const studyBody = (name: string, next: string) => studies.slice(studies.indexOf(`function ${name}`), next ? studies.indexOf(`function ${next}`) : studies.indexOf('function Vocabulary'));
const A = studyBody('StudyA', 'StudyB'); const B = studyBody('StudyB', 'StudyC'); const C = studyBody('StudyC', 'StudyD'); const D = studyBody('StudyD', '');

test('the four studies have different compositions and UI presence follows operational intensity', () => {
  assert.match(A, /layout="lead"/); assert.match(A, /<OperationalRail\b/); assert.doesNotMatch(A, /<OperationalPanel\b/);
  assert.doesNotMatch(B, /layout=/, 'B keeps the reference plate layout'); assert.match(B, /<OperationalPanel\b/);
  assert.match(C, /layout="people"/); assert.match(C, /<PeopleStatus\b/);
  assert.match(D, /layout="open"/); assert.doesNotMatch(D, /<OperationalPanel\b/); assert.match(D, /below=\{flow\}/);
  assert.equal(new Set([A, B, C, D].map((body) => body.match(/layout="(\w+)"/)?.[1] ?? 'plate')).size, 4);
  assert.match(css, /data-layout="lead"\] \.sceneMedia \{[^}]*aspect-ratio: 21 \/ 9/);
});

test('B keeps its approved incident hierarchy', () => {
  const order = ['opsSituation', 'opsMetrics', '<Timeline', '<ActionList'].map((needle) => B.indexOf(needle));
  assert.ok(order.every((index) => index > 0) && [...order].sort((x, y) => x - y).join() === order.join(), 'situation, metrics, timeline, action in order');
  assert.match(B, /state="critical"/);
});

test('normal keeps its information in the DOM while the interface recedes', () => {
  for (const needle of ['a.status', 'a.situation', 'a.metric[0]', 'a.doc[0]']) assert.ok(A.includes(needle), needle);
  assert.doesNotMatch(A, /display:\s*none/);
});

test('recovery is open and evidentiary: chronology stays semantic and red disappears', () => {
  assert.match(D, /<Timeline\b/); assert.match(D, /<DocumentList\b/); assert.match(D, /<ActionList\b/);
  assert.match(D, /state="complete"/); assert.doesNotMatch(D, /state="critical"/);
  assert.match(D, /Band id="operational-d" tone="white"/);
});

test('the intensity principle exists in French and English', () => {
  assert.ok(opsCopy.fr.zone.principles.includes('L’intensité opérationnelle détermine la présence de l’interface.'));
  assert.ok(opsCopy.en.zone.principles.includes('Operational intensity determines interface presence.'));
  assert.ok(opsCopy.fr.zone.principles.includes('La situation d’abord. L’interface ensuite.'));
});

test('semantic colours come from V1 tokens, with no unexplained local hex values', () => {
  assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b/);
  const tokens = read('app/design-tokens.css');
  assert.match(tokens, /--coro-v1-success-on-dark: #4cc38a/);
  assert.match(tokens, /--coro-v1-warning-on-dark: #f0b34a/);
  assert.match(tokens, /--coro-v1-red-600: #c0392b/, 'signal red matches the official CORO brand red');
  assert.match(code, /var\(--coro-v1-success-on-dark\)/);
  assert.match(code, /var\(--coro-v1-warning-on-dark\)/);
});
