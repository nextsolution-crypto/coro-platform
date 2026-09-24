import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { heroStudies } from '../app/design-lab/heroes-data.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sha = (path: string) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');

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

// LAB-02B baseline. B, C and the shared primitives must not change in this lot. When a later lot deliberately
// changes them, update these hashes in that lot.
const baseline: Record<string, string> = {
  'components/hero/HeroOperational.tsx': '66d3dc6e960789f8e85bf2c6713c521648dcc6a485fba857f8f75415e42f3566',
  'components/hero/hero-operational.module.css': 'c01d17cd93645f161023d3bcc2be0cfde1b8e7b1c8cdbd905d3aa2eb3c392746',
  'components/hero/HeroTechnical.tsx': '862c7036c6803b368f069bb928c6bd998fc5750de16e285082c0788ecde56ba9',
  'components/hero/hero-technical.module.css': '37253ecf33b716332e419fb102249ad3c307007444ffd4baa55d86eafa4ab6a3',
  'components/hero/hero.module.css': 'd4010406e0d95fc2de3d669138f901ff362fcfb48f16d0cfefc6cbee4e6fb951',
  'components/hero/HeroMedia.tsx': '24e96d6c9132bbe4de5c4237977821cc335af114f94945d8c8e909e2e695d4a7',
  'components/hero/HeroCallouts.tsx': '0842494f8f79bc62582463a255458af83c4eef4825710f102fc27bbe51ad5bb6',
  'components/hero/HeroArchitectural.tsx': '9300518aab084a550550ff9bef631e2d4fc26870b2d2c50c7d8fb0dce484b75a',
  'components/hero/hero-architectural.module.css': '3e20c5d60fc4c0bf5f42c9964d88d752111d0735d4da2cf36064433a5a447520',
};

test('Hero B, Hero C, A1 and the shared hero primitives are unchanged by LAB-02B', () => {
  for (const [file, hash] of Object.entries(baseline)) assert.equal(sha(file), hash, `${file} changed`);
});

test('production pages and the shell still do not import hero components', () => {
  for (const file of ['app/page.tsx', 'app/HomePageClient.tsx', 'app/layout.tsx', 'components/ProductPage.tsx', 'components/ProductCompositions.tsx', 'app/about/AboutV2.tsx']) {
    assert.doesNotMatch(read(file), /components\/hero/, `${file} imports the hero system`);
  }
});
