import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { heroStudies } from '../app/design-lab/heroes-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('A1 is kept for comparison and A2 exists beside it, labelled REVIEW', () => {
  assert.ok(existsSync(join(root, 'components/hero/HeroArchitectural.tsx')));
  assert.ok(existsSync(join(root, 'components/hero/HeroSignature.tsx')));
  const zone = read('app/design-lab/HeroSystemZone.tsx');
  assert.match(zone, /<HeroArchitectural\b/);
  assert.match(zone, /<HeroSignature\b/);
  for (const locale of ['fr', 'en'] as const) {
    assert.match(heroStudies[locale].a2.name, /ARCHITECTURAL SIGNATURE — REVIEW/);
    assert.doesNotMatch(heroStudies[locale].a2.name, /APPROVED/i);
  }
  assert.doesNotMatch(read('components/hero/HeroSignature.tsx'), /APPROVED|LOCKED/);
});

test('A2 still uses the daylight building photograph and offers both header studies', () => {
  assert.match(read('components/hero/HeroSignature.tsx'), /\/website-v2\/architecture\/building-hero-day\.webp/);
  assert.ok(existsSync(join(root, 'public/website-v2/architecture/building-hero-day.webp')));
  assert.match(read('components/hero/HeroSignature.tsx'), /'separate' \| 'integrated'/);
  assert.match(read('app/design-lab/HeroSystemZone.tsx'), /headerMode="integrated"/);
});

test('A2 does not use the old dark annotation-card treatment', () => {
  const source = read('components/hero/HeroSignature.tsx');
  assert.doesNotMatch(source, /HeroCallouts/);
  const css = `${read('components/hero/hero-signature.module.css')}\n${read('components/hero/technical-annotations.module.css')}`;
  assert.doesNotMatch(css, /\.tag\b|\.callout\b/);
  assert.doesNotMatch(css, /backdrop-filter|blur\(|radial-gradient|conic-gradient/);
  assert.doesNotMatch(css, /box-shadow:\s*[^;]*\b\d+px\s+\d{2,}px/, 'no blurred or large shadow');
  const annotations = read('components/hero/technical-annotations.module.css');
  assert.doesNotMatch(annotations, /\.(item|head|detail|title|list)\s*\{[^}]*background:\s*var\(--coro-v1-navy/, 'annotation text is never on a filled card');
  assert.match(annotations, /\.index\b/);
  assert.match(annotations, /\.end\b/);
});

test('the image corner rule is a token and A2 applies it only to visible, contained corners', () => {
  assert.match(read('app/design-tokens.css'), /--coro-v1-radius-image:\s*\.625rem/);
  const css = read('components/hero/hero-signature.module.css');
  assert.match(css, /var\(--coro-v1-radius-image\)/);
  assert.match(css, /border-radius:\s*var\(--coro-v1-radius-image\) 0 0 var\(--coro-v1-radius-image\)/, 'right edge bleeds: no right corners');
  assert.match(css, /border-radius:\s*0 0 0 var\(--coro-v1-radius-image\)/, 'integrated header: top and right bleed, only the bottom-left corner is visible');
  assert.match(read('app/design-lab/page.tsx'), /'image', '10 px'/);
});

test('the Design Lab demonstrates the radius roles including image = 10px', () => {
  for (const locale of ['fr', 'en'] as const) assert.ok(read('app/design-lab/page.tsx').includes('10 px'), locale);
  const css = read('app/design-lab/design-lab.module.css');
  assert.match(css, /data-i="3"\] \.radiusSample \{[^}]*radius-image/);
});

test('annotations keep the technical vocabulary: numbered, labelled, connected, bilingual', () => {
  for (const locale of ['fr', 'en'] as const) {
    const t = heroStudies[locale].a2;
    assert.equal(t.annotations.length, 3);
    t.annotations.forEach((item, index) => { assert.equal(item.n, index + 1); assert.ok(item.label && item.text); assert.ok(['left', 'right'].includes(item.side)); assert.ok(item.x > 0 && item.x < 100 && item.y > 0 && item.y < 100); });
    assert.ok(t.datum.length > 0);
  }
  assert.match(read('components/hero/TechnicalAnnotations.tsx'), /aria-label=\{label\}/);
});

// The LAB-02B implementation-freeze hashes were retired in LAB-03: they blocked legitimate work. These semantic contracts replace them.
test('Hero B keeps its operational contract: full-bleed night photograph masked into navy, demo-labelled sample data', () => {
  const tsx = read('components/hero/HeroOperational.tsx');
  const css = read('components/hero/hero-operational.module.css');
  assert.ok(tsx.includes('building-hero-night.webp'));
  assert.match(tsx, /data-surface="dark"/);
  assert.ok(tsx.includes('panel.demo'));
  assert.ok(tsx.includes('panel.note'));
  assert.match(css, /mask-image/);
  assert.ok(css.includes('var(--coro-v1-navy-950)'));
});

test('Hero C keeps its technical contract: paper surface, drawing sheet, cartouche, numbered references, cutaway inset', () => {
  const tsx = read('components/hero/HeroTechnical.tsx');
  const css = read('components/hero/hero-technical.module.css');
  assert.ok(tsx.includes('building-blueprint.webp'));
  assert.ok(tsx.includes('building-cutaway.webp'));
  assert.ok(tsx.includes('titleBlock'));
  assert.ok(tsx.includes('references'));
  assert.ok(css.includes('--coro-v1-paper'));
  assert.ok(css.includes('.titleBlock'));
});

test('Hero A1 stays available as the comparison reference and the shared hero primitives keep their public surface', () => {
  assert.match(read('components/hero/HeroArchitectural.tsx'), /export function HeroArchitectural/);
  assert.match(read('components/hero/HeroMedia.tsx'), /export function HeroMedia/);
  assert.match(read('components/hero/HeroCallouts.tsx'), /export function HeroCallouts/);
  assert.match(read('components/hero/hero.module.css'), /prefers-reduced-motion/);
});

test('production pages and the shell still do not import hero components', () => {
  for (const file of ['app/page.tsx', 'app/HomePageClient.tsx', 'app/layout.tsx', 'components/ProductPage.tsx', 'components/ProductCompositions.tsx', 'app/about/AboutV2.tsx']) {
    assert.doesNotMatch(read(file), /components\/hero/, `${file} imports the hero system`);
  }
});
