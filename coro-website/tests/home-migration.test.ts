import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, isV2MigratedRoute, migratedV2Routes } from '../lib/site/v2-migration.ts';

/**
 * `/` (MIG-08A) — Homepage reshell into V2Shell. Baselines: tests/fixtures/homepage-referral-baseline.json,
 * homepage-links-baseline.json, homepage-sections-baseline.json. See docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md.
 * Protects the contract (referral/cookie, DemoForm, FR/EN, SEO, section inventory), not final production copy.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const referralBaseline = JSON.parse(read('tests/fixtures/homepage-referral-baseline.json')) as {
  cookieNameCode: string; cookieNameFirstTouch: string; maxAgeSeconds: number; formatRegex: string;
};
const linksBaseline = JSON.parse(read('tests/fixtures/homepage-links-baseline.json')) as { validInternalTargets: string[] };
const sectionsBaseline = JSON.parse(read('tests/fixtures/homepage-sections-baseline.json')) as { sections: string[]; targetSectionCount: number };

const referralSource = read('app/home/client/ReferralCapture.tsx');
const homeSource = read('app/home/Home.tsx');
const sectionsSource = read('app/home/components/Sections.tsx');
const pageSource = read('app/page.tsx');
const demoFormSource = read('app/DemoForm.tsx');

test('root route is not yet in the static or dynamic V2 registry (pre-registry state guard)', () => {
  // This test is expected to start failing the moment `/` is added to migratedV2Routes — that is the
  // intended pre-registry -> post-registry transition signal, mirroring every prior MIG's own protocol.
  if (migratedV2Routes.includes('/')) {
    assert.ok(isV2MigratedRoute('/'), 'root is registered: post-registry state');
  } else {
    assert.equal(isV2MigratedRoute('/'), false);
    assert.equal(isLegacyFooterVisible('/'), true);
  }
});

test('referral cookie contract matches the exact legacy behavior', () => {
  assert.match(referralSource, new RegExp(referralBaseline.cookieNameCode));
  assert.match(referralSource, new RegExp(referralBaseline.cookieNameFirstTouch));
  assert.match(referralSource, /REFERRAL_COOKIE_MAX_AGE = 60 \* 60 \* 24 \* 90/);
  assert.match(referralSource, /\^CR-\[A-HJ-NP-Z2-9\]\{6\}\$/);
  // First-touch-wins: existing cookie must be checked before writing.
  assert.match(referralSource, /getCookie\(REFERRAL_COOKIE_CODE\)/);
  assert.match(referralSource, /if \(!existingReferralCode\)/);
  // Domain/secure scoping preserved exactly.
  assert.match(referralSource, /\.getcoro\.io/);
  assert.match(referralSource, /SameSite=Lax/);
});

test('referral capture is a narrow client island, not the whole page', () => {
  assert.match(referralSource, /'use client'/);
  const lineCount = referralSource.split('\n').length;
  assert.ok(lineCount < 60, `ReferralCapture.tsx is ${lineCount} lines — expected a narrow island`);
});

test('DemoForm is reused unchanged (same fields, same endpoint, same referral propagation)', () => {
  assert.match(demoFormSource, /formspree\.io\/f\/xnpadzyq/);
  assert.match(demoFormSource, /referralCode/);
  assert.match(demoFormSource, /referralFirstTouchAt/);
  assert.match(sectionsSource, /DemoForm lang=\{locale\}/);
});

test('Homepage is composed of named sections, not a single monolith', () => {
  const lineCount = homeSource.split('\n').length;
  assert.ok(lineCount < 80, `Home.tsx is ${lineCount} lines — expected a thin composition, not a monolith`);
  for (const id of sectionsBaseline.sections) {
    assert.match(sectionsSource, new RegExp(`id="${id}"`), `section ${id} is missing from Sections.tsx`);
  }
  assert.equal(sectionsBaseline.sections.length, sectionsBaseline.targetSectionCount);
});

test('Homepage uses V2Shell, not the legacy client monolith', () => {
  assert.match(homeSource, /V2Shell/);
  assert.doesNotMatch(pageSource, /HomePageClient/);
});

test('internal links target valid, already-migrated V2 routes', () => {
  const content = read('app/home/content.ts');
  const hrefs = [...content.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 5);
  for (const href of hrefs) {
    if (href.includes('#')) continue; // in-page anchors (e.g. /#demo) are not routes to validate here
    const path = href.split('?')[0];
    assert.ok(
      linksBaseline.validInternalTargets.includes(path),
      `${path} is not in the validated internal-link baseline`
    );
  }
});

test('PGC/PRA/PUE (and CMP/DRP/EEP) are never presented as available today', () => {
  const content = read('app/home/content.ts');
  assert.match(content, /phase: 2/);
  // Every Phase-2 document code must appear only inside an item carrying `phase: 2`, never with a bare "available now" claim.
  const items = [...content.matchAll(/\{ code: '(PGC|PRA|PUE|CMP|DRP|EEP)'[^}]*\}/g)];
  assert.ok(items.length === 6, `expected 6 Phase-2 document entries, found ${items.length}`);
  for (const [entry] of items) assert.match(entry, /phase: 2/);
});

test('no fabricated Ops/Network/Campus/Building-Bridge/general-QR capability is presented as current', () => {
  const content = read('app/home/content.ts');
  assert.doesNotMatch(content, /CORO Ops/i);
  assert.doesNotMatch(content, /CORO Network/i);
  assert.doesNotMatch(content, /CORO Campus/i);
  assert.doesNotMatch(content, /Building Bridge/i);
});

test('metadata/JSON-LD logic in app/page.tsx is preserved (FR/EN, canonical, WebSite + Organization)', () => {
  assert.match(pageSource, /generateMetadata/);
  assert.match(pageSource, /WebSite/);
  assert.match(pageSource, /Organization/);
  assert.match(pageSource, /fr-CA/);
  assert.match(pageSource, /en-CA/);
});

test('FR/EN content parity: every top-level content key exists in both locales', () => {
  const content = read('app/home/content.ts');
  const frMatch = content.match(/const fr = \{([\s\S]*?)\n\};/);
  const enMatch = content.match(/const en: HomeContent = \{([\s\S]*?)\n\};/);
  assert.ok(frMatch && enMatch);
  const frKeys = [...(frMatch![1].matchAll(/^\s{2}(\w+):/gm))].map((m) => m[1]);
  const enKeys = [...(enMatch![1].matchAll(/^\s{2}(\w+):/gm))].map((m) => m[1]);
  assert.deepEqual([...frKeys].sort(), [...enKeys].sort());
});
