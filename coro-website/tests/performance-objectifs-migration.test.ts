import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';
import { productContent } from '../lib/site/product-content.ts';
import { faqJsonLd } from '../lib/site/json-ld.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { headings: [string, string][]; links: [string | null, string][]; jsonLd: unknown[]; images: [string, string][]; mainText: string }>;
const baseline = JSON.parse(read('tests/fixtures/performance-objectifs-baseline.json')) as Baseline;
const page = read('app/performance-objectifs/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const p = productContent.performance;

test('the registry ends with /performance-objectifs after the six approved routes; nothing else is migrated', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc']);
  assert.equal(isLegacyFooterVisible('/performance-objectifs'), false);
  for (const legacy of ['/']) assert.equal(isLegacyFooterVisible(legacy), true, legacy);
});

test('V2Shell owns the chrome: no page-owned header, main, footer or legacy shell; V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/performance-objectifs">/);
  assert.doesNotMatch(code, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|ProductPage|ProductCompositions|institutional\.module|lucide-react/);
  const css = read('app/performance-objectifs/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('hero: the exact approved photograph, photographic EditorialHero mode, decorative, cropped away from the fictitious screen', () => {
  const src = '/website-v2/performance/performance-coro-analytics.webp';
  assert.ok(existsSync(join(process.cwd(), 'public', src)));
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes(`src: '${src}'`));
  assert.doesNotMatch(call, /alt:/, 'marketing illustration is decorative (alt="")');
  assert.match(call, /side: 'start'/, 'people on the photographic side, copy over the navy field, screen not in the crop');
  assert.match(page, /<EditorialHero id="performance-title"/);
  assert.equal(page.split(src).length - 1, 1);
});

test('no invented interface: no screenshot, no MediaFrame, no product-proof cartouche; the former illustration is not used', () => {
  assert.doesNotMatch(code, /MediaFrame|screenshot|cartouche|Capture d|Screenshot|coro-performance-objectifs|coro-performance-objectives|next\/image|<img/i);
  assert.equal((baseline.fr.images[0]?.[1] ?? ''), 'Fenêtre analytique CORO Performance', 'baseline documents the illustration that was removed');
});

test('PRODUCT TRUTH: page content comes only from the already published Performance copy', () => {
  for (const locale of ['fr', 'en'] as const) {
    const before = baseline[locale].mainText;
    const c = p[locale];
    for (const s of [c.intro, c.capTitle, ...c.capabilities.flatMap((x, i) => (i === 3 ? [] : [x.title, x.text])), ...c.faq.flatMap((x) => [x.q, x.a]), c.cta]) assert.ok(before.includes(s), `${locale} baseline: ${s.slice(0, 40)}`);
  }
  for (const s of ['p.intro', 'p.flow', 'p.flowTitle', 'p.capabilities', 'p.capTitle', 'p.boundary', 'p.faq', 'p.cta', 'p.connections']) assert.ok(page.includes(s), s);
  // Nothing beyond the published copy: no goals engine, export, alert, trend, projection, real time, automation or AI.
  assert.doesNotMatch(code, /temps réel|real-time|realtime|prévis|forecast|prédict|predict|projection|tendance|trend|exportab|exportation|exporter|alerte|alert|automatique|automatic|recommand|optimis|disponibilit|availability|Outlook|Booking|Planner|\d+\s?% (?:de |of |plus|more|less|faster|moins)|gain de temps|time saved|économ|facturation|billing|revenu|revenue/i);
  assert.doesNotMatch(code, /\bIA\b|\bAI\b/);
});

