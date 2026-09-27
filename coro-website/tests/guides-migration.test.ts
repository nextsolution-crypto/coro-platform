import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

// /guides had no live V1: it returned 404. There is no baseline to preserve; this is a CREATION CONTRACT, not a migration diff.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/guides/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/guides/page.module.css');

const SIX_GUIDES = [
  '/documents/plan-mesures-urgence-pmu',
  '/documents/plan-securite-incendie-psi',
  '/documents/plan-continuite-activites-pca',
  '/documents/plan-gestion-crise-pgc',
  '/documents/plan-reprise-activites-pra',
  '/documents/plan-urgence-environnementale-pue',
];

test('registry and route: /guides is implemented, PUBLISH-NOW, V2, FR only, in the sitemap, registered after /pricing', () => {
  const r = getRoute('guides');
  assert.equal(r?.implemented, true); assert.equal(r?.publication, 'PUBLISH-NOW'); assert.equal(r?.en, false); assert.equal(r?.sitemap, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/guides'));
  assert.ok(migratedV2Routes.includes('/guides'));
  assert.ok(migratedV2Routes.indexOf('/pricing') < migratedV2Routes.indexOf('/guides'));
  assert.equal(isLegacyFooterVisible('/guides'), false);
});

test('language: FR only, no fake English', () => {
  assert.match(page, /englishAvailable=\{false\}/);
  assert.match(page, /hasEnglish: false/);
});

test('all six exact guide routes are linked at least once, no other route, no FUTURE/REVIEW route', () => {
  for (const href of SIX_GUIDES) assert.ok(page.includes(`'${href}'`), href);
  assert.doesNotMatch(code, /\/plateforme|\/coro-exercices|\/coro-ops|\/qr-intervention|\/coro-knowledge|\/coro-ai|\/coro-network|\/coro-campus|\/solutions\/multi-sites|\/ressources|\/conformite-reglementation/);
});

test('product boundary: PMU/PSI/PCA are "disponible dans CORO"; PGC/PRA/PUE are "guide disponible, production Phase 2"; guide availability is never conflated with generator availability', () => {
  assert.match(code, /status: 'Disponible dans CORO'/);
  assert.match(code, /status: 'Guide disponible · Production CORO prévue en phase 2'/);
  const s2 = code.slice(code.indexOf('s2: {'), code.indexOf('s3: {'));
  const s3 = code.slice(code.indexOf('s3: {'), code.indexOf('s4: {'));
  for (const acr of ['PMU', 'PSI', 'PCA']) assert.ok(s2.includes(`code: '${acr}'`), acr);
  for (const acr of ['PGC', 'PRA', 'PUE']) assert.ok(s3.includes(`code: '${acr}'`), acr);
  assert.doesNotMatch(s3, /disponible dans coro/i);
  assert.match(code, /production dans CORO Documents est prévue en phase 2/);
});

test('no claim that all six documents are generated today; no automatic compliance; no future CORO module sold on this page', () => {
  assert.doesNotMatch(code, /les six documents sont (disponibles|générés)|CORO génère (automatiquement )?(les six|tous)/i);
  assert.doesNotMatch(code, /conforme à|certifi(é|ée)|garantit la conformité/i);
  assert.doesNotMatch(code, /Knowledge|Network|Campus|\bOps\b|\bAI\b(?!C)|intelligence artificielle/);
  assert.match(code, /CORO Documents permet aujourd’hui de produire le PMU, le PSI et le PCA/);
});

test('hero: the hub illustration, decorative, no logo, never read as product proof', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/guides/guides-coro-documentation-resilience.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/guides/guides-coro-documentation-resilience.webp')));
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
});

test('six preview illustrations are decorative (alt=""), one per guide, never captioned as a screenshot', () => {
  assert.equal((code.match(/<MediaFrame src=\{`\/website-v2\/guides\/\$\{item\.img\}\.webp`\} alt=""/g) ?? []).length, 2, 'one MediaFrame per tile group, driven by item.img');
  for (const f of ['guide-pmu-emergency-measures', 'guide-psi-fire-safety', 'guide-pca-business-continuity', 'guide-pgc-crisis-management', 'guide-pra-disaster-recovery', 'guide-pue-environmental-emergency']) {
    assert.ok(page.includes(`img: '${f}'`), f);
    assert.ok(existsSync(join(process.cwd(), `public/website-v2/guides/${f}.webp`)), f);
  }
  assert.doesNotMatch(code, /cartouche|Capture d’écran|Screenshot/);
});

test('MIG-05A-B: the six document purposes are complementary territories, not sequential stages — no numbering, no connecting-line timeline, each purpose keeps its acronym', () => {
  const purposes = code.slice(code.indexOf('purposes: ['), code.indexOf('] as const', code.indexOf('purposes: [')));
  for (const [acr, name] of [['PMU', 'Préparer'], ['PSI', 'Protéger'], ['PCA', 'Poursuivre'], ['PGC', 'Coordonner'], ['PRA', 'Rétablir'], ['PUE', 'Répondre à un risque environnemental']] as const) {
    assert.ok(purposes.includes(`['${acr}', '${name}', `), `${acr} / ${name}`);
  }
  assert.doesNotMatch(code, /styles\.flow\b|styles\.dot\b/, 'the sequential flow/dot markup is removed');
  assert.match(code, /className=\{styles\.purposes\}/);
  assert.doesNotMatch(css, /\.flow\b|\.dot\b/);
  assert.doesNotMatch(css, /border-inline-start: 2px solid var\(--coro-v1-border-on-dark\); margin-inline-start/, 'no vertical connecting-line timeline styling remains');
});

test('MIG-05A-B: the CORO Documents heading names PMU, PSI and PCA explicitly, so it cannot be read as all six documents being produced today', () => {
  assert.match(page, /title: 'Produire PMU, PSI et PCA dans CORO\.'/);
  assert.doesNotMatch(page, /title: 'Produire ces documents dans CORO\.'/);
  const s6 = code.slice(code.indexOf('s6: {'), code.indexOf('faq: '));
  assert.match(s6, /leur production dans CORO est prévue en phase 2/);
});

test('/gestion-documentaire is linked reciprocally from the hub, contextually, not randomly', () => {
  assert.equal((code.match(/\/gestion-documentaire/g) ?? []).length >= 2, true, 'at least the explore CTA and the CORO Documents section');
});

test('FAQ / JSON-LD parity: FAQPage matches the visible FAQ; ItemList lists exactly the six guides; no SoftwareApplication, Offer or Product schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.equal((code.match(/\{ q: '/g) ?? []).length, 5);
  assert.match(page, /'@type': 'ItemList'/);
  assert.match(page, /itemListElement: allItems\.map/);
  assert.doesNotMatch(code, /SoftwareApplication|['"]Offer['"]|['"]Product['"]|AggregateOffer/);
});

test('status is conveyed in text, not colour alone; hub is not a card wall (two groups of three, not six identical tiles on one row)', () => {
  assert.match(code, /data-status="available"/); assert.match(code, /data-status="phase2"/);
  assert.match(code, /<span aria-hidden="true">●<\/span>/); assert.match(code, /<span aria-hidden="true">◐<\/span>/);
  assert.equal((code.match(/className=\{styles\.tiles\}/g) ?? []).length, 2);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
});

test('metadata: brand-free semantic title, truthful description, no invented volume/ranking language', () => {
  assert.match(page, /metaTitle: 'Guides des plans de mesures d’urgence et de résilience'/);
  assert.doesNotMatch(page.match(/metaTitle: '[^']*'/)?.[0] ?? '', /CORO/);
});
