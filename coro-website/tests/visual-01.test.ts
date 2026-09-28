import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { migratedV2Routes } from '../lib/site/v2-migration.ts';
import { productContent } from '../lib/site/product-content.ts';
import { faqJsonLd } from '../lib/site/json-ld.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const hero = read('components/page/EditorialHero.tsx');
const heroCss = read('components/page/editorial-hero.module.css');
const heroCssCode = heroCss.replace(/\/\*[\s\S]*?\*\//g, '');

const photoPages = [
  ['app/about/AboutV2.tsx', '/website-v2/about/about-coro-team-collaboration.webp', 'end'],
  ['app/contact/page.tsx', '/website-v2/contact/contact-coro-consultation.webp', 'start'],
  ['app/partners/page.tsx', '/website-v2/partners/partners-coro-collaboration.webp', 'end'],
  ['app/programme-recommandation/page.tsx', '/website-v2/referral/referral-coro-conversation.webp', 'end'],
  ['app/gestion-de-projets/page.tsx', '/website-v2/projects/projects-team-coordination.webp', 'start'],
] as const;

test('the photographic hero is an additive mode of EditorialHero: plain mode is untouched and text stays HTML', () => {
  assert.match(hero, /export type HeroPhoto/);
  assert.match(hero, /photo\?: HeroPhoto/);
  assert.match(hero, /if \(photo\) \{/);
  assert.match(hero, /<PageSection tone="white" density=\{density\} labelledBy=\{id\}>/, 'plain mode still renders the white PageSection');
  assert.equal((hero.match(/<h1\b/g) ?? []).length, 1, 'one h1 in both modes');
  assert.match(hero, /alt=\{photo\.alt \?\? ''\}/, 'decorative by default');
  assert.match(hero, /aria-hidden="true"/);
  assert.match(hero, /data-surface="dark"/);
});

test('photographic hero styling: V1 tokens only, gradient confined to the photo edge, no shadow, blur, glow or motion', () => {
  assert.doesNotMatch(heroCssCode, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|box-shadow|blur|glow|@keyframes|animation|transition|parallax|backdrop-filter/);
  assert.match(heroCssCode, /\.photoHero \{[^}]*background: var\(--coro-v1-navy-950\)/);
  assert.match(heroCssCode, /color-mix\(in srgb, var\(--coro-v1-navy-950\)/);
  assert.match(heroCssCode, /\.photoField \{[^}]*inline-size: var\(--cov\)/);
  assert.match(heroCssCode, /data-side="end"\] \.scrim \{ background: linear-gradient\(to right/);
  assert.match(heroCssCode, /data-side="start"\] \.scrim \{ background: linear-gradient\(to left/);
  assert.match(heroCssCode, /object-position: var\(--pos-m\)/);
  assert.match(heroCssCode, /object-position: var\(--pos\)/);
  assert.doesNotMatch(heroCssCode, /border-radius/, 'no rounded container on the hero');
});

test('assets: the five approved photographs exist at their exact committed paths and are used once each, by their own page', () => {
  for (const [file, src, side] of photoPages) {
    assert.ok(existsSync(join(process.cwd(), 'public', src)), `${src} is missing`);
    const source = read(file);
    assert.ok(source.includes(`src: '${src}'`), `${file} uses ${src}`);
    assert.ok(source.includes(`side: '${side}'`), `${file} photo side`);
    assert.match(source, /position: '[^']+', mobilePosition: '[^']+'/, `${file} controls its crop on wide and narrow screens`);
  }
  const all = photoPages.map(([file]) => read(file)).join('\n');
  for (const [, src] of photoPages) assert.equal((all.match(new RegExp(src.replace(/[.]/g, '\\.'), 'g')) ?? []).length, 1, src);
});

test('alt classification: the marketing illustrations are decorative (no alt passed), so no generated text or UI is described as product truth', () => {
  for (const [file] of photoPages) {
    const source = read(file);
    const call = source.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
    assert.ok(call, `${file} passes a photo`);
    assert.doesNotMatch(call, /alt:/, `${file}: the hero photo is decorative`);
  }
  assert.doesNotMatch(read('components/page/EditorialHero.tsx'), /"CORO|Tour Prémont|Des gens|Bâtir/, 'no baked-in text is copied into the page');
});

test('generated imagery is not product evidence: only the approved screenshots carry product-proof cartouches', () => {
  for (const [file] of photoPages) assert.doesNotMatch(read(file), /Capture réelle|Real screenshot|real customer|actual interface|interface réelle/i, file);
  assert.match(read('app/gestion-de-projets/page.tsx'), /src="\/screenshot-dashboard\.jpg"/);
  assert.match(read('app/gestion-documentaire/page.tsx'), /src="\/screenshot-editor\.jpg"/);
  assert.doesNotMatch(read('app/gestion-de-projets/page.tsx') + read('app/gestion-documentaire/page.tsx'), /projects-team-coordination[^\n]*(?:MediaFrame|cartouche)/);
});

test('Documents keeps its own technical hero and its availability rules', () => {
  const docs = read('app/gestion-documentaire/page.tsx');
  assert.match(docs, /<HeroTechnical/);
  assert.doesNotMatch(docs, /photo=\{\{|EditorialHero/);
  assert.match(read('app/gestion-documentaire/page.module.css'), /\.docs li\[data-available="false"\] \{ border-style: dashed/);
  assert.match(docs, /\['PGC', 'Plan de gestion de crise', '\/documents\/plan-gestion-crise-pgc', false\]/);
  assert.match(docs, /\['PMU', 'Plan de mesures d’urgence', '\/documents\/plan-mesures-urgence-pmu', true\]/);
});

test('cards are selective: at most one card cluster per page, restrained (1px border, V1 surface and radius, no shadow)', () => {
  const clusters = [
    ['app/partners/page.module.css', /\.cards li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/],
    ['app/gestion-de-projets/page.module.css', /\.capCards li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/],
    ['app/gestion-documentaire/page.module.css', /\.docs li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/],
  ] as const;
  for (const [file, re] of clusters) {
    const css = read(file);
    assert.match(css, re, file);
    assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /box-shadow|gradient|backdrop-filter|border-radius: var\(--coro-v1-radius-(?:md|lg|xl)\)|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/, file);
  }
  assert.equal((read('app/gestion-de-projets/page.module.css').match(/\bli \{[^}]*border: 1px solid/g) ?? []).length, 1, 'Projects has one card cluster');
});

test('Projects FAQ: customer-facing answer, no internal audit language, and the FAQPage JSON-LD is word-for-word the visible FAQ', () => {
  const fr = productContent.projects.fr.faq[1];
  const en = productContent.projects.en.faq[1];
  assert.equal(fr.a, 'Oui. CORO Projects comprend les tâches, les activités et les feuilles de temps associées aux mandats.');
  assert.equal(en.a, 'Yes. CORO Projects includes tasks, activities and timesheets linked to mandates.');
  for (const locale of ['fr', 'en'] as const) {
    for (const item of productContent.projects[locale].faq) assert.doesNotMatch(item.a + item.q, /code actuel|current code|le code|the code/i);
    const visible = productContent.projects[locale].faq;
    const ld = faqJsonLd(visible.map((item) => ({ question: item.q, answer: item.a }))) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((item) => [item.q, item.a]), locale);
  }
  const page = read('app/gestion-de-projets/page.tsx');
  assert.ok(page.includes('faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
});

test('no product-truth expansion: the Projects boundary and Booking/Planner limits are unchanged', () => {
  // MIG-02E reworded the Projects boundary (no Network, no meta-statement); tests/mig-02e-copy.test.ts guards it.
  assert.equal(productContent.projects.fr.boundary, 'Planning et Booking sont intégrés à la gestion opérationnelle des mandats.');
  const page = read('app/gestion-de-projets/page.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(page, /temps réel|real-time|conflit|conflict|multi-conseiller|Outlook/i);
  assert.match(productContent.documents.fr.boundary, /PMU, PSI et PCA sont disponibles/);
});

test('registry, metadata and routes are unchanged by the visual enrichment', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc', '/documents/plan-reprise-activites-pra', '/documents/plan-urgence-environnementale-pue', '/privacy', '/terms']);
  assert.ok(read('app/gestion-documentaire/page.tsx').includes("metaTitle: 'Gestion documentaire des plans d’urgence et de continuité'"));
  assert.ok(read('app/gestion-de-projets/page.tsx').includes("metaTitle: 'Gestion de projets et de mandats en mesures d’urgence'"));
  assert.ok(read('app/partners/page.tsx').includes("metaTitle: 'Partenaires et collaborations'"));
  assert.ok(read('app/programme-recommandation/page.tsx').includes("metaTitle: 'Programme de recommandation — Recevez 250 $ de crédit'"));
  assert.ok(read('app/about/content.ts').includes("title: 'Conformité opérationnelle et résilience organisationnelle'"));
  for (const [file] of photoPages) assert.doesNotMatch(read(file), /\/guides|\/plateforme['"`]|coro-incident|coro-exercices/, file);
});

test('the amount stays a typographic moment and the referral contract is untouched', () => {
  const page = read('app/programme-recommandation/page.tsx');
  assert.match(read('app/programme-recommandation/page.module.css'), /\.amount \{[^}]*font-size: var\(--coro-v1-text-display-l\)/);
  assert.match(page, /'250\\u00a0\$'/);
  assert.doesNotMatch(page, /document\.cookie|coro_referral|localStorage/);
  assert.match(page, /<Button href="https:\/\/app\.getcoro\.io\/login" surface="dark">/);
});
