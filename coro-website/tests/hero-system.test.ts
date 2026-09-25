import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { heroStudies } from '../app/design-lab/heroes-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((name) => {
  const path = join(dir, name);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});

test('three distinct hero compositions exist and the Lab shows all three', () => {
  for (const name of ['HeroArchitectural', 'HeroOperational', 'HeroTechnical']) {
    assert.ok(existsSync(join(root, `components/hero/${name}.tsx`)), `${name} is missing`);
    assert.ok(existsSync(join(root, `components/hero/${name.replace('Hero', 'hero-').toLowerCase()}.module.css`)), `${name} has no stylesheet of its own`);
    assert.match(read('app/design-lab/HeroSystemZone.tsx'), new RegExp(`<${name}\\b`));
  }
  const zone = read('app/design-lab/HeroSystemZone.tsx');
  for (const id of ['hero-a', 'hero-b', 'hero-c']) assert.ok(zone.includes(id));
});

test('the compositions are not one template: each owns its layout and shares only primitives', () => {
  const [a, b, c] = ['architectural', 'operational', 'technical'].map((n) => read(`components/hero/hero-${n}.module.css`));
  assert.notEqual(a, b); assert.notEqual(b, c);
  assert.match(b, /mask-image/);
  assert.match(c, /paper/);
  assert.match(a, /content-wide/);
  assert.doesNotMatch(read('components/hero/hero.module.css'), /grid-template-columns:\s*minmax\(0, 27rem\)/);
});

test('the primary asset pack images are referenced and present', () => {
  const sources = [read('components/hero/HeroArchitectural.tsx'), read('components/hero/HeroOperational.tsx'), read('components/hero/HeroTechnical.tsx')].join('\n');
  for (const asset of ['building-hero-day.webp', 'building-hero-night.webp', 'building-blueprint.webp', 'building-cutaway.webp']) {
    assert.ok(sources.includes(`/website-v2/architecture/${asset}`), `${asset} is not referenced`);
    assert.ok(existsSync(join(root, 'public/website-v2/architecture', asset)), `${asset} is missing on disk`);
  }
  assert.match(read('components/hero/HeroMedia.tsx'), /from 'next\/image'/);
});

test('the primary CTA stays CORO red in every hero and blue is never an action colour', () => {
  for (const name of ['HeroArchitectural', 'HeroOperational', 'HeroTechnical']) {
    const source = read(`components/hero/${name}.tsx`);
    const primary = source.match(/<Button href=\{copy\.primary\.href\}[^>]*>/);
    assert.ok(primary, `${name} has no primary Button`);
    assert.doesNotMatch(primary![0], /variant=/, `${name}: the primary CTA must use the default (red) variant`);
  }
  assert.match(read('components/ui/primitives.module.css'), /\.primary\{background:var\(--coro-red-600\)/);
});

test('hero components are not imported by any production page yet', () => {
  const offenders = [...walk('app'), ...walk('components'), ...walk('lib')]
    .filter((path) => /\.(tsx?|css)$/.test(path))
    .filter((path) => !path.startsWith(join('app', 'design-lab')) && !path.startsWith(join('app', 'gestion-documentaire')) && !path.startsWith(join('components', 'hero')))
    .filter((path) => /components\/hero|\.\/hero\//.test(read(path)));
  assert.deepEqual(offenders.map((path) => relative(root, join(root, path))), []);
});

test('the Design Lab stays noindex and out of the sitemap with the hero zone added', () => {
  assert.match(read('app/design-lab/page.tsx'), /robots:\s*\{\s*index:\s*false/);
  assert.doesNotMatch(read('app/sitemap.ts'), /design-lab/);
  assert.doesNotMatch(read('lib/site/routes.ts'), /design-lab/);
});

test('no runtime dependency was added for the hero system', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['lucide-react', 'next', 'react', 'react-dom']);
});

test('visual asset files are unchanged since they were committed', (context) => {
  try { execFileSync('git', ['cat-file', '-e', '6d0baebf^{commit}'], { cwd: root, stdio: 'ignore' }); } catch { context.skip('asset-pack commit 6d0baebf is not available in this clone'); return; }
  let changed = false;
  try { execFileSync('git', ['diff', '--quiet', '6d0baebf', '--', 'public/website-v2'], { cwd: root, stdio: 'ignore' }); } catch { changed = true; }
  assert.equal(changed, false, 'public/website-v2 differs from the committed asset pack');
});

test('hero motion is restrained, dependency-free and disabled under reduced motion', () => {
  const css = read('components/hero/hero.module.css');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@keyframes rise/);
  assert.doesNotMatch(css, /infinite/);
});

test('hero styling avoids generic gradients, glow and heavy shadow', () => {
  for (const name of ['hero', 'hero-architectural', 'hero-operational', 'hero-technical']) {
    const css = read(`components/hero/${name}.module.css`);
    assert.doesNotMatch(css, /radial-gradient|conic-gradient|violet|purple|neon|backdrop-filter|blur\(/i, `${name}.module.css uses a forbidden treatment`);
    assert.doesNotMatch(css, /box-shadow:\s*0\s+\d+px\s+\d{2,}px/, `${name}.module.css uses a large drop shadow`);
  }
});

test('demonstration content is bilingual, labelled as demo and keeps desktop annotations to three', () => {
  for (const locale of ['fr', 'en'] as const) {
    const t = heroStudies[locale];
    assert.ok(t.a.annotations.length >= 2 && t.a.annotations.length <= 3);
    assert.equal(t.c.references.length, 3);
    assert.ok(t.b.panel.demo.length > 0 && t.b.panel.note.length > 0, 'operational values must be labelled as demonstration data');
    for (const point of [...t.a.annotations, ...t.c.references]) assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100);
    for (const study of [t.a, t.b, t.c]) { assert.ok(study.copy.title.length >= 1); assert.ok(study.mediaAlt.length > 20); assert.ok(study.notes.mobile.length > 0); }
  }
  assert.equal(heroStudies.fr.a.annotations.length, heroStudies.en.a.annotations.length);
});
