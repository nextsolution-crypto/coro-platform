import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-urgence-environnementale-pue (MIG-05G) — sixth and final document guide migrated to V2. Baseline: tests/fixtures/guide-pue-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-urgence-environnementale-pue/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-urgence-environnementale-pue/page.module.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseline = JSON.parse(read('tests/fixtures/guide-pue-baseline.json')) as { fr: { bodyText: string; canonical: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-pue-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 had no searchParams handling — ?lang=en rendered identical French text');
});

test('registry and route: exact PUE path, PUBLISH-NOW, FR only, in the sitemap, registered after PRA, legacy footer gone', () => {
  const r = getRoute('guide-pue');
  assert.equal(r?.path, '/documents/plan-urgence-environnementale-pue');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-urgence-environnementale-pue'));
  assert.ok(migratedV2Routes.includes('/documents/plan-urgence-environnementale-pue'));
  assert.ok(migratedV2Routes.indexOf('/documents/plan-reprise-activites-pra') < migratedV2Routes.indexOf('/documents/plan-urgence-environnementale-pue'));
  assert.equal(isLegacyFooterVisible('/documents/plan-urgence-environnementale-pue'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the industrial illustration, decorative, single H1/EditorialHero, image not modified, no fact derived from it', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-pue-environmental-emergency.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-pue-environmental-emergency.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
  assert.doesNotMatch(code, /ammoniac|AMMONIAC/i, 'the hero\'s pictured substance label must never be reproduced as page content');
});

test('PUBLICATION-BLOCKER PUE-01 resolved: V1 CTA/product overclaim is completely absent', () => {
  assert.doesNotMatch(code, /Générer votre PUE|Créer votre PUE|Produire votre PUE|Structurer votre PUE|Automatiser votre PUE|Commencer votre PUE/i);
  assert.doesNotMatch(code, /PUE (est |maintenant )?disponible dans CORO/i);
  assert.doesNotMatch(code, /CORO (génère|produit) (automatiquement )?(les sections réglementaires|votre PUE)/i);
});

test('CRITICAL product boundary: PUE production is Phase 2, PMU/PSI/PCA current scope stated', () => {
  assert.match(code, /Production CORO prévue en phase 2/);
  assert.match(code, /Le PUE dans CORO : une capacité prévue en phase 2/);
  assert.match(code, /CORO Documents prend actuellement en charge le PMU, le PSI et le PCA/);
});

test('no unsupported automation claims (automatic applicability, zone calculation, plume modelling, population count, alerting)', () => {
  assert.doesNotMatch(code, /CORO détermine automatiquement|CORO calcule automatiquement|CORO modélise automatiquement|CORO identifie automatiquement|CORO alerte automatiquement|CORO transmet automatiquement/i);
  assert.doesNotMatch(code, /CORO garantit la conformité|CORO est certifié/i);
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|Building Bridge|intelligence artificielle/);
});

test('applicability is stated conditionally, never as a blanket rule or facility-specific legal conclusion', () => {
  assert.doesNotMatch(code, /toute installation industrielle doit avoir un PUE|toute substance E2 exige un PUE/i);
  assert.doesNotMatch(code, /votre installation est assujettie\b/i);
  assert.match(code, /peut être assujettie/);
  assert.match(code, /évaluation doit se faire à partir de l’inventaire réel/);
});

test('no fake impact-zone map, plume, radius, distance, or population count anywhere in copy', () => {
  assert.doesNotMatch(code, /\d+(\.\d+)?\s*km\b/i);
  assert.doesNotMatch(code, /ERPG|AEGL|ZPI|ZPU/);
  assert.doesNotMatch(code, /panache|plume/i);
});

test('no client-contamination: no client-specific facility, substance quantity or project-derived value', () => {
  assert.doesNotMatch(code, /Sobeys|Boucherville|Lassonde|Rougemont|Prémont|Premont/i);
  assert.doesNotMatch(code, /5455|5 455|1[.,]98|2[.,]6\s*km|150\s*ppm/);
});

test('no invented exercise frequency beyond the verified annual/five-year distinction; no invented reporting deadline or retention period', () => {
  const s7 = code.slice(code.indexOf('s7: {'), code.indexOf('s8: {'));
  assert.match(s7, /chaque année/);
  assert.match(s7, /cinq ans/);
  assert.doesNotMatch(code, /dans les \d+\s*(heures|jours)|conservées? \d+\s*jours/i);
});

test('notification wording is conditional, "immédiatement" removed per family discipline', () => {
  assert.doesNotMatch(code, /immédiatement/i);
  assert.match(code, /ayant ou pouvant avoir un effet nocif/);
});

test('MIG-05G: PUE does not clone PMU, PSI, PCA, PGC or PRA visual signatures', () => {
  assert.doesNotMatch(code, /'Agir'|psiAnchor|elementsGrid|continueAnchor|decideWord|priorityMain\b/);
  assert.doesNotMatch(code, /repère éditorial, pas une séquence réglementaire/, 'PMU wording must not appear');
  assert.doesNotMatch(code, /ne forment pas une séquence obligatoire/, 'PSI wording must not appear');
  assert.doesNotMatch(code, /liés, pas séquentiels/, 'PGC wording must not appear');
  assert.doesNotMatch(code, /il n’existe pas d’ordre universel/, 'PRA wording must not appear');
});

test('MIG-05G: "Protéger" typographic moment beside Substance/Scénario/Conséquence, no arrows, no numeric values', () => {
  assert.match(code, /className=\{styles\.protectWord\}/);
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  assert.match(s3, /statement: 'Protéger'/);
  const triadBlock = s3.slice(s3.indexOf('triad: ['), s3.indexOf('] as const'));
  const titles = [...triadBlock.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(titles, ['Substance', 'Scénario', 'Conséquence']);
});

test('MIG-05G: navy territorial composition has a dominant central field and four perimeter interests, distinct geometry, no map semantics', () => {
  assert.match(code, /className=\{styles\.territoryField\}/);
  assert.match(code, /className=\{styles\.territoryCentral\}/);
  assert.match(code, /className=\{styles\.perimeter\}/);
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const interestsBlock = s4.slice(s4.indexOf('interests: ['), s4.indexOf('] as const'));
  const names = [...interestsBlock.matchAll(/\[\s*'([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(names, ['Population', 'Environnement', 'Installation', 'Intervenants']);
  assert.match(code, /zone d’impact précise|zone calculée/i, 'the section must explicitly disclaim calculated zones');
});

test('249 substances / six hazard categories stated factually, not as a visual number anchor or eligibility shortcut', () => {
  assert.match(code, /249 substances/);
  assert.doesNotMatch(code, /className=\{styles\.[a-zA-Z]*\}>249/, '249 must not be used as an oversized typographic anchor');
});

test('Sentinelle Population remains distinct — not referenced as satisfying PUE or performing automatic alerting', () => {
  assert.doesNotMatch(code, /Sentinelle Population/);
});

test('PUE vs PMU relationship is non-hierarchical, contextual link present', () => {
  const s8 = code.slice(code.indexOf('s8: {'), code.indexOf('s9: {'));
  assert.doesNotMatch(s8, /doit toujours|toujours intégré/i);
  assert.ok(page.includes("localizedHref('/documents/plan-mesures-urgence-pmu'"));
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('internal links: /guides required, PMU contextual, CORO Documents link uses current-scope wording only', () => {
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
  assert.match(code, /Voir les documents disponibles aujourd’hui/);
});

test('resources intentionally omitted — no forced filler article', () => {
  assert.doesNotMatch(code, /res: \{|Pour approfondir/);
});

test('CTA does not promise current PUE production', () => {
  assert.doesNotMatch(code, /Créer mon PUE|Générer mon PUE|Produire mon PUE|Commencer mon PUE/i);
  assert.match(code, /prépare l’organisation à protéger/);
});

test('metadata: title/description REWRITE, canonical path unchanged from baseline, no product-availability overclaim', () => {
  assert.match(page, /path: '\/documents\/plan-urgence-environnementale-pue'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-urgence-environnementale-pue');
  assert.doesNotMatch(code, /metaTitle:[^,]*(Générez|disponible dans CORO|logiciel PUE)/i);
});

test('accessibility: single V2Shell', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
});

test('density stays local — shared PageSection/page.module.css primitives are not modified; V1 tokens only, no gradients/shadows/green rebrand', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