test('copy preserved: h1, statements, distinction with the CORO Index, in both languages', () => {
  assert.equal(p.fr.title, 'Transformer l’activité en capacité de pilotage.');
  assert.ok(page.includes("'Transformer l’activité', 'en capacité de pilotage.'") && page.includes("'Turn activity', 'into management insight.'"));
  assert.equal(p.en.title, 'Turn activity into management insight.');
  for (const s of ['Performance ≠ Indice CORO', 'Performance ≠ CORO Index', 'Activité · Charge · Budgets · Objectifs', 'Préparation · Capacité face aux événements', 'Activity · Workload · Budgets · Goals', 'Preparedness · Capacity for events', 'Mesurer pour décider. Décider pour progresser.', 'Measure to decide. Decide to progress.', 'Un socle produit relié', 'A connected product foundation', 'Explorer', 'Explore']) assert.ok(page.includes(s), s);
  assert.equal(p.fr.capabilities.length, 4);
  // MIG-02C-B: the goals/KPI sentence and the boundary are reworded; no reference to Network or a future module.
  // MIG-02C-C: card 04 title aligned with its body.
  assert.equal(p.fr.capabilities[3].title, 'Comment les mandats progressent-ils?');
  assert.equal(p.en.capabilities[3].title, 'How are mandates progressing?');
  assert.equal(p.fr.capabilities[3].text, 'Les heures, les budgets et les indicateurs de suivi donnent une lecture commune de l’activité et de la progression des mandats.');
  assert.equal(p.en.capabilities[3].text, 'Hours, budgets and tracking indicators provide a shared view of mandate activity and progress.');
  assert.equal(p.fr.boundary, 'Performance mesure principalement l’activité, la capacité et les objectifs. La Résilience concerne la préparation organisationnelle face aux événements. Les deux lectures restent distinctes.');
  assert.equal(p.en.boundary, 'Performance primarily measures activity, capacity and goals. Resilience addresses organizational preparedness for events. The two readings remain distinct.');
  for (const s of [p.fr.boundary, p.en.boundary, code]) assert.doesNotMatch(s, /Network|KPI|progressivement|progressively/);
});

test('single card cluster, restrained: four management questions, 1px border, V1 surface and radius, no shadow', () => {
  const css = read('app/performance-objectifs/page.module.css');
  assert.match(css, /\.capCards li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/);
  assert.equal((css.match(/\bli \{[^}]*border: 1px solid/g) ?? []).length, 1, 'one card cluster');
  assert.match(page, /<ol className=\{styles\.capCards\} aria-label=\{p\.capTitle\}>/);
});

test('DataToActionFlow is deliberately not used: the published beats (activity, indicators, variances, decision) differ from its four fixed beats and it would need new captions and evidence', () => {
  assert.doesNotMatch(code, /DataToActionFlow/);
  assert.equal(p.fr.flow.length, 4);
  assert.match(page, /<ol className=\{styles\.chain\} aria-label=\{p\.flowTitle\}>/);
});

test('cross-product links: only implemented product pages, demo stays /#demo, no hidden or future route', () => {
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  for (const c of [...p.fr.connections, ...p.en.connections]) if (c.href) assert.ok(publicRoutes.some((r) => r.path === c.href && r.implemented), c.href);
  assert.match(page, /c\.href !== '\/performance-objectifs'/);
  assert.doesNotMatch(code, /\/plateforme['"`]|coro-incident|coro-exercices|\/guides/);
});

test('metadata: brand-free titles, hardened contract, canonical without tracking', () => {
  assert.match(page, /title: copy\[l\]\.metaTitle/);
  for (const [locale, title] of [['fr', 'Performance des mandats, heures et capacité d’équipe'], ['en', 'Mandate performance, hours and team capacity']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false);
    const m = buildPageMetadata({ path: '/performance-objectifs?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/performance-objectifs' : 'https://getcoro.io/performance-objectifs?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.doesNotMatch(code, /SoftwareApplication|Organization|LocalBusiness/);
});

test('FAQ: customer-facing, and the FAQPage JSON-LD equals the visible FAQ exactly from a single source, in both languages', () => {
  for (const locale of ['fr', 'en'] as const) {
    const visible = p[locale].faq;
    assert.equal(visible.length, 2);
    for (const item of visible) assert.doesNotMatch(item.q + item.a, /code actuel|current code|le code|the code/i);
    const ld = faqJsonLd(visible.map((item) => ({ question: item.q, answer: item.a }))) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((item) => [item.q, item.a]), locale);
  }
  assert.ok(page.includes('faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  assert.equal(baseline.fr.jsonLd.length, 0, 'baseline had no structured data; FAQPage is new and mirrors the visible FAQ');
});

test('accessibility structure: one h1 (EditorialHero), labelled sections, native FAQ disclosure, list semantics', () => {
  assert.equal((code.match(/<h1\b/g) ?? []).length, 0);
  for (const id of ['performance-flow-title', 'performance-questions-title', 'performance-divide-title', 'performance-platform-title', 'performance-faq-title']) assert.match(page, new RegExp(`labelledBy="${id}"`), id);
  assert.match(page, /<Accordion\b/);
});
