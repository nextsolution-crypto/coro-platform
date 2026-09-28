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
const baseline = JSON.parse(read('tests/fixtures/portail-client-baseline.json')) as Baseline;
const page = read('app/portail-client/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const p = productContent.client;

test('the registry ends with /portail-client after the seven approved routes; nothing else is migrated', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc']);
  assert.equal(isLegacyFooterVisible('/portail-client'), false);
  for (const legacy of ['/', '/blog']) assert.equal(isLegacyFooterVisible(legacy), true, legacy);
});

test('V2Shell owns the chrome: no page-owned header, main, footer or legacy shell; V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/portail-client">/);
  assert.doesNotMatch(code, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|ProductPage|ProductCompositions|institutional\.module|lucide-react/);
  const css = read('app/portail-client/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('hero: the exact approved photograph, photographic EditorialHero mode, decorative, framed away from the fictitious screen', () => {
  const src = '/website-v2/client/client-portal-building-portfolio.webp';
  assert.ok(existsSync(join(process.cwd(), 'public', src)));
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes(`src: '${src}'`));
  assert.doesNotMatch(call, /alt:/, 'marketing illustration is decorative (alt="")');
  assert.match(call, /side: 'end'/);
  assert.match(call, /coverage: 42/);
  assert.match(page, /<EditorialHero id="client-title"/);
  assert.equal(page.split(src).length - 1, 1);
});

test('V1 asset preservation: the two screenshots that match the current portal are kept as product proof; the other four are omitted with a reason', () => {
  assert.equal(baseline.fr.images.length, 6, 'baseline documents the six V1 images');
  assert.ok(baseline.fr.images.every(([src]) => /coro-portail-client-/.test(src)));
  for (const kept of ['coro-portail-client-carte.webp', 'coro-portail-client-cycle-documentaire.webp']) {
    assert.ok(existsSync(join(process.cwd(), 'public/images/solutions/portail-client', kept)));
    assert.equal(page.split(`/images/solutions/portail-client/${kept}`).length - 1, 1, kept);
  }
  // Omitted: dashboard (extra stats and a documents panel that no longer exist), buildings (add-building control), activities (add-activity control), advisor workspace (advisor app).
  for (const omitted of ['tableau-de-bord', 'batiments', 'activites', 'espace-conseiller']) {
    assert.doesNotMatch(code, new RegExp(omitted), omitted);
    assert.ok(existsSync(join(process.cwd(), `public/images/solutions/portail-client/coro-portail-client-${omitted}.webp`)), `${omitted} file is left untouched`);
  }
  assert.doesNotMatch(code, /Capture réelle|Real screenshot|next\/image|<img/i);
});

