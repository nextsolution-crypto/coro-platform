import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /documents/plan-securite-incendie-psi (MIG-05C) — second of six document guides migrated to V2. Baseline: tests/fixtures/guide-psi-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/documents/plan-securite-incendie-psi/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/documents/plan-securite-incendie-psi/page.module.css');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseline = JSON.parse(read('tests/fixtures/guide-psi-baseline.json')) as { fr: { bodyText: string; canonical: string }; en: { bodyText: string } };

test('baseline fixture exists and confirms ?lang=en was a French fallback (justifies FR-only V2 contract)', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/guide-psi-baseline.json')));
  assert.equal(baseline.fr.bodyText, baseline.en.bodyText, 'V1 had no searchParams handling — ?lang=en rendered identical French text');
});

test('registry and route: exact PSI path, PUBLISH-NOW, FR only, in the sitemap, registered after PMU, legacy footer gone', () => {
  const r = getRoute('guide-psi');
  assert.equal(r?.path, '/documents/plan-securite-incendie-psi');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/documents/plan-securite-incendie-psi'));
  assert.ok(migratedV2Routes.includes('/documents/plan-securite-incendie-psi'));
  assert.ok(migratedV2Routes.indexOf('/documents/plan-mesures-urgence-pmu') < migratedV2Routes.indexOf('/documents/plan-securite-incendie-psi'));
  assert.equal(isLegacyFooterVisible('/documents/plan-securite-incendie-psi'), false);
});

test('language: FR only, no fake English, matching the baseline finding', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('hero: the fire-safety illustration, decorative, single H1/EditorialHero, image not modified', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guide-psi-fire-safety.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guide-psi-fire-safety.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('product boundary: PSI is available in CORO Documents today, no automatic-compliance, fire-code approval or fire-department-approval claim', () => {
  assert.match(code, /CORO Documents structure la production du PSI/);
  assert.doesNotMatch(code, /conforme à|certifi(é|ée)|approuv(é|ée) par le service|garantit la conformité|intégration automatique/i);
  assert.doesNotMatch(code, /Phase 2|phase 2/, 'PSI itself must never be mislabeled as Phase 2 — it is available today');
});

test('regulatory: transition-period note present, no invented sub-article precision, no universal alarm-stage claim', () => {
  assert.match(code, /16 octobre 2026/, 'the 18-month transition period omitted by V1 must be present');
  assert.doesNotMatch(code, /2\.8\.1\.2|2\.8\.2\.7|2\.8\.3\b/, 'unverified precise CNPI sub-article numbers must not be reproduced');
  assert.doesNotMatch(code, /à un seul étage|à deux étages|toujours|dans tous les cas/i, 'no universal single/double-stage alarm claim');
  assert.match(code, /varie selon le bâtiment/);
});

test('MIG-05C-B: no unsupported annual-review claim; revision is stated only as change-triggered', () => {
  assert.doesNotMatch(code, /annuelle|au moins une fois l’an/i, 'no primary source confirmed an annual PSI review requirement or recommendation');
  assert.match(code, /changement significatif affecte le bâtiment/);
});

test('MIG-05C-B: fire-department/municipal authority claim is grounded in named statutes, not an unqualified "vérifier sa conformité"', () => {
  assert.doesNotMatch(code, /vérifier sa conformité/i);
  assert.match(code, /Loi sur la sécurité incendie/);
  assert.match(code, /Loi sur les compétences municipales/);
});

test('MIG-05C-B: "exercices" is no longer part of the signal/action operational group — its content is preserved, relocated to §6', () => {
  const s5 = code.slice(code.indexOf('s5: {'), code.indexOf('s6: {'));
  assert.doesNotMatch(s5, /exercice/i);
  const s6 = code.slice(code.indexOf('s6: {'), code.indexOf('s7: {'));
  assert.match(s6, /programme d’exercices d’évacuation/i);
});

test('no blanket "every organization needs a PSI" claim — regulatory scope is stated only through the specific building categories', () => {
  assert.doesNotMatch(code, /toute organisation doit (en avoir|avoir) un/i);
});

test('reciprocal links: PMU, /guides and /gestion-documentaire are all linked from the PSI page', () => {
  assert.ok(page.includes("localizedHref('/documents/plan-mesures-urgence-pmu'"));
  assert.ok(page.includes("localizedHref('/guides'"));
  assert.ok(page.includes("localizedHref('/gestion-documentaire'"));
});

test('no future/unimplemented CORO module is sold on this page', () => {
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|intelligence artificielle/);
});

test('FAQ / JSON-LD parity; BreadcrumbList present; no orphan SoftwareApplication/Offer/Product/compliance schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 4);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('MIG-05C: PSI does not clone PMU\'s visual signature — no oversized "08" anchor, no "Agir", no preparedness-lifecycle copy', () => {
  assert.doesNotMatch(code, /bigAnchor|styles\.agir\b|'Agir'/);
  assert.doesNotMatch(code, /repère éditorial, pas une séquence réglementaire/, 'that is PMU\'s lifecycle wording, not PSI\'s');
});

test('MIG-05C: PSI content matrix keeps exactly the seven source-supported elements, via the shared FeatureIndex primitive', () => {
  assert.match(code, /<FeatureIndex label=\{t\.s3\.title\} items=\{t\.s3\.items\} layout="rows" \/>/);
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  const itemsBlock = s3.slice(s3.indexOf('items: ['), s3.indexOf('] as const'));
  const items = [...itemsBlock.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(items.length, 7);
});

test('MIG-05C: fire-safety organization roles are restricted to the four stakeholders the source text names — no invented roles', () => {
  const s4 = code.slice(code.indexOf('s4: {'), code.indexOf('s5: {'));
  const roleNames = [...s4.matchAll(/\[\s*'([^']+)',\s*'/g)].map((m) => m[1]);
  assert.deepEqual(roleNames, ['Personnel de surveillance', 'Occupants', 'Service de sécurité incendie', 'Personnes nécessitant une assistance']);
});

test('MIG-05C-B: the navy section holds exactly four related response territories (SIGNAL/AVIS/CONSIGNES/ÉVACUATION), not a connected sequence', () => {
  assert.doesNotMatch(code, /layout="steps"/, 'the rejected steps-rail treatment must be removed');
  assert.match(code, /className=\{styles\.territories\}/);
  const s5 = code.slice(code.indexOf('s5: {'), code.indexOf('s6: {'));
  const territoriesBlock = s5.slice(s5.indexOf('territories: ['), s5.indexOf('] as const'));
  const titles = [...territoriesBlock.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(titles, ['Signal', 'Avis', 'Consignes', 'Évacuation']);
  assert.match(code, /ne forment pas une séquence obligatoire/);
});

test('MIG-05C-B: PSI does not reuse the FeatureIndex "steps" rail from the first composition, and the anchor/matrix are local, not shared-primitive modifications', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow/);
  assert.match(code, /className=\{styles\.psiAnchor\}/);
  assert.match(code, /className=\{styles\.matrix\}/);
});

test('metadata: title/description REWRITE, canonical path unchanged from baseline', () => {
  assert.match(page, /path: '\/documents\/plan-securite-incendie-psi'/);
  assert.equal(baseline.fr.canonical, 'https://getcoro.io/documents/plan-securite-incendie-psi');
});

test('accessibility: single V2Shell, semantic ruled resource list', () => {
  assert.equal((page.match(/<V2Shell/g) ?? []).length, 1);
  assert.match(code, /className=\{styles\.rows\}/);
});

test('density stays local — shared PageSection/page.module.css primitives are not modified by this pass', () => {
  assert.doesNotMatch(cssRules, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});
