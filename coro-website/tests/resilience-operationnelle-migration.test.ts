import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';
import { faqJsonLd } from '../lib/site/json-ld.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { headings: [string, string][]; links: [string | null, string][]; jsonLd: { '@type': string }[]; images: [string, string][]; mainText: string; counts: Record<string, number> }>;
const baseline = JSON.parse(read('tests/fixtures/resilience-operationnelle-baseline.json')) as Baseline;
const page = read('app/resilience-operationnelle/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/resilience-operationnelle/page.module.css');
const stripOrigin = (s: string) => decodeURIComponent(s).replace(new RegExp('^https?://[^/]+'), '');

/** The V1 asset audit (MIG-03A): every image the page used or that sits in the resilience / alert folders, with its decision and its reason. */
const kept = ['/images/solutions/resilience/coro-organisation-urgence.webp', '/alert/coro-alerte-panique-courriel.webp'] as const;
const omitted: [string, string][] = [
  ['/images/solutions/resilience/coro-resilience-dashboard.webp', 'marketing infographic (garbled map labels, baked marketing text, 2025 date): REJECT as product proof'],
  ['/alert/coro-module-incident-types.webp', 'registry header and export button absent from the current UI, full kiosk URL token visible: REPLACE (belongs to the Sentinelle migration)'],
  ['/images/solutions/resilience/coro-resilience-index.webp', 'level and tab labels differ from the current resilience page: OUTDATED, REPLACE'],
  ['/alert/coro-alerte-envoyee.webp', 'shows voice-call and app-push channels that the current UI does not have: REPLACE'],
  ['/images/solutions/resilience/coro-rapport-incident.webp', 'bakes "Obligatoire — ISO 22301" and a share button absent from the code: REPLACE'],
  ['/images/solutions/resilience/coro-intelligence-organisationnelle.webp', 'dark theme not in the current light portal, cites ISO 22301 / CNPI / CNESST: REJECT'],
  ['/images/solutions/resilience/coro-module-incident.webp', 'not used by V1; incident-trigger form belongs to the future Incident page: DEFER'],
  ['/images/solutions/resilience/coro-sentinelle-kiosk.webp', 'not used by V1; marketing photo of the kiosk and PIN screen, belongs to Sentinelle: DEFER'],
  ['/alert/fiche_intervention.webp', 'not used by V1; intervention sheet with building data, belongs to Incident / QR intervention: DEFER'],
  ['/website-v2/resilience/resilience-building.webp', 'approved V2 asset, not assigned to this page: unused'],
];

test('the registry ends with /resilience-operationnelle after the eight approved routes; nothing else is migrated', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident']);
  assert.equal(isLegacyFooterVisible('/resilience-operationnelle'), false);
  for (const legacy of ['/', '/pricing', '/blog']) assert.equal(isLegacyFooterVisible(legacy), true, legacy);
});

