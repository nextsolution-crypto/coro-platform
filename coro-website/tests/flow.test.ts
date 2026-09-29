import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flowAsset, flowCopy } from '../app/design-lab/flow-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const files = readdirSync(join(root, 'components/flow')).map((name) => `components/flow/${name}`);
const tsx = files.filter((f) => f.endsWith('.tsx'));
const css = read('components/flow/flow.module.css');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
const studies = read('app/design-lab/FlowStudies.tsx');
const keys = (v: unknown, p = ''): string[] => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.entries(v).flatMap(([k, c]) => keys(c, `${p}${k}.`)) : [p];

test('Zone 06 exists with four studies, four isolated views and the two principles in both languages', () => {
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /<FlowZone\b/); assert.ok(page.includes('#flows')); assert.match(page, /flowViewKeys/);
  for (const id of ['flow-a', 'flow-b', 'flow-c', 'flow-d']) assert.ok(studies.includes(`id="${id}"`), id);
  assert.ok(flowCopy.fr.zone.principles.includes('Le continuum n’est pas une liste de fonctionnalités.'));
  assert.ok(flowCopy.en.zone.principles.includes('The continuum is not a feature list.'));
  assert.ok(flowCopy.fr.zone.principles.includes('L’action produit des preuves. Les preuves produisent de l’apprentissage.'));
  assert.ok(flowCopy.en.zone.principles.includes('Action creates evidence. Evidence creates learning.'));
});

test('the canonical nine-stage sequence is complete and ordered, in French and English', () => {
  assert.deepEqual(flowCopy.fr.continuum.phases.map((p) => p.word), ['CONNAÎTRE', 'ANTICIPER', 'DÉTECTER', 'DÉCIDER', 'AGIR', 'PROTÉGER', 'PROUVER', 'APPRENDRE', 'AMÉLIORER']);
  assert.deepEqual(flowCopy.en.continuum.phases.map((p) => p.word), ['KNOW', 'ANTICIPATE', 'DETECT', 'DECIDE', 'ACT', 'PROTECT', 'PROVE', 'LEARN', 'IMPROVE']);
  assert.deepEqual(flowCopy.fr.continuum.phases.map((p) => p.desc), ['Données et connaissance', 'Risques et préparation', 'Alertes et événements', 'Analyse et priorisation', 'Intervention et coordination', 'Personnes et actifs', 'Traçabilité et rapports', 'REX et enseignements', 'Actions et performance']);
  assert.deepEqual(flowCopy.en.continuum.phases.map((p) => p.desc), ['Data and knowledge', 'Risks and preparedness', 'Alerts and events', 'Analysis and prioritization', 'Response and coordination', 'People and assets', 'Traceability and reporting', 'Lessons learned', 'Actions and performance']);
  for (const locale of ['fr', 'en'] as const) {
    const m = flowCopy[locale].continuum.movements;
    assert.deepEqual(m.map((x) => [x.from, x.to]), [[1, 2], [3, 4], [5, 6], [7, 9]], 'movements group the sequence without reordering it');
  }
  assert.deepEqual(keys(flowCopy.fr).sort(), keys(flowCopy.en).sort());
});

test('the continuum is one system, not nine cards', () => {
  const source = read('components/flow/Continuum.tsx');
  assert.match(source, /<ol\b[^>]*movements/); assert.match(source, /<ol\b[^>]*phases/);
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\//g, ''), /card/i);
  assert.doesNotMatch(code, /\.phase \{[^}]*(border-radius|box-shadow|border:)/, 'a stage is not a boxed card');
  assert.doesNotMatch(code, /repeat\(\s*9/);
  assert.match(code, /\.movement\[data-m="3"\] \{[^}]*navy-950/, 'the response movement changes surface');
  assert.match(code, /data-m="3"\] \.phaseWord/, 'and scale');
  assert.match(code, /min-block-size: 23rem/, 'and mass');
});

