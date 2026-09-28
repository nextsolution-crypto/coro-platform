import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';
import { productContent } from '../lib/site/product-content.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { headings: [string, string][]; links: [string | null, string][]; jsonLd: unknown[]; images: string[]; mainText: string }>;
const baseline = JSON.parse(read('tests/fixtures/gestion-de-projets-baseline.json')) as Baseline;
const page = read('app/gestion-de-projets/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('the registry adds only /gestion-de-projets to the five approved routes; the other product pages stay legacy', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu']);
  assert.equal(isLegacyFooterVisible('/gestion-de-projets'), false);
  for (const legacy of ['/']) assert.equal(isLegacyFooterVisible(legacy), true, legacy);
});

test('V2Shell owns the chrome: no page-owned header, main, footer or legacy shell; V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/gestion-de-projets">/);
  assert.doesNotMatch(code, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|ProductPage|ProductCompositions|institutional\.module|lucide-react/);
  const css = read('app/gestion-de-projets/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('the page has its own silhouette: EditorialHero and a dominant real dashboard, not the Documents technical hero', () => {
  assert.match(page, /<EditorialHero id="projects-title"/);
  assert.doesNotMatch(code, /HeroTechnical|building-blueprint|building-cutaway|document-blueprint-desk/);
  assert.match(page, /src="\/screenshot-dashboard\.jpg"/);
  assert.ok(existsSync(join(process.cwd(), 'public/screenshot-dashboard.jpg')));
});

test('PRODUCT TRUTH: only the already published Projects claims are used; no Booking/Planner feature is added', () => {
  const p = productContent.projects;
  for (const locale of ['fr', 'en'] as const) {
    const before = baseline[locale].mainText;
    for (const s of [p[locale].intro, p[locale].capabilities[1].text]) assert.ok(before.includes(s), `baseline ${locale}: ${s.slice(0, 40)}`);
  }
  for (const s of ['p.intro', 'p.flowTitle', 'p.capTitle', 'p.capabilities', 'p.boundaryTitle', 'p.boundary', 'p.faq', 'p.cta', 'p.connections']) assert.ok(page.includes(s), s);
  // Rejected or unverified claims stay out (only an outlookEventId field exists in the backend; no synchronisation).
  assert.doesNotMatch(code, /temps réel|real-time|realtime|synchronis(?!ation Outlook bidirectionnelle)|Outlook|conflit|conflict|disponibilit|availability|notification|multi-conseiller|multi-advis|capacit(?:y|é) (?:intelligen|planning)|automatique|automatic|\d+\s?% (?:de |of |plus|more|less|faster|moins)|gain de temps|time saved|économ/i);
  assert.doesNotMatch(code, /\bIA\b|\bAI\b/, 'no AI claim (case-sensitive: "aria-label" is not one)');
  // MIG-02E: the boundary states only the current product; no negative meta-statement, no future concept (see tests/mig-02e-copy.test.ts).
  assert.equal(p.fr.boundary, 'Planning et Booking sont intégrés à la gestion opérationnelle des mandats.');
  assert.equal(p.en.boundary, 'Planning and Booking belong to mandate operations.');
});

test('copy preserved: title, steps, capabilities, boundary, FAQ, closing statement and CTA in both languages', () => {
  assert.equal(productContent.projects.fr.title, ['Piloter les mandats,', 'les activités et les ressources.'].join(' '));
  assert.ok(page.includes("'Piloter les mandats,', 'les activités et les ressources.'") && page.includes("'Manage mandates,', 'activities and resources.'"));
  for (const s of ['Mandat', 'Activités', 'Équipe', 'Planning', 'Booking', 'Tâches', 'Heures', 'Livrables', 'Mandate', 'Team', 'Tasks', 'Hours', 'Deliverables', 'Du besoin au travail réalisé.', 'From need to completed work.', 'Planning et Booking appartiennent au mandat.', 'Planning and Booking belong to the mandate.', 'Client + Bâtiment + Besoin', 'Client + Building + Need']) assert.ok(page.includes(s), s);
  assert.equal(productContent.projects.fr.capabilities.length, 4);
});

test('proof: factual cartouche and alt, no "real" claim, publication blocker recorded, legend duplicates the visible screen labels', () => {
  assert.doesNotMatch(code, /Capture réelle|Real screenshot|real customer|clients? réels?/i);
  assert.match(page, /'CORO Projects · Tableau de bord'/);
  assert.match(page, /'CORO Projects · Dashboard'/);
  assert.match(page, /role="region" tabIndex=\{0\} aria-label=\{t\.panLabel\}/);
  for (const s of ['Actions requises', 'Délais de livraison', 'Activités des 30 prochains jours', 'Projets récents et progression', 'Required actions', 'Delivery deadlines', 'Recent projects and progress']) assert.ok(page.includes(s), s);
  assert.doesNotMatch(code, /coro-gestion-projets\.webp|coro-project-management\.webp/, 'the generic illustration (invented figures, labelled "interface") is not used');
  assert.ok(baseline.fr.images[0].includes('Interface CORO Projects'), 'baseline documents the previous mislabelled illustration');
  assert.match(read('app/gestion-de-projets/page.module.css'), /\.pan \{ overflow-x: auto/);
});

test('cross-product links: only implemented product pages, demo stays /#demo, no hidden or future route', () => {
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  for (const c of [...productContent.projects.fr.connections, ...productContent.projects.en.connections]) if (c.href) assert.ok(publicRoutes.some((r) => r.path === c.href && r.implemented), c.href);
  assert.match(page, /c\.href !== '\/gestion-de-projets'/);
  assert.doesNotMatch(code, /\/plateforme['"`]|coro-incident|coro-exercices|\/guides/);
});

test('metadata: brand-free titles, hardened contract, canonical without tracking', () => {
  assert.match(page, /title: copy\[l\]\.metaTitle/);
  for (const [locale, title] of [['fr', 'Gestion de projets et de mandats en mesures d’urgence'], ['en', 'Project and mandate management for emergency preparedness']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false);
    const m = buildPageMetadata({ path: '/gestion-de-projets?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/gestion-de-projets' : 'https://getcoro.io/gestion-de-projets?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.equal(baseline.fr.jsonLd.length, 0);
  assert.doesNotMatch(code, /SoftwareApplication|Organization|LocalBusiness/);
});

test('FAQ JSON-LD equals the visible FAQ exactly, from a single source, in both languages', async () => {
  const { faqJsonLd } = await import('../lib/site/json-ld.ts');
  for (const locale of ['fr', 'en'] as const) {
    const visible = productContent.projects[locale].faq;
    const ld = faqJsonLd(visible.map((item) => ({ question: item.q, answer: item.a }))) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((item) => [item.q, item.a]), locale);
  }
  assert.ok(page.includes('faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
});

test('accessibility structure: one h1 (EditorialHero), labelled sections, native FAQ disclosure, list semantics', () => {
  assert.equal((code.match(/<h1\b/g) ?? []).length, 0);
  for (const id of ['projects-proof-title', 'projects-start-title', 'projects-capabilities-title', 'projects-boundary-title', 'projects-platform-title', 'projects-faq-title']) assert.match(page, new RegExp(`labelledBy="${id}"`), id);
  assert.match(page, /<Accordion\b/);
  assert.match(page, /<ol className=\{styles\.sequence\} aria-label=\{p\.flowTitle\}>/);
});