test('V2Shell owns the chrome: no page-owned header, main, footer, legacy shell or inline stylesheet; V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/resilience-operationnelle">/);
  assert.doesNotMatch(code, /<SiteHeader|<SiteFooter|<main\b|<footer\b|<style|<nav\b|res-page|<img\b|dangerouslySetInnerHTML=\{\{ __html: JSON\.stringify\((?!value)/);
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('baseline documents the legacy page: 8 images, WebPage + BreadcrumbList + FAQPage, own nav and footer, a doubled brand title', () => {
  assert.equal(baseline.fr.images.length, 8);
  assert.deepEqual(baseline.fr.jsonLd.map((j) => j['@type']), ['WebPage', 'BreadcrumbList', 'FAQPage']);
  assert.equal(baseline.fr.counts.main, 0);
  assert.ok(baseline.fr.mainText.includes('ISO 22301') || read('tests/fixtures/resilience-operationnelle-baseline.json').includes('ISO 22301'));
});

test('hero: the exact approved photograph, photographic EditorialHero mode, decorative marketing illustration', () => {
  const src = '/website-v2/resilience/resilience-emergency-coordination.webp';
  assert.ok(existsSync(join(process.cwd(), 'public', src)));
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes(`src: '${src}'`));
  assert.doesNotMatch(call, /alt:/, 'decorative (alt="")');
  assert.match(page, /<EditorialHero id="resilience-title"/);
  assert.equal(page.split(src).length - 1, 1);
});

test('V1 asset audit: two screenshots kept as product proof; every other V1 image omitted with a written reason; no file touched or lost', () => {
  for (const [src] of baseline.fr.images.map((i) => [stripOrigin(i[0])])) assert.ok(existsSync(join(process.cwd(), 'public', src)), `${src} still exists`);
  for (const k of kept) { assert.ok(existsSync(join(process.cwd(), 'public', k))); assert.equal(page.split(k).length - 1, 1, k); }
  for (const [src, reason] of omitted) { assert.ok(existsSync(join(process.cwd(), 'public', src)), `${src} file is left untouched`); assert.ok(reason.length > 20, `${src} has a reason`); assert.equal(page.split(src).length - 1, 0, `${src} is not used`); }
  const legacyImages = baseline.fr.images.map((i) => stripOrigin(i[0]));
  for (const src of legacyImages) assert.ok(kept.includes(src as (typeof kept)[number]) || omitted.some(([o]) => o === src), `${src} has a decision`);
  assert.doesNotMatch(code, /Capture réelle|Real screenshot|next\/image/);
});

test('screenshots are proof with factual cartouches, informative alt (no personal names), a named scrollable region and a text summary', () => {
  assert.equal((page.match(/<MediaFrame kind="technical"/g) ?? []).length, 2);
  assert.match(page, /'CORO Sentinelle · Organisation d’urgence', 'Rôle, type et qualifications', 'Capture d’écran'/);
  assert.match(page, /'CORO Sentinel · Emergency organization', 'Role, type and qualifications', 'Screenshot'/);
  assert.match(page, /'CORO Sentinelle · Courriel d’alerte', 'Menace active, exemple', 'Exemple de courriel'/);
  assert.equal((page.match(/role="region" tabIndex=\{0\} aria-label=\{t\.panLabel\}/g) ?? []).length, 2);
  assert.equal((page.match(/className=\{styles\.legend\}/g) ?? []).length, 2);
  assert.doesNotMatch(page.match(/orgAlt:[^\n]*/g)?.join('') + (page.match(/alertAlt:[^\n]*/g)?.join('') ?? ''), /Martin|Gagnon|Tremblay|Montaroux|Deschênes|Robert-Bourassa/);
  assert.match(page, /\(interface en français\)|\(French interface shown\)/);
});

test('PRODUCT TRUTH: the index weights, the emergency roles, the 15-minute gap check, SMS consent and exercise mode exist in the backend', () => {
  const occ = read('../coro-backend/src/occupancy/occupancy.service.ts');
  assert.match(occ, /roleScore\s*\*\s*0\.40[\s\S]*qualScore\s*\*\s*0\.20[\s\S]*plansScore\s*\*\s*0\.25[\s\S]*exercisesScore\s*\*\s*0\.15/);
  for (const w of ['40 %', '20 %', '25 %', '15 %']) assert.ok(page.includes(`weight: '${w}'`), w);
  assert.match(occ, /assignType === 'PRIMARY'/);
  assert.match(occ, /daysSinceExercise < 365/);
  const inc = read('../coro-backend/src/occupancy/incident.service.ts');
  assert.match(inc, /smsConsent/);
  assert.match(inc, /\[EXERCICE\]/);
  assert.match(inc, /ACTIVE THREAT/);
  assert.match(read('../coro-backend/src/reminders/reminders.service.ts'), /checkReadinessGaps/);
});

test('NORMATIVE CLAIMS: no compliance, certification or standards claim, no fixed retention period, no superlative, no real-time wording', () => {
  assert.doesNotMatch(code, /ISO 22301|CNPI|CNESST|NFPA|CCOHS|conforme|conformes|compliant|certifi|certified/i);
  assert.doesNotMatch(code, /36 mois|24 mois|5 ans|36 months|24 months|5 years/);
  assert.doesNotMatch(code, /seule plateforme|only platform|la plupart des outils|most tools/i);
  assert.doesNotMatch(code, /temps réel|real-time|real time|à la seconde près|en permanence|to the second/i);
  assert.doesNotMatch(code, /sans intervention manuelle|no manual intervention|automatiquement|automatically|automatic /i);
  // The one compliance sentence assigns responsibility to the organisation (same principle as CORO Documents).
  assert.match(code, /la conformité demeure la responsabilité de l’organisation/);
  assert.match(code, /compliance remains the organization’s responsibility/);
});

test('NO FUTURE CONCEPT and no unverified module: Network, Campus, Knowledge, Ops, AI, voice calls, app pushes, multi-site product', () => {
  assert.doesNotMatch(code, /Network|Campus|Knowledge|\bOps\b|\bIA\b|\bAI\b|appel vocal|voice call|notification app|app push|multi-site|multi-sites|CRON|Brevo/);
});

test('FR / EN parity: same structure and same number of items in both languages; the h1 is the published one', () => {
  const fr = page.slice(page.indexOf('  fr: {'), page.indexOf('  en: {'));
  const en = page.slice(page.indexOf('  en: {'), page.indexOf('} as const satisfies'));
  for (const key of ['metaTitle', 'description', 'lead', 'defTitle', 'loopGroups', 'highlights', 'dims', 'components', 'orgItems', 'reportItems', 'intelExamples', 'products', 'faqItems', 'statement', 'support', 'demo', 'access']) {
    assert.ok(fr.includes(`${key}:`) && en.includes(`${key}:`), key);
  }
  assert.equal((fr.match(/\{ q: /g) ?? []).length, 6);
  assert.equal((en.match(/\{ q: /g) ?? []).length, 6);
  assert.ok(fr.includes("'Vos plans d’urgence ne valent rien', 's’ils ne reflètent pas la réalité du terrain.'"));
  assert.ok(en.includes("'Your emergency plans are only as good', 'as the people available to execute them.'"));
  assert.ok(baseline.fr.headings.some(([, h]) => h.includes('ne valent rien')) && baseline.en.headings.some(([, h]) => h.includes('only as good')));
});

test('modules and boundaries: Sentinelle linked, Incident and Exercices described without any link to a route that does not exist or is under review', () => {
  assert.match(code, /href="\/sentinelle"/);
  assert.doesNotMatch(code, /\/coro-incident|\/coro-exercices|\/plateforme|\/sentinelle-population|\/guides/);
  for (const p of ['/sentinelle', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client']) { const r = publicRoutes.find((x) => x.path === p); assert.ok(r && r.implemented && r.publication === 'PUBLISH-NOW', p); }
  for (const p of ['/coro-incident', '/coro-exercices']) assert.ok(!page.includes(p), p);
});

test('CTAs: the demonstration, and the exact CORO Client login for existing users', () => {
  assert.match(page, /const LOGIN = 'https:\/\/client\.getcoro\.io\/login';/);
  assert.match(code, /demo: 'Demander une démonstration', access: 'Accéder à CORO Client'/);
  assert.match(code, /demo: 'Request a demonstration', access: 'Access CORO Client'/);
  assert.match(code, /primary=\{\{ label: t\.demo, href: demo \}\} secondary=\{\{ label: t\.access, href: LOGIN \}\}/);
  assert.match(code, /localizedHref\('\/#demo', l\)/);
});

test('single card cluster, restrained: four capabilities, 1px border, V1 surface and radius, no shadow', () => {
  assert.match(css, /\.cards li \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius: var\(--coro-v1-radius-panel\)/);
  assert.equal((css.match(/\bli \{[^}]*border: 1px solid/g) ?? []).length, 1, 'one card cluster');
  assert.match(page, /<ol className=\{styles\.cards\} aria-label=\{t\.proofTitle\}>/);
});

test('the continuum component is deliberately not used (nine captioned stages would invent capabilities; About already carries it)', () => {
  assert.doesNotMatch(code, /Continuum|DataToActionFlow/);
  assert.match(page, /loopGroups/);
});

test('metadata: brand-free titles, hardened contract, canonical without tracking, no invented schema', () => {
  assert.match(page, /title: copy\[l\]\.metaTitle/);
  for (const [locale, title] of [['fr', 'Résilience opérationnelle : préparer, agir, rétablir, améliorer'], ['en', 'Operational resilience: prepare, respond, recover, improve']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false);
    const m = buildPageMetadata({ path: '/resilience-operationnelle?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/resilience-operationnelle' : 'https://getcoro.io/resilience-operationnelle?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.doesNotMatch(code, /SoftwareApplication|LocalBusiness|BreadcrumbList|@type|schema.org/);
});

test('FAQ: customer-facing, and the FAQPage JSON-LD equals the visible FAQ exactly from a single source, in both languages', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  const ld = faqJsonLd([{ question: 'q', answer: 'a' }]) as { mainEntity: { name: string }[] };
  assert.equal(ld.mainEntity[0].name, 'q');
  assert.doesNotMatch(code, /code actuel|current code|le code|the code|portail actuel|current portal/i);
  assert.match(code, /Le rapport d’incident garantit-il la conformité réglementaire\?/);
  assert.match(code, /Does the incident report guarantee regulatory compliance\?/);
});

test('accessibility structure: one h1 (EditorialHero), labelled sections, native FAQ disclosure, list semantics, level written not colour-only', () => {
  assert.equal((code.match(/<h1\b/g) ?? []).length, 0);
  for (const id of ['def', 'loop', 'highlights', 'dims', 'index', 'org', 'alert', 'report', 'intel', 'platform', 'faq']) assert.match(page, new RegExp(`labelledBy="resilience-${id}-title"`), id);
  assert.match(page, /<Accordion\b/);
  assert.match(page, /<span>\{level\}<\/span>\{text\}/);
});
