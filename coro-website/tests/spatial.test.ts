import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spatialAsset, spatialCopy, spatialItems } from '../app/design-lab/spatial-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const spatialFiles = readdirSync(join(root, 'components/spatial')).map((name) => `components/spatial/${name}`);
const css = read('components/spatial/spatial.module.css');
const all = spatialFiles.map(read).join('\n');

test('Zone 04 exists with four studies, a scale concept and an isolated view', () => {
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /<SpatialZone\b/);
  assert.ok(page.includes('#spatial'));
  assert.ok(page.includes("view === 'spatial'"));
  const zone = read('app/design-lab/SpatialStudies.tsx');
  for (const id of ['spatial-a', 'spatial-b', 'spatial-c', 'spatial-d']) assert.ok(zone.includes(`id="${id}"`), id);
  for (const frame of ['BuildingFrame', 'BlueprintFrame', 'MapFrame']) assert.match(zone, new RegExp(`<${frame}\\b`));
  for (const locale of ['fr', 'en'] as const) assert.equal(spatialCopy[locale].zone.scale.length, 4);
});

test('BuildingFrame and BlueprintFrame are distinct: 10px photographic media versus a sharp technical frame', () => {
  const frames = read('components/spatial/SpatialFrames.tsx');
  assert.match(frames, /variant="building"/);
  assert.match(frames, /variant="blueprint"/);
  assert.match(css, /\[data-variant="building"\] \.frame \{[^}]*radius-image/);
  assert.match(css, /\[data-variant="blueprint"\] \.frame \{[^}]*radius-frame/);
  assert.doesNotMatch(css.match(/\[data-variant="blueprint"\] \.frame \{[^}]*\}/)?.[0] ?? '', /radius-image/);
  assert.match(css, /\[data-variant="map"\] \.frame \{[^}]*radius-panel/);
});

