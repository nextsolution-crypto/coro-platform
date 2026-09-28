import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-gestion-crise-pgc (MIG-05E) — fourth of six document guides migrated to V2. Baseline: tests/fixtures/guide-pgc-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-gestion-crise-pgc/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-gestion-crise-pgc/page.module.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseline = JSON.parse(read('tests/fixtures/guide-pgc-baseline.json')) as { fr: { bodyText: string; canonical: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-pgc-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 had no searchParams handling — ?lang=en rendered identical French text');
});

test('registry and route: exact PGC path, PUBLISH-NOW, FR only, in the sitemap, registered after PCA, legacy footer gone', () => {
  const r = getRoute('guide-pgc');
  assert.equal(r?.path, '/documents/plan-gestion-crise-pgc');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-gestion-crise-pgc'));
  assert.ok(migratedV2Routes.includes('/documents/plan-gestion-crise-pgc'));
  assert.ok(migratedV2Routes.indexOf('/documents/plan-continuite-activites-pca') < migratedV2Routes.indexOf('/documents/plan-gestion-crise-pgc'));
  assert.equal(isLegacyFooterVisible('/documents/plan-gestion-crise-pgc'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the crisis-management illustration, decorative, single H1/EditorialHero, image not modified', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-pgc-crisis-management.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-pgc-crisis-management.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('CRITICAL product boundary: PGC is Phase 2, never "disponible dans CORO", never a current-production CTA', () => {
  assert.doesNotMatch(code, /PGC est disponible dans CORO|Le PGC est disponible dans CORO/i);
  assert.doesNotMatch(code, /Générer votre PGC|Produire votre PGC|Structurer votre PGC|Créer mon PGC|Commencer mon PGC/i);
  assert.match(code, /Production CORO prévue en phase 2/);
  assert.match(code, /Le PGC dans CORO : une capacité prévue en phase 2/);
});

test('no unsupported automation claims (auto-detection, auto-escalation, auto-decision, CORO AI deciding)', () => {
  assert.doesNotMatch(code, /activation automatique|escalade automatique|décision automatique/i);
  assert.doesNotMatch(code, /CORO détecte automatiquement|CORO coordonne automatiquement|CORO AI recommande/i);
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|intelligence artificielle/);
});

test('no invented crisis levels, escalation thresholds, response times, or fake mandatory sequence', () => {
  assert.doesNotMatch(code, /crise niveau \d|niveau 1|niveau 2|niveau 3/i);
  assert.doesNotMatch(code, /\d+\s*(minutes|heures)\s*(pour|maximum|de délai)/i);
  assert.match(code, /liés, pas séquentiels/);
});

test('no universal legal requirement for a PGC unless sourced; ISO 22361 presented as guidance, not law', () => {
  assert.doesNotMatch(code, /le PGC est obligatoire pour toutes les organisations/i);
  assert.doesNotMatch(code, /ISO 22361 exige/i);
  assert.match(code, /lignes directrices/);
});

test('no invented ISO clause numbers', () => {
  assert.doesNotMatch(code, /22361:2022,?\s*(article|clause|§)\s*\d/i);
});

test('no unsupported fixed review/exercise frequency (annual claim removed, same family lesson as PMU/PSI/PCA)', () => {
  assert.doesNotMatch(code, /annuellement|12 à 18 mois|au moins une fois l’an/i);
});

test('crisis cell: five named functions preserved exactly, no invented ICS/SCI role, no fake org-chart hierarchy', () => {
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const functionsBlock = s4.slice(s4.indexOf('functions: ['), s4.indexOf('] as const'));
  const names = [...functionsBlock.matchAll(/\[\s*'([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(names, ['Direction', 'Communications', 'Juridique', 'Ressources humaines', 'Opérations']);
  assert.doesNotMatch(code, /incident commander|liaison officer|\bCOS\b|\bPIO\b|logistique.{0,20}finance/i);
  assert.match(code, /Typiquement/);
});

test('MIG-05E: PGC does not clone PMU, PSI or PCA visual signatures', () => {
  assert.doesNotMatch(code, /'Agir'|psiAnchor|elementsGrid|continueAnchor|duelWord|glossaryQ/);
  assert.doesNotMatch(code, /repère éditorial, pas une séquence réglementaire/, 'PMU lifecycle wording must not appear');
  assert.doesNotMatch(code, /ne forment pas une séquence obligatoire/, 'PSI territories wording must not appear');
  assert.doesNotMatch(code, /Continuer.*Rétablir|Rétablir.*Continuer/s, 'PCA duel wording must not appear');
});

test('MIG-05E: "Décider" typographic moment uses qualifiers drawn from the guide\'s own definition, no invented claims', () => {
  assert.match(code, /className=\{styles\.decideWord\}/);
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  const qualifiersBlock = s3.slice(s3.indexOf('qualifiers: ['), s3.indexOf('] as const'));
  const qualifiers = [...qualifiersBlock.matchAll(/'([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(qualifiers, ['Rapidement', 'De façon coordonnée', 'En limitant l’impact sur les opérations et la réputation']);
});

test('MIG-05E: navy strategic composition uses three related bands, not a sequence, and is shaped as full-width bands (not columns)', () => {
  assert.match(code, /className=\{styles\.bands\}/);
  const s5 = code.slice(code.indexOf('s5: {'), code.indexOf('s6: {'));
  const bandsBlock = s5.slice(s5.indexOf('bands: ['), s5.indexOf('] as const'));
  const titles = [...bandsBlock.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(titles, ['Décision', 'Communication', 'Coordination']);
});

test('crisis-vs-emergency distinction is source-supported, no claim that every emergency becomes a crisis', () => {
  const s2 = code.slice(code.indexOf('s2: {'), code.indexOf('s3: {'));
  assert.match(s2, /sécurité physique des personnes/);
  assert.match(s2, /réputation, la viabilité ou la confiance/);
  assert.doesNotMatch(code, /toute urgence devient une crise/i);
});

test('PMU / PGC / PCA relation: contextual taglines only, no forced six-guide hierarchy, no mandatory PMU→PGC→PCA→PRA sequence claim', () => {
  const s8 = code.slice(code.indexOf('s8: {'), code.indexOf('s9: {'));
  assert.match(s8, /code: 'PMU'/);
  assert.match(s8, /code: 'PGC'/);
  assert.match(s8, /code: 'PCA'/);
  assert.doesNotMatch(code, /PMU\s*→\s*PGC\s*→\s*PCA\s*→\s*PRA/);
});

test('communication audiences are source-supported categories only, no mass-notification or Sentinelle Population claim', () => {
  const s6 = code.slice(code.indexOf('s6: {'), code.indexOf('s7: {'));
  for (const a of ['Autorités', 'Médias', 'Employés', 'Parties prenantes']) assert.ok(s6.includes(`'${a}',`), a);
  assert.doesNotMatch(code, /Sentinelle Population|notification de masse|diffusion automatique/i);
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('internal links: /guides required; /gestion-documentaire contextual with current-scope wording, not implying PGC production', () => {
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
  assert.match(code, /Voir les documents disponibles aujourd’hui/);
});

test('resources intentionally omitted — no PMU/PSI/PCA article reused merely to fill space', () => {
  assert.doesNotMatch(code, /res: \{|Pour approfondir/);
});

test('CTA does not promise current PGC production', () => {
  assert.doesNotMatch(code, /Créer mon PGC|Générer mon PGC|Commencer mon PGC/i);
  assert.match(code, /Le PGC relie la décision/);
});

test('metadata: title/description REWRITE, canonical path unchanged from baseline', () => {
  assert.match(page, /path: '\/documents\/plan-gestion-crise-pgc'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-gestion-crise-pgc');
});

test('accessibility: single V2Shell', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
});

test('density stays local — shared PageSection/page.module.css primitives are not modified; V1 tokens only, no gradients/shadows', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
