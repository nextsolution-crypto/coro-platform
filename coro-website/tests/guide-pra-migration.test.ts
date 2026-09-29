import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-reprise-activites-pra (MIG-05F) — fifth of six document guides migrated to V2. Baseline: tests/fixtures/guide-pra-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-reprise-activites-pra/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-reprise-activites-pra/page.module.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseline = JSON.parse(read('tests/fixtures/guide-pra-baseline.json')) as { fr: { bodyText: string; canonical: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-pra-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 had no searchParams handling — ?lang=en rendered identical French text');
});

test('registry and route: exact PRA path, PUBLISH-NOW, FR only, in the sitemap, registered after PGC, legacy footer gone', () => {
  const r = getRoute('guide-pra');
  assert.equal(r?.path, '/documents/plan-reprise-activites-pra');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-reprise-activites-pra'));
  assert.ok(migratedV2Routes.includes('/documents/plan-reprise-activites-pra'));
  assert.ok(migratedV2Routes.indexOf('/documents/plan-gestion-crise-pgc') < migratedV2Routes.indexOf('/documents/plan-reprise-activites-pra'));
  assert.equal(isLegacyFooterVisible('/documents/plan-reprise-activites-pra'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the disaster-recovery illustration, decorative, single H1/EditorialHero, image not modified', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-pra-disaster-recovery.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-pra-disaster-recovery.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('CRITICAL product boundary: PRA is Phase 2, PCA remains available, no current-production claim', () => {
  assert.doesNotMatch(code, /Le PRA est disponible dans CORO/i);
  assert.doesNotMatch(code, /Générer votre PRA|Produire votre PRA|Structurer votre PRA|Créer mon PRA|Automatiser ma reprise/i);
  assert.match(code, /Production CORO prévue en phase 2/);
  assert.match(code, /Le PRA dans CORO : une capacité prévue en phase 2/);
  assert.match(code, /Disponible dans CORO Documents/, 'PCA remains available — stated on the PCA/PRA comparison');
});

test('no unsupported automation claims (automatic recovery, dependency mapping, RTO/RPO calculation, ISO certification)', () => {
  assert.doesNotMatch(code, /CORO restaure automatiquement|CORO détermine automatiquement|CORO calcule automatiquement|CORO identifie automatiquement|CORO déclenche automatiquement/i);
  assert.doesNotMatch(code, /CORO est certifié ISO/i);
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|intelligence artificielle/);
});

test('no invented RTO/RPO values, backup frequency, retention period, or mandatory annual test frequency', () => {
  assert.doesNotMatch(code, /\d+\s*(minutes|heures|jours)\s*(de délai|maximum|pour|RTO|RPO)/i);
  assert.doesNotMatch(code, /toutes les \d+\s*(heures|jours)/i);
  assert.doesNotMatch(code, /conservées? \d+\s*jours/i);
  assert.doesNotMatch(code, /doit être testé au moins une fois par année|annuellement/i);
});

test('no invented recovery tiers, dependency graph, or mandatory recovery sequence/arrows', () => {
  assert.doesNotMatch(code, /\bP0\b|\bP1\b|\bP2\b|Tier 1|Tier 2|Tier 3|Critique \/ Important \/ Secondaire/i);
  assert.doesNotMatch(code, /→.*→.*→/, 'no chained arrow sequence implying a mandatory technical order');
  assert.match(code, /il n’existe pas d’ordre universel/);
});

test('no unsupported guarantee language ("le PRA garantit", "élimine les interruptions")', () => {
  assert.doesNotMatch(code, /garantit la reprise|élimine les interruptions/i);
});

test('PRA vs PCA: perspective inverted from the PCA page, product boundary stated in both directions, no forced winner', () => {
  const s2 = code.slice(code.indexOf('s2: {'), code.indexOf('s3: {'));
  assert.match(s2, /Maintient les activités critiques pendant l’interruption/);
  assert.match(s2, /Rétablit les systèmes, les ressources et les capacités nécessaires/);
  assert.doesNotMatch(code, /className=\{styles\.duelWord\}|className=\{styles\.duel\}\b/, 'PCA\'s own duel component must not be cloned');
});

test('MIG-05F: PRA does not clone PMU, PSI, PCA or PGC visual signatures', () => {
  assert.doesNotMatch(code, /'Agir'|psiAnchor|elementsGrid|continueAnchor|glossaryQ|decideWord|className=\{styles\.bands\}|className=\{styles\.functions\}/);
  assert.doesNotMatch(code, /repère éditorial, pas une séquence réglementaire/, 'PMU wording must not appear');
  assert.doesNotMatch(code, /ne forment pas une séquence obligatoire/, 'PSI wording must not appear');
  assert.doesNotMatch(code, /liés, pas séquentiels/, 'PGC wording must not appear');
});

test('MIG-05F: "Rétablir" is a solo typographic statement, no adjacent ledger (distinct from PSI/PCA anchor+list pattern)', () => {
  assert.match(code, /className=\{styles\.statement\}/);
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  assert.match(s3, /statement: 'Rétablir'/);
  assert.doesNotMatch(code, /className=\{styles\.domains\}[\s\S]{0,200}styles\.statement/, 'the statement and the domain matrix must be visually and structurally separate sections');
});

test('MIG-05F: recovery domains are exactly the four source-supported categories', () => {
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const domainsBlock = s4.slice(s4.indexOf('domains: ['), s4.indexOf('] as const'));
  const names = [...domainsBlock.matchAll(/\[\s*'([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(names, ['Systèmes', 'Données', 'Ressources', 'Locaux']);
});

test('MIG-05F: navy section is an asymmetric 1-dominant + 2-supporting composition, distinct from every prior guide\'s navy geometry', () => {
  assert.match(code, /className=\{styles\.priorityWrap\}/);
  assert.match(code, /className=\{styles\.priorityMain\}/);
  assert.match(code, /className=\{styles\.supportList\}/);
  const s5 = code.slice(code.indexOf('s5: {'), code.indexOf('s6: {'));
  assert.match(s5, /title: 'Prioriser'/);
  const supportBlock = s5.slice(s5.indexOf('support: ['), s5.indexOf('] as const'));
  const names = [...supportBlock.matchAll(/\[\s*'([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(names, ['Restaurer', 'Valider']);
});

test('RTO/RPO is referenced, not duplicated as a standalone glossary moment — contextual link to PCA instead', () => {
  const s7 = code.slice(code.indexOf('s7: {'), code.indexOf('s8: {'));
  assert.doesNotMatch(s7, /word: 'RTO'|word: 'RPO'/);
  assert.match(page, /localizedHref\('\/documents\/plan-continuite-activites-pca'/);
});

test('crisis/emergency-specific functions are not imported — PRA is not PGC, no invented recovery-team roles', () => {
  assert.doesNotMatch(code, /Direction.{0,20}Communications.{0,20}Juridique|disaster recovery manager|recovery commander|IT recovery lead|business recovery lead|vendor coordinator/i);
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('internal links: /guides required, PCA contextual, CORO Documents link uses current-scope wording only', () => {
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/documents/plan-continuite-activites-pca'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
  assert.match(code, /Voir les documents disponibles aujourd’hui/);
});

test('resources: only strongly relevant PCA/RTO-RPO articles reused, not forced filler', () => {
  const resBlock = code.slice(code.indexOf('res: {'), code.indexOf('faq:'));
  const slugs = [...resBlock.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(slugs, ['pca-vs-pra-difference', 'bia-rto-rpo-priorites-continuite']);
});

test('CTA does not promise current PRA production or automated recovery', () => {
  assert.doesNotMatch(code, /Créer mon PRA|Générer mon PRA|Produire mon PRA|Commencer mon PRA/i);
  assert.match(code, /Le PRA guide le retour/);
});

test('metadata: title/description REWRITE, canonical path unchanged from baseline', () => {
  assert.match(page, /path: '\/documents\/plan-reprise-activites-pra'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-reprise-activites-pra');
});

test('accessibility: single V2Shell', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
});

test('density stays local — shared PageSection/page.module.css primitives are not modified; V1 tokens only, no gradients/shadows', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