test('every mark is aria-hidden and every item has a real text equivalent in an ordered list', () => {
  const marks = read('components/spatial/SpatialMarks.tsx');
  assert.equal((marks.match(/aria-hidden="true"/g) ?? []).length, 4);
  const figure = read('components/spatial/SpatialFigure.tsx');
  assert.match(figure, /<ol className=\{styles\.index\} aria-label=/);
  assert.match(figure, /item\.kindLabel/);
  for (const locale of ['fr', 'en'] as const) {
    for (const study of ['a', 'b', 'c', 'd'] as const) {
      const items = spatialItems(locale, study);
      assert.ok(items.length >= 2 && items.length <= 6, `${study} item count`);
      assert.equal(new Set(items.map((i) => i.n)).size, items.length);
      for (const item of items) { assert.ok(item.title && item.kindLabel && item.detail, `${study}${item.n}`); }
    }
  }
  assert.ok(spatialCopy.fr.a.alt && !/Étage 0|Accès principal/.test(spatialCopy.fr.a.alt), 'alt describes the base media only');
  assert.doesNotMatch(css, /\.index[^{]*\{[^}]*display:\s*none/);
});

test('marker counts follow the brief and small screens keep few numbered pins', () => {
  const n = (study: 'a' | 'b' | 'c' | 'd') => spatialItems('fr', study);
  assert.ok(n('a').filter((i) => i.kind === 'floor').length >= 3 && n('a').filter((i) => i.kind === 'floor').length <= 5);
  assert.ok(n('a').filter((i) => i.kind === 'callout').length >= 2 && n('a').filter((i) => i.kind === 'callout').length <= 3);
  assert.ok(n('b').length >= 2 && n('b').length <= 4);
  assert.ok(n('c').filter((i) => i.kind === 'zone').length <= 2);
  assert.ok(n('d').length <= 3);
  for (const study of ['a', 'b', 'c', 'd'] as const) assert.ok(n(study).filter((i) => i.mobile === 'pin').length < n(study).length || n(study).length <= 3, study);
  assert.match(css, /@media \(min-width: 68rem\)[\s\S]*\.pin \{ display: none !important/);
  assert.match(css, /\[data-mobile="hide"\] \.pin \{ display: none/);
});

test('the territory study is explicitly demonstration / reference media', () => {
  for (const locale of ['fr', 'en'] as const) {
    assert.match(spatialCopy[locale].d.note, /(démonstration|demonstration)/i);
    assert.match(spatialCopy[locale].zone.demo, /(démonstration|demonstration)/i);
  }
  assert.match(read('app/design-lab/SpatialStudies.tsx'), /legend=\{legend\}/);
});

test('only committed assets are used and none changed', () => {
  for (const asset of Object.values(spatialAsset)) assert.ok(asset.src.startsWith('/website-v2/'), asset.src);
  const stat = readFileSync(join(root, 'public/website-v2/architecture/building-cutaway.webp'));
  assert.ok(stat.length > 1000);
});

test('no new dependency, no production import, Lab stays noindex', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
  assert.doesNotMatch(deps, /leaflet|mapbox|maplibre|d3|three|konva|gsap|framer/);
  for (const file of [...spatialFiles, 'app/design-lab/SpatialStudies.tsx', 'app/design-lab/spatial-data.ts']) {
    const imports = read(file).match(/from '[^']+'/g) ?? [];
    for (const imp of imports) assert.doesNotMatch(imp, /HomePageClient|ProductPage|Compositions|DemoForm|components\/site\/(?!SiteHeader)/, `${file} ${imp}`);
  }
  assert.match(read('app/design-lab/page.tsx'), /robots: \{ index: false, follow: false/);
});

test('no sci-fi effects: no glow, blur, radial or conic gradients, pulse, scan or infinite loops', () => {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /radial-gradient|conic-gradient|backdrop-filter|blur\(|infinite|drop-shadow|text-shadow|perspective|rotate3d/);
  assert.doesNotMatch(code, /@keyframes\s+(pulse|radar|scan|blink|glow)/);
  assert.doesNotMatch(code, /#(?:0ff|00ffff|f0f|ff00ff|7c3aed|8b5cf6|a855f7)\b/i);
  assert.doesNotMatch(all.replace(/\/\*[\s\S]*?\*\//g, ''), /<canvas|<svg/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

// LAB-04B: overlay density is inversely proportional to the density of the source media.
const fullOnMedia = (locale: 'fr' | 'en', study: 'a' | 'b' | 'c' | 'd') => spatialItems(locale, study).filter((i) => i.density !== 'ref');

test('dense source media carry at most two full overlays; other references are numbered markers', () => {
  for (const locale of ['fr', 'en'] as const) {
    assert.ok(fullOnMedia(locale, 'b').length <= 2, 'blueprint');
    assert.ok(fullOnMedia(locale, 'd').length <= 2, 'map');
    assert.ok(spatialItems(locale, 'b').some((i) => i.density === 'ref'));
    for (const study of ['b', 'd'] as const) for (const item of spatialItems(locale, study).filter((i) => i.density === 'ref')) assert.ok(item.title && item.detail, 'ref items keep their semantic detail');
    assert.equal(spatialItems(locale, 'b').length, 4, 'nothing is removed from the index');
  }
  assert.match(css, /\[data-density="ref"\] \.pin \{ display: grid/);
  assert.match(css, /\[data-density="ref"\] :is\([^)]*\.head[^)]*\.ptag[^)]*\) \{ display: none/);
  for (const locale of ['fr', 'en'] as const) assert.ok(spatialCopy[locale].zone.rule.length > 20);
});

test('approved studies A and C keep their overlay contracts', () => {
  for (const locale of ['fr', 'en'] as const) {
    const a = spatialItems(locale, 'a'); const c = spatialItems(locale, 'c');
    assert.equal(a.filter((i) => i.kind === 'floor').length, 4);
    assert.equal(a.filter((i) => i.kind === 'callout').length, 2);
    assert.equal(c.filter((i) => i.kind === 'zone').length, 2);
    assert.equal(c.length, 3);
    assert.ok([...a, ...c].every((i) => i.density === undefined), 'A and C use the default density');
  }
});