test('improvement feeds back into know and anticipate', () => {
  for (const locale of ['fr', 'en'] as const) {
    const f = flowCopy[locale].continuum.feedback;
    assert.match(f.from, /09/); assert.match(f.to, /01/); assert.match(f.to, /02/);
  }
  const source = read('components/flow/Continuum.tsx');
  assert.match(source, /feedback\.from/); assert.match(source, /feedback\.to/);
  assert.match(code, /\.feedback \{/);
});

test('data-to-action has exactly four canonical concepts and a return note', () => {
  assert.deepEqual(flowCopy.fr.d2a.steps.map((s) => s.word), ['DONNÉES', 'DÉCISION', 'ACTION', 'AMÉLIORATION']);
  assert.deepEqual(flowCopy.en.d2a.steps.map((s) => s.word), ['DATA', 'DECISION', 'ACTION', 'IMPROVEMENT']);
  assert.match(read('components/flow/DataToActionFlow.tsx'), /readonly \[DataToActionStep, DataToActionStep, DataToActionStep, DataToActionStep\]/);
  assert.match(code, /font-weight: calc\(400 \+ var\(--k\) \* 150\)/, 'progressive typographic weight');
});

test('process flow and scenario flow are distinct compositions', () => {
  const process = read('components/flow/ProcessFlow.tsx'); const scenario = read('components/flow/ScenarioFlow.tsx');
  assert.equal(flowCopy.fr.process.steps.length, 5);
  assert.deepEqual(flowCopy.en.process.steps.map((s) => s.name), ['ALERT', 'VALIDATION', 'MOBILIZATION', 'ACTION', 'CLOSURE']);
  assert.ok(flowCopy.fr.process.steps.some((s) => 'gate' in s && s.gate), 'a decision gate');
  assert.match(process, /step\.output/); assert.match(process, /step\.time/); assert.doesNotMatch(process, /options/);
  assert.match(scenario, /options/); assert.match(scenario, /chosenLabel/); assert.doesNotMatch(scenario, /step\.output|step\.time/);
  assert.deepEqual(flowCopy.en.scenario.steps.map((s) => s.label), ['SIGNAL', 'ASSESSMENT', 'DECISION', 'RESPONSE', 'OUTCOME']);
  assert.match(studies, /flowAsset\.command/);
  assert.ok(existsSync(join(root, 'public', flowAsset.command.src.slice(1))));
});

test('demonstration content is marked and no product module is mapped', () => {
  for (const locale of ['fr', 'en'] as const) {
    assert.match(flowCopy[locale].zone.demo, /(démonstration|demonstration)/i);
    assert.match(flowCopy[locale].process.demo, /(démo|demo)/i); assert.match(flowCopy[locale].scenario.demo, /(démo|demo)/i);
  }
  assert.doesNotMatch(JSON.stringify(flowCopy), /\b(PMU|PSI|PCA|PGC|PRA|PUE|REPTOX|Sentinelle|Sentinel)\b/, 'the continuum is the mechanism, not the ecosystem');
  assert.doesNotMatch(studies, /<a [^>]*href=\{?['"]?\/(produits|products|sentinelle)/i, 'stages are not navigation');
});

test('nothing requires hover, click or tooltips; meaning is static', () => {
  assert.doesNotMatch(code, /:hover|:focus-within/);
  for (const file of tsx) { const source = read(file); assert.doesNotMatch(source, /onClick|onMouse|title=|'use client'|role="tooltip"|<button/, file); }
  assert.match(code, /list-style: none/);
});

test('motion only draws lines: one-shot, progressive, absent under reduced motion, never infinite', () => {
  assert.doesNotMatch(code, /infinite|@keyframes\s+(pulse|blink|flash|radar|glow|spin)|radial-gradient|conic-gradient|blur\(|backdrop-filter|box-shadow|drop-shadow|text-shadow/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*@supports \(animation-timeline: view\(\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(code, /@keyframes drawX/); assert.match(code, /@keyframes wipe/);
});

test('mobile recomposes vertically with a spine instead of shrinking the row', () => {
  assert.match(code, /\.movement::before \{[^}]*inline-size: 1px/);
  assert.match(code, /@media \(min-width: 75rem\)[\s\S]*grid-template-columns: [\d.]+fr [\d.]+fr [\d.]+fr [\d.]+fr/);
  assert.doesNotMatch(code, /overflow-x:\s*(auto|scroll)/);
});

test('only committed assets, no new dependency, no production import, Lab stays noindex', () => {
  assert.deepEqual(Object.keys(JSON.parse(read('package.json')).dependencies).sort(), ['lucide-react', 'next', 'react', 'react-dom']);
  for (const file of [...tsx, 'app/design-lab/FlowStudies.tsx', 'app/design-lab/flow-data.ts']) {
    for (const imp of read(file).match(/from '[^']+'/g) ?? []) assert.doesNotMatch(imp, /HomePageClient|ProductPage|Compositions|DemoForm|components\/(hero|page|spatial|operational)/, `${file} ${imp}`);
  }
  assert.match(read('app/design-lab/page.tsx'), /robots: \{ index: false, follow: false/);
});

// LAB-06B: authority is shared across the nine stages; intensity comes from surface, mass and profile. The loop is labelled.
test('the improvement loop carries a written technical label in both languages', () => {
  assert.match(flowCopy.fr.continuum.feedback.label, /boucle d’amélioration/i);
  assert.match(flowCopy.en.continuum.feedback.label, /improvement loop/i);
  const source = read('components/flow/Continuum.tsx');
  assert.match(source, /feedback\.label/);
  assert.match(code, /\.feedbackLabel \{[^}]*text-transform: uppercase/);
  assert.doesNotMatch(code, /@keyframes\s+(spin|rotate|orbit)|border-radius: 50%/, 'no circular loop');
});

test('the response movement keeps the peak through surface and mass, not through a large type gap', () => {
  assert.match(code, /\.movement\[data-m="3"\] \{[^}]*navy-950/);
  assert.match(code, /min-block-size: 23rem/);
  const px = (match: RegExpMatchArray | null) => (match ? Number(match[1]) : NaN);
  const desktop = code.slice(code.indexOf('@media (min-width: 75rem)'));
  const base = px(desktop.match(/data-m="4"\] \.phaseWord \{ font-size: ([\d.]+)rem/));
  const peak = px(desktop.match(/data-m="3"\] \.phaseWord \{ font-size: clamp\([\d.]+rem, [^,]+, ([\d.]+)rem\)/));
  assert.ok(base >= 1, 'the calm and evidence stages are comfortably readable');
  assert.ok(peak / base <= 1.4, 'the peak is not much larger than the other stages');
  assert.ok(peak > base, 'but it is still the largest');
});
