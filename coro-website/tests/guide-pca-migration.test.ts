import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-continuite-activites-pca (MIG-05D) — third of six document guides migrated to V2. Baseline: tests/fixtures/guide-pca-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-continuite-activites-pca/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-continuite-activites-pca/page.module.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseline = JSON.parse(read('tests/fixtures/guide-pca-baseline.json')) as { fr: { bodyText: string; canonical: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-pca-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 had no searchParams handling — ?lang=en rendered identical French text');
});

test('registry and route: exact PCA path, PUBLISH-NOW, FR only, in the sitemap, registered after PSI, legacy footer gone', () => {
  const r = getRoute('guide-pca');
  assert.equal(r?.path, '/documents/plan-continuite-activites-pca');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-continuite-activites-pca'));
  assert.ok(migratedV2Routes.includes('/documents/plan-continuite-activites-pca'));
  assert.ok(migratedV2Routes.indexOf('/documents/plan-securite-incendie-psi') < migratedV2Routes.indexOf('/documents/plan-continuite-activites-pca'));
  assert.equal(isLegacyFooterVisible('/documents/plan-continuite-activites-pca'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the business-continuity illustration, decorative, single H1/EditorialHero, image not modified', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-pca-business-continuity.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-pca-business-continuity.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('product boundary: PCA is available in CORO today, PRA remains Phase 2, no automatic BIA/RTO-RPO/ISO-certification claim', () => {
  assert.match(code, /CORO structure la rédaction du PCA/);
  assert.match(code, /Guide disponible · Production CORO prévue en phase 2/);
  assert.doesNotMatch(code, /certifi(é|ée) ISO|garantit la conformité|calcule automatiquement|cartographie automatique/i);
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|intelligence artificielle/);
});

test('normative: no unsupported annual-test claim; ISO 22301 named without inventing CORO certification', () => {
  assert.doesNotMatch(code, /au moins une fois par année|annuelle/i, 'no primary source confirmed a fixed annual-test requirement in ISO 22301');
  assert.match(code, /profil de risque de l’organisation/);
  assert.match(code, /ISO 22301/);
});

test('no dead V1 source links reproduced (BSIF/Canada.ca 404s replaced)', () => {
  assert.doesNotMatch(code, /directives-lignes-directrices\/lignes-directrices\/continuit/);
  assert.doesNotMatch(code, /orientation-gouvernement-canada-gestion-continuite-operationnelle/);
});

test('PCA vs PRA: factual distinction preserved, product boundary stated in both directions', () => {
  const s7 = code.slice(code.indexOf('s7: {'), code.indexOf('s8: {'));
  assert.match(s7, /Maintenir les activités critiques pendant une interruption/);
  assert.match(s7, /Rétablir les systèmes, ressources et opérations après l’interruption/);
  assert.match(s7, /Disponible dans CORO Documents/);
  assert.match(s7, /phase 2/i);
});

test('reciprocal links: /guides, /gestion-documentaire and PRA are linked from the PCA page', () => {
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
  assert.ok(page.includes("localizedHref('/documents/plan-reprise-activites-pra'"));
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('MIG-05D: PCA does not clone PMU or PSI visual signatures', () => {
  assert.doesNotMatch(code, /bigAnchor|'Agir'|psiAnchor|elementsGrid|orgCards|territories\b/);
  assert.doesNotMatch(code, /repère éditorial, pas une séquence réglementaire/, 'PMU lifecycle wording must not appear');
  assert.doesNotMatch(code, /ne forment pas une séquence obligatoire/, 'PSI territories wording must not appear');
});

test('MIG-05D: the five interruption sources are exactly those named in the guide\'s own intro paragraph', () => {
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  const triggersBlock = s3.slice(s3.indexOf('triggers: ['), s3.indexOf('] as const'));
  const titles = [...triggersBlock.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(titles, ['Sinistre', 'Panne informatique', 'Pandémie', 'Perte d’accès aux locaux', 'Défaillance d’un fournisseur clé']);
  assert.match(code, /className=\{styles\.triggers\}/);
});

test('MIG-05D: RTO/RPO presented as a two-term glossary, not a numbered ledger', () => {
  assert.match(code, /className=\{styles\.glossary\}/);
  const s5 = code.slice(code.indexOf('s5: {'), code.indexOf('s6: {'));
  assert.match(s5, /word: 'RTO'/);
  assert.match(s5, /word: 'RPO'/);
});

test('MIG-05D: six PCA content elements preserved exactly', () => {
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const itemsBlock = s4.slice(s4.indexOf('items: ['), s4.indexOf('] as const'));
  const names = [...itemsBlock.matchAll(/\[\s*'([^']+)',/g)].map((m) => m[1]);
  assert.equal(names.length, 6);
  assert.ok(names.some((n) => n.includes('BIA')));
});

test('MIG-05D-B: "CONTINUER" is an editorial anchor, not ISO terminology, and does not clone PSI\'s "PSI"/01-07 composition', () => {
  assert.match(code, /className=\{styles\.continueAnchor\}/);
  assert.match(code, /Continuer<span>Les activités critiques<\/span>/);
  assert.doesNotMatch(code, /elementsGrid|psiAnchor|className=\{styles\.elementsGrid\}/);
});

test('MIG-05D-B: PCA vs PRA is rebuilt as a major two-territory "Continuer" / "Rétablir" comparison, no fake winner, no invented values', () => {
  assert.match(code, /className=\{styles\.duel\}/);
  const s7 = code.slice(code.indexOf('s7: {'), code.indexOf('s8: {'));
  assert.match(s7, /word: 'Continuer'/);
  assert.match(s7, /word: 'Rétablir'/);
  assert.doesNotMatch(s7, /\d+\s*(h|heures|jours|minutes)\b/i, 'no invented RTO/RPO-style values in the comparison');
});

test('MIG-05D-B: sector/applicability claims are precise, not an over-generalized single claim — ISO 22301 certification reframed as voluntary, not a sector', () => {
  const s2 = code.slice(code.indexOf('s2: {'), code.indexOf('s3: {'));
  assert.match(s2, /Des exigences qui dépendent du secteur et du contexte/);
  assert.match(s2, /Institutions financières fédérales/);
  assert.match(s2, /Institutions du gouvernement fédéral/);
  assert.match(s2, /certification est volontaire/i);
  assert.doesNotMatch(code, /Exigé ou fortement recommandé selon le secteur/, 'the over-generalized V1-derived heading must be gone');
});

test('MIG-05D-B: ISO exercise/review/improvement concepts are drawn from the existing ISO clause, no new normative claim, no annual frequency', () => {
  const s6 = code.slice(code.indexOf('s6: {'), code.indexOf('s7: {'));
  for (const c of ['Exercer', 'Réviser', 'Améliorer']) assert.ok(s6.includes(`'${c}'`), c);
  assert.doesNotMatch(s6, /annuelle|au moins une fois par année/i);
});

test('metadata: title/description REWRITE, canonical path unchanged from baseline', () => {
  assert.match(page, /path: '\/documents\/plan-continuite-activites-pca'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-continuite-activites-pca');
});

test('accessibility: single V2Shell, semantic ruled lists', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
  assert.match(code, /className=\{styles\.rows\}/);
});

test('density stays local — shared PageSection/page.module.css primitives are not modified by this pass', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
