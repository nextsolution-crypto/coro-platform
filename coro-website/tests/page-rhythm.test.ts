import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { rhythmCopy } from '../app/design-lab/rhythm-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((name) => {
  const path = join(dir, name);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});
const keys = (value: unknown, prefix = ''): string[] => (value && typeof value === 'object' && !Array.isArray(value))
  ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}${key}.`))
  : [prefix];

test('Zone 03 exists in the Design Lab with primitives and three rhythm studies', () => {
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /<PageRhythmZone\b/);
  assert.ok(page.includes('#page-rhythm'));
  const zone = read('app/design-lab/RhythmStudies.tsx');
  for (const study of ['RhythmA', 'RhythmB', 'RhythmC']) assert.match(zone, new RegExp(`<${study}\\b`));
  for (const id of ['id="primitives"', 'id="rhythm-a"', 'id="rhythm-b"', 'id="rhythm-c"']) assert.ok(zone.includes(id), id);
  for (const view of ['rhythm-a', 'rhythm-b', 'rhythm-c']) assert.ok(zone.includes(view), view);
});

test('the required primitive families exist', () => {
  for (const name of ['PageSection', 'SectionStatement', 'EditorialBlock', 'SplitContent', 'MediaFrame', 'FeatureIndex', 'SectionProof', 'MetricComposition', 'Accordion', 'Technical']) {
    assert.ok(existsSync(join(root, `components/page/${name}.tsx`)), `${name} is missing`);
  }
  assert.match(read('components/page/SectionProof.tsx'), /export function ProofRecord/);
});

test('each rhythm study is a sequence of differently composed sections, not a card wall', () => {
  const source = read('app/design-lab/RhythmStudies.tsx');
  assert.doesNotMatch(source, /ProductCard|styles\.card\b/);
  const primitives = read('components/page/page.module.css');
  assert.doesNotMatch(primitives, /\.card\b/);
  assert.doesNotMatch(primitives, /repeat\(3,/);
  assert.doesNotMatch(primitives, /box-shadow/, 'depth comes from surface, border and media, not shadow');
  for (const study of ['RhythmA', 'RhythmB', 'RhythmC']) {
    const body = source.slice(source.indexOf(`export function ${study}`)).split('\n/* ─────')[0];
    const tones = [...body.matchAll(/tone="(white|paper|navy)"/g)].map((m) => m[1]);
    assert.ok(new Set(tones).size >= 2, `${study} must alternate surfaces`);
    assert.ok(tones.includes('navy'), `${study} needs a purposeful dark section`);
    const compositions = ['SectionStatement', 'SplitContent', 'FeatureIndex', 'SectionProof', 'MediaFrame', 'MetricComposition', 'Accordion'].filter((name) => body.includes(`<${name}`));
    assert.ok(compositions.length >= 4, `${study} uses too few composition types`);
  }
});

test('photographic media keeps the 10px rule and technical media keeps a sharper frame', () => {
  const css = read('components/page/page.module.css');
  assert.match(css, /data-kind="photo"\] \.frame \{ border-radius: var\(--coro-v1-radius-image\)/);
  assert.match(css, /data-bleed="right"\] \.frame \{ border-radius: var\(--coro-v1-radius-image\) 0 0 var\(--coro-v1-radius-image\)/);
  assert.match(css, /data-bleed="left"\] \.frame \{ border-radius: 0 var\(--coro-v1-radius-image\) var\(--coro-v1-radius-image\) 0/);
  const technical = css.match(/data-kind="technical"\] \.frame \{[^}]*\}/)?.[0] ?? '';
  assert.ok(technical.includes('--coro-v1-radius-panel'));
  assert.ok(!technical.includes('radius-image'));
});

test('the accordion is native, keyboard-accessible and keeps a visible focus ring', () => {
  const source = read('components/page/Accordion.tsx');
  assert.match(source, /<details\b/);
  assert.match(source, /<summary>/);
  assert.doesNotMatch(source, /role="button"|onClick|useState|'use client'/);
  assert.match(read('components/page/page.module.css'), /summary:focus-visible/);
  for (const locale of ['fr', 'en'] as const) {
    const items = rhythmCopy[locale].c.faq;
    assert.ok(items.some((item) => item.question.length > 100), `${locale}: a long question stresses the layout`);
  }
});

test('metrics and unbacked evidence are always labelled as demonstration', () => {
  assert.match(read('components/page/MetricComposition.tsx'), /demo: string/);
  assert.match(read('components/page/MetricComposition.tsx'), /demoTag/);
  for (const locale of ['fr', 'en'] as const) {
    assert.ok(rhythmCopy[locale].b.metricDemo.length > 0);
    assert.ok(rhythmCopy[locale].b.metricNote.length > 0);
    assert.ok(rhythmCopy[locale].c.proofDemo.length > 0);
    assert.ok(rhythmCopy[locale].a.proofDemo.length > 0);
  }
  // The primitive guidance text names what must be avoided, so it is excluded; the content itself must not invent evidence.
  const combined = JSON.stringify({ fr: { ...rhythmCopy.fr, prim: undefined }, en: { ...rhythmCopy.en, prim: undefined } });
  assert.doesNotMatch(combined, /testimonial|témoignage client|certifi|clients? nous font confiance/i);
});

test('rhythm studies only use committed assets and the real product capture', () => {
  const source = read('app/design-lab/RhythmStudies.tsx');
  const paths = [...source.matchAll(/src: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(paths.length >= 5);
  for (const path of paths) assert.ok(existsSync(join(root, 'public', path.slice(1))), `${path} is missing`);
  assert.ok(paths.some((path) => path.includes('/website-v2/documents/document-blueprint-desk.webp')));
  assert.ok(paths.some((path) => path.includes('/website-v2/architecture/building-entry.webp')));
});

test('no production page or shell imports the page-composition primitives yet', () => {
  const offenders = [...walk('app'), ...walk('components'), ...walk('lib')]
    .filter((path) => /\.(tsx?|css)$/.test(path))
    .filter((path) => !path.startsWith(join('app', 'design-lab')) && !path.startsWith(join('app', 'about')) && !path.startsWith(join('app', 'contact')) && !path.startsWith(join('app', 'partners')) && !path.startsWith(join('app', 'programme-recommandation')) && !path.startsWith(join('app', 'gestion-documentaire')) && !path.startsWith(join('app', 'gestion-de-projets')) && !path.startsWith(join('app', 'performance-objectifs')) && !path.startsWith(join('app', 'portail-client')) && !path.startsWith(join('app', 'resilience-operationnelle')) && !path.startsWith(join('app', 'sentinelle')) && !path.startsWith(join('app', 'sentinelle-population')) && !path.startsWith(join('app', 'coro-incident')) && !path.startsWith(join('app', 'security')) && !path.startsWith(join('app', 'pricing')) && !path.startsWith(join('app', 'guides')) && !path.startsWith(join('app', 'documents', 'plan-mesures-urgence-pmu')) && !path.startsWith(join('app', 'documents', 'plan-securite-incendie-psi')) && !path.startsWith(join('app', 'documents', 'plan-continuite-activites-pca')) && !path.startsWith(join('app', 'documents', 'plan-gestion-crise-pgc')) && !path.startsWith(join('components', 'page')) && !path.startsWith(join('components', 'spatial')))
    .filter((path) => /components\/page\//.test(read(path)));
  assert.deepEqual(offenders, []);
});

test('motion is progressive, dependency-free and off under reduced motion', () => {
  const css = read('components/page/page.module.css');
  assert.match(css, /@supports \(animation-timeline: view\(\)\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /infinite/);
  assert.deepEqual(Object.keys(JSON.parse(read('package.json')).dependencies).sort(), ['lucide-react', 'next', 'react', 'react-dom']);
});

test('Design Lab copy is bilingual with identical structure', () => {
  assert.deepEqual(keys(rhythmCopy.fr).sort(), keys(rhythmCopy.en).sort());
  assert.equal(rhythmCopy.fr.b.dimensions.length, rhythmCopy.en.b.dimensions.length);
  assert.equal(rhythmCopy.fr.a.features.length, rhythmCopy.en.a.features.length);
});

// LAB-03B surface dosage: paper / grid is a contextual accent, not the recipe of every family.
const studyBody = (name: string) => {
  const source = read('app/design-lab/RhythmStudies.tsx');
  return source.slice(source.indexOf(`export function ${name}`)).split('\n/* ─────')[0];
};
const tonesOf = (body: string) => [...body.matchAll(/tone="(white|soft|paper|navy)"/g)].map((m) => m[1]);

test('Architectural rhythm is not grid-dominant: soft surface, white and one navy moment, no paper', () => {
  const tones = tonesOf(studyBody('RhythmA'));
  assert.ok(!tones.includes('paper'));
  assert.ok(tones.includes('soft') && tones.includes('white'));
  assert.equal(tones.filter((tone) => tone === 'navy').length, 1);
});

test('Operational rhythm does not depend on the grid and is not dark throughout', () => {
  const tones = tonesOf(studyBody('RhythmB'));
  assert.ok(!tones.includes('paper'));
  assert.ok(tones.includes('navy') && tones.includes('white'));
  assert.ok(tones.filter((tone) => tone === 'white').length > tones.filter((tone) => tone === 'navy').length);
});

test('Technical rhythm keeps architectural paper as a contextual surface, once, between white and navy', () => {
  const tones = tonesOf(studyBody('RhythmC'));
  assert.equal(tones.filter((tone) => tone === 'paper').length, 1);
  assert.ok(tones.includes('white') && tones.includes('navy'));
});

test('the soft surface has no grid, gradient or new token; paper keeps its grid', () => {
  const css = read('components/page/page.module.css');
  const soft = css.match(/\.section\[data-tone="soft"\][^{]*\{[^}]*\}/g)?.join('\n') ?? '';
  assert.ok(soft.includes('--coro-v1-surface-2'));
  assert.doesNotMatch(soft, /gradient|background-image/);
  const paper = css.match(/\.section\[data-tone="paper"\] \{[^}]*\}/)?.[0] ?? '';
  assert.match(paper, /gradient/);
  assert.match(read('components/page/PageSection.tsx'), /'white' \| 'soft' \| 'paper' \| 'navy'/);
});

test('the rejected horizontal sequence is not used in any promoted example', () => {
  assert.doesNotMatch(read('app/design-lab/RhythmStudies.tsx'), /layout="sequence"/);
  assert.match(read('components/page/FeatureIndex.tsx'), /REJECTED/);
});

test('Zone 03 states that architectural paper is contextual, in both languages', () => {
  assert.match(rhythmCopy.fr.zone.surfaceRule, /contextuel/);
  assert.match(rhythmCopy.en.zone.surfaceRule, /contextual/);
  assert.equal(rhythmCopy.fr.zone.families.length, 3);
  assert.equal(rhythmCopy.en.zone.families.length, 3);
});