test('screenshots are product proof with factual cartouches, informative alt, a scrollable named region and a text summary', () => {
  assert.equal((page.match(/<MediaFrame kind="technical"/g) ?? []).length, 2);
  assert.match(page, /'CORO Client · Portefeuille', 'Carte des bâtiments', 'Capture d’écran'/);
  assert.match(page, /'CORO Client · Documents', 'Document, signatures et historique', 'Capture d’écran'/);
  assert.match(page, /'CORO Client · Portfolio', 'Building map', 'Screenshot'/);
  assert.equal((page.match(/role="region" tabIndex=\{0\} aria-label=\{t\.panLabel\}/g) ?? []).length, 2);
  assert.equal((page.match(/className=\{styles\.legend\}/g) ?? []).length, 2, 'each screenshot has an adjacent text summary');
  assert.match(page, /\(interface en français\)/);
  assert.match(page, /\(French interface shown\)/);
  assert.match(read('app/portail-client/page.module.css'), /\.pan \{ overflow-x: auto/);
  // The legend labels are the labels visible in the current portal code (map legend and document page).
  const map = read('../coro-client-portal/app/map/page.tsx');
  for (const s of ['À jour', 'En cours', 'Aucun document']) assert.ok(map.includes(s), s);
  const doc = read('../coro-client-portal/app/documents/[id]/page.tsx');
  for (const s of ['Progression', 'Signatures (', 'Historique du document', 'Commentaires (', 'Télécharger PDF (FR)', 'Download PDF (EN)']) assert.ok(doc.includes(s), s);
});

test('PRODUCT TRUTH: the page keeps the published Client copy; only the boundary and one FAQ answer are reworded', () => {
  for (const locale of ['fr', 'en'] as const) {
    const before = baseline[locale].mainText;
    const c = p[locale];
    for (const s of [c.intro, ...c.capabilities.flatMap((x) => [x.text]), ...c.faq.map((x) => x.q), c.faq[0].a]) assert.ok(before.includes(s), `${locale} baseline: ${s.slice(0, 40)}`);
  }
  for (const s of ['p.intro', 'p.flow', 'p.flowTitle', 'p.capabilities', 'p.capTitle', 'p.boundary', 'p.boundaryTitle', 'p.faq', 'p.connections']) assert.ok(page.includes(s), s);
  assert.equal(p.fr.faq[1].a, 'Le portail donne accès aux documents et à leur historique, selon les droits du client.');
  assert.equal(p.en.faq[1].a, 'The portal gives access to documents and their history, according to client permissions.');
  for (const s of [p.fr.faq[1].a, p.en.faq[1].a]) assert.doesNotMatch(s, /actuel|current/i);
});

test('Network is no longer referenced (a concept outside the current product); the boundary says what the client sees', () => {
  assert.equal(p.fr.boundaryTitle, 'Un accès selon les droits accordés');
  assert.equal(p.en.boundaryTitle, 'Access according to granted rights');
  assert.equal(p.fr.boundary, 'CORO Client est l’interface du client pour ses informations et capacités autorisées.');
  assert.equal(p.en.boundary, 'CORO Client is the client interface for authorized information and capabilities.');
  for (const s of [p.fr.boundaryTitle, p.fr.boundary, p.en.boundaryTitle, p.en.boundary, code]) assert.doesNotMatch(s, /Network/);
});

test('SEE vs ACT: consulting is never called managing; acting is limited to verified actions (comment, sign, refuse)', () => {
  assert.match(page, /seeItems: \['Ses bâtiments, sur un tableau de bord et une carte', 'Ses documents, leurs versions et leur historique', 'Les activités visibles et les échanges associés'\]/);
  assert.match(page, /actItems: \['Commenter un document', 'Signer ou refuser un document'\]/);
  assert.match(page, /actItems: \['Comment on a document', 'Sign or refuse a document'\]/);
  assert.doesNotMatch(code, /\b(?:gérer|gère|gérez|manage|manages|manage your)\b/i, 'no "manage" verb for what the client can only see');
  assert.match(page, /aria-labelledby="client-see-label"/);
  assert.match(page, /aria-labelledby="client-act-label"/);
});

test('no unverified claim: no Booking, Outlook, real time, automation, AI, prediction, export, alert or fabricated figure', () => {
  assert.doesNotMatch(code, /réserv|booking|Outlook|temps réel|real-time|realtime|automatique|automatic|prévis|forecast|prédict|predict|exportab|exportation|alerte|alert|notification|multi-site|\bIA\b|\bAI\b|\d+\s?% (?:de |of |plus|more|less|faster|moins)|gain de temps|time saved|économ/i);
  assert.doesNotMatch(code, /code actuel|current code|le code|the code/i);
});

test('CTAs: the commercial action is the demonstration, the existing-user action is the exact CORO Client login, never mixed', () => {
  assert.match(page, /const LOGIN = 'https:\/\/client\.getcoro\.io\/login';/);
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  assert.match(page, /demo: 'Demander une démonstration', access: 'Accéder à CORO Client'/);
  assert.match(page, /demo: 'Request a demonstration', access: 'Access CORO Client'/);
  assert.match(page, /<Button href=\{LOGIN\} variant="ghost" surface="dark" external>\{t\.access\}<\/Button>/);
  assert.match(page, /primary=\{\{ label: t\.demo, href: demo \}\} secondary=\{\{ label: t\.access, href: LOGIN \}\}/);
  assert.ok(baseline.fr.links.some(([href]) => href === 'https://client.getcoro.io/login'), 'the login destination existed in the footer of the baseline');
  assert.doesNotMatch(code, /signup|inscription|register|créer un compte/i, 'no registration route');
});

test('copy preserved: h1, flow, section titles, statement in both languages', () => {
  assert.equal(p.fr.title, 'Une vision claire de vos bâtiments, documents et activités.');
  assert.equal(p.en.title, 'A clear view of your buildings, documents and activities.');
  assert.ok(page.includes("'Une vision claire de vos bâtiments,', 'documents et activités.'") && page.includes("'A clear view of your buildings,', 'documents and activities.'"));
  assert.deepEqual([...p.fr.flow], ['Portefeuille', 'Bâtiment', 'Information', 'Action']);
  assert.equal(p.fr.capabilities.length, 4);
  for (const s of ['Votre organisation. Vos bâtiments. Votre information.', 'Your organization. Your buildings. Your information.', 'Un socle produit relié', 'A connected product foundation', 'Explorer', 'Explore', 'Les équipes travaillent dans CORO; le client voit ce qui lui est destiné dans CORO Client.']) assert.ok(page.includes(s), s);
});

test('single card cluster, restrained: the four client objects, 1px border, V1 surface and radius, inline-start accent, no shadow', () => {
  const css = read('app/portail-client/page.module.css');
  assert.match(css, /\.objects li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/);
  assert.equal((css.match(/\bli \{[^}]*border: 1px solid/g) ?? []).length, 1, 'one card cluster');
  assert.match(page, /<ol className=\{styles\.objects\} aria-label=\{p\.capTitle\}>/);
});

test('cross-product links: Documents, Projects and Performance only; no self-link, no hidden or future route', () => {
  assert.match(page, /c\.href !== '\/portail-client'/);
  const targets = new Set([...p.fr.connections, ...p.en.connections].filter((c) => c.href && c.href !== '/portail-client').map((c) => c.href));
  assert.deepEqual([...targets].sort(), ['/gestion-de-projets', '/gestion-documentaire', '/performance-objectifs']);
  for (const c of [...p.fr.connections, ...p.en.connections]) if (c.href) assert.ok(publicRoutes.some((r) => r.path === c.href && r.implemented), c.href);
  assert.doesNotMatch(code, /\/plateforme['"`]|coro-incident|coro-exercices|\/guides/);
});

test('metadata: brand-free titles, hardened contract, canonical without tracking', () => {
  assert.match(page, /title: copy\[l\]\.metaTitle/);
  for (const [locale, title] of [['fr', 'Portail client : bâtiments, documents et activités'], ['en', 'Client portal: buildings, documents and activities']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false);
    const m = buildPageMetadata({ path: '/portail-client?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/portail-client' : 'https://getcoro.io/portail-client?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.doesNotMatch(code, /SoftwareApplication|Organization|LocalBusiness/);
});

test('FAQ: customer-facing, and the FAQPage JSON-LD equals the visible FAQ exactly from a single source, in both languages', () => {
  for (const locale of ['fr', 'en'] as const) {
    const visible = p[locale].faq;
    assert.equal(visible.length, 2);
    for (const item of visible) assert.doesNotMatch(item.q + item.a, /code actuel|current code|le code|the code|portail actuel|current portal/i);
    const ld = faqJsonLd(visible.map((item) => ({ question: item.q, answer: item.a }))) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((item) => [item.q, item.a]), locale);
  }
  assert.ok(page.includes('faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  assert.equal(baseline.fr.jsonLd.length, 0, 'baseline had no structured data; FAQPage is new and mirrors the visible FAQ');
});

test('accessibility structure: one h1 (EditorialHero), labelled sections, native FAQ disclosure, list semantics', () => {
  assert.equal((code.match(/<h1\b/g) ?? []).length, 0);
  for (const id of ['client-flow-title', 'client-objects-title', 'client-seeact-title', 'client-rights-title', 'client-platform-title', 'client-faq-title']) assert.match(page, new RegExp(`labelledBy="${id}"`), id);
  assert.match(page, /<Accordion\b/);
  assert.match(page, /<ol className=\{styles\.descent\} aria-label=\{p\.flowTitle\}>/);
});

test('MIG-02D-B gate: no public Booking, scheduling or internal wording anywhere in the Client copy, in both languages', () => {
  const client = JSON.stringify(productContent.client);
  assert.doesNotMatch(client, /réserv|booking|reservation|Outlook|temps réel|real-time|conflit|conflict|disponibilité|availability|planificat|scheduling|multi-conseiller|multi-advis|Network/i);
  for (const locale of ['fr', 'en'] as const) for (const item of productContent.client[locale].faq) {
    assert.doesNotMatch(item.q + ' ' + item.a, /code actuel|current code|portail actuel|current portal|API|Prisma|endpoint|route|backend|base de données|database|implémenté|implemented|MVP|phase d/i);
  }
  const src = read('app/portail-client/page.tsx');
  assert.match(src, /RECAPTURE REQUIRED BEFORE GO-LIVE: dashboard, buildings and activities screenshots/);
  assert.match(src, /PUBLICATION-BLOCKER — CLIENT PORTAL SCREENSHOT DATA PROVENANCE/);
});
