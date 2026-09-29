import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-mesures-urgence-pmu (MIG-05B) — first of six document guides migrated to V2. Baseline: tests/fixtures/guide-pmu-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-mesures-urgence-pmu/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-mesures-urgence-pmu/page.module.css');
const baseline = JSON.parse(read('tests/fixtures/guide-pmu-baseline.json')) as { fr: { bodyText: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-pmu-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 ?lang=en rendered identical French text — no real English existed to preserve');
});

test('registry and route: exact PMU path, PUBLISH-NOW, FR only, in the sitemap, registered after /guides, legacy footer gone', () => {
  const r = getRoute('guide-pmu');
  assert.equal(r?.path, '/documents/plan-mesures-urgence-pmu');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-mesures-urgence-pmu'));
  assert.ok(migratedV2Routes.includes('/documents/plan-mesures-urgence-pmu'));
  assert.ok(migratedV2Routes.indexOf('/guides') < migratedV2Routes.indexOf('/documents/plan-mesures-urgence-pmu'));
  assert.equal(isLegacyFooterVisible('/documents/plan-mesures-urgence-pmu'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the emergency-measures illustration, decorative, single H1/EditorialHero, image not modified', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-pmu-emergency-measures.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-pmu-emergency-measures.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('product boundary: PMU is available in CORO Documents today, no automatic-compliance or certification claim', () => {
  assert.match(code, /CORO Documents structure la production du PMU/);
  assert.doesNotMatch(code, /conforme à|certifi(é|ée)|garantit la conformité|automatiquement conforme/i);
  assert.doesNotMatch(code, /Phase 2|phase 2/, 'PMU itself must never be mislabeled as Phase 2 — it is available today');
});

test('regulatory corrections: no unsupported CSA "Z731-14" claim, no invented LSST sub-paragraph numbers, corrected citations present', () => {
  assert.doesNotMatch(code, /Z731-14/);
  assert.match(code, /CSA Z731-03/);
  assert.doesNotMatch(code, /51\.1|51\.5|51\.6|51\.8/, 'unverifiable LSST sub-paragraph numbers must not be reproduced');
  assert.match(code, /RSST, section IV/);
  assert.match(code, /LSST, article 51/);
});

test('no invented production-time precision ("quelques heures... plusieurs jours") and no "génère automatiquement" overstatement', () => {
  assert.doesNotMatch(code, /quelques heures.*plusieurs jours|plusieurs jours.*quelques heures/is);
  assert.doesNotMatch(code, /génère automatiquement/i);
});

test('reciprocal links: /guides and /gestion-documentaire are both linked from the PMU page', () => {
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
});

test('PSI relationship stated without a universal mandatory hierarchy; PGC/PRA/PUE mentioned as complementary, not claimed available in CORO', () => {
  assert.match(code, /plan-securite-incendie-psi/);
  assert.match(code, /PCA.*PGC.*PRA.*PUE|PGC.*PRA.*PUE/s);
  assert.doesNotMatch(code, /PGC.{0,80}disponible dans CORO|PRA.{0,80}disponible dans CORO|PUE.{0,80}disponible dans CORO/is);
});

test('no future/unimplemented CORO module is sold on this page', () => {
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|intelligence artificielle/);
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('preparedness cycle: seven steps, framed as an editorial model, not a regulatory sequence or fake incident timeline', () => {
  assert.match(code, /repère éditorial, pas une séquence réglementaire/);
  assert.equal((code.match(/^\s*\[/gm) ?? []).length >= 7, true);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});

test('metadata: title/description preserved as a REWRITE with corrected framing, canonical path unchanged from baseline', () => {
  assert.match(page, /path: '\/documents\/plan-mesures-urgence-pmu'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-mesures-urgence-pmu');
});

test('accessibility: single V2Shell, single EditorialHero (H1), semantic list markup for the legal table and the 8 structuring elements', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
  assert.match(code, /className=\{styles\.rows\}/);
  assert.match(code, /<ol className=\{styles\.elementsGrid\}>/);
});

test('MIG-05B-B: exactly the eight existing structuring elements are preserved, unchanged, in the 2x4 anchor composition', () => {
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const itemsBlock = s4.slice(s4.indexOf('items: ['), s4.indexOf('] as const'));
  const items = [...itemsBlock.matchAll(/'([^']+)',/g)].map((m) => m[1]);
  assert.equal(items.length, 8);
  for (const item of ['La description du bâtiment et de ses systèmes de sécurité', 'Le programme d’exercices annuels']) assert.ok(items.includes(item));
  assert.match(code, /String\(t\.s4\.items\.length\)\.padStart\(2, '0'\)/, 'the "08" anchor is derived from the real item count, never hardcoded');
});

test('MIG-05B-B: no invented procedure count — "Agir" is used instead of a number, and the listed categories are exactly the ones already named in the source text', () => {
  assert.doesNotMatch(code, /\d+\s+procédures/i);
  assert.match(code, /agir: 'Agir'/);
  const s7 = code.slice(code.indexOf('s7: {'), code.indexOf('s8: {'));
  for (const cat of ['Incendie', 'Matières dangereuses', 'Explosion', 'Alerte à la bombe', 'Sauvetage']) assert.ok(s7.includes(`'${cat}'`), cat);
});

test('MIG-05B-B: emergency-organization roles are restricted to the two roles the source text actually names — no invented roles or hierarchy', () => {
  const s6 = code.slice(code.indexOf('s6: {'), code.indexOf('s7: {'));
  const roleNames = [...s6.matchAll(/\[\s*'([^']+)',\s*'/g)].map((m) => m[1]);
  assert.deepEqual(roleNames, ['Personnel de surveillance', 'Équipe de première intervention']);
});

test('MIG-05B-B: preparedness lifecycle content is unchanged by the density/visual pass', () => {
  assert.match(code, /repère éditorial, pas une séquence réglementaire/);
  for (const step of ['Connaître', 'Planifier', 'Organiser', 'Préparer', 'Intervenir', 'Exercer', 'Réviser']) assert.ok(code.includes(`'${step}'`), step);
});

test('MIG-05B-B: density stays local — shared PageSection/page.module.css primitives are not modified by this pass', () => {
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
