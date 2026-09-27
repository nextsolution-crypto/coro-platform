import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata } from '../lib/site/seo.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
type B = Record<'fr' | 'en' | 'ref', { canonical: string; jsonLd: { '@type': string }[]; images: [string, string][]; mainText: string; counts: Record<string, number> }>;
const baseline = JSON.parse(read('tests/fixtures/sentinelle-baseline.json')) as B;
const page = read('app/sentinelle/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/sentinelle/page.module.css');
const strip = (s: string) => decodeURIComponent(s).replace(new RegExp('^https?://[^/]+'), '');

test('registry ends with /sentinelle after the nine approved routes; Population stays legacy', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing']);
  assert.equal(isLegacyFooterVisible('/sentinelle'), false);
  assert.equal(isLegacyFooterVisible('/sentinelle-population'), false); // migrated in MIG-03C
});

test('V2Shell owns the chrome; V1 tokens only; no inline stylesheet, img, lucide or old pricing block', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/sentinelle" englishAvailable=\{false\}>/);
  assert.doesNotMatch(code, /<style|<img\b|<nav\b|<main\b|<footer\b|lucide-react|pricingPlans|149 \$|249 \$/);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('baseline: legacy page had 8 images, SoftwareApplication + FAQPage, and ?lang=en translated only nav and pricing', () => {
  assert.equal(baseline.fr.images.length, 8);
  assert.deepEqual(baseline.fr.jsonLd.map((j) => j['@type']), ['SoftwareApplication', 'FAQPage']);
  assert.equal(baseline.en.canonical, 'https://getcoro.io/sentinelle');
});

test('FR ONLY: hasEnglish false, canonical FR even with ?lang=en, hreflang fr-CA + x-default, fr_CA, no en-CA', () => {
  assert.match(page, /hasEnglish: false/);
  assert.match(page, /resolveAvailableLocale\(localeFromSearchParams\(\(await searchParams\) \?\? \{\}\), false\)/);
  const m = buildPageMetadata({ path: '/sentinelle', locale: 'en', hasEnglish: false, title: 't', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/sentinelle');
  assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'x-default']);
  assert.equal((m.openGraph as { locale?: string }).locale, 'fr_CA');
  assert.equal(publicRoutes.find((r) => r.path === '/sentinelle')?.en, false);
  assert.doesNotMatch(read('lib/site/sitemap.ts') + '', /sentinelle\?lang=en/);
});

test('hero: exact approved photograph, decorative marketing illustration; body photos decorative too', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/sentinel/sentinelle-occupancy-security.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.equal((page.match(/<MediaFrame [^>]*alt=""/g) ?? []).length, 3);
  assert.doesNotMatch(code, /Capture d|screenshot|cartouche/i);
});

test('SEPARATION: only Sentinelle assets; no Population imagery, no Incident intervention imagery, no population capability', () => {
  assert.doesNotMatch(code, /sentinelle-population|population-alert|first-responders|fiche_intervention/);
  assert.doesNotMatch(code, /alerte à la population|population externe|zone d’impact|zones de planification|substances|urgence environnementale|alerte publique|\bE2\b|abri sur place|municipal/i);
  assert.doesNotMatch(code, /\/sentinelle-population|\/coro-incident|\/coro-exercices|\/plateforme/);
});

test('V1 asset audit: the eight V1 images are preserved on disk, none is used as proof (invented UI or outdated), each with a decision', () => {
  const decisions: Record<string, string> = {
    'coro-sentinelle-registre-presence.webp': 'REPLACE hero (baked text and invented UI); kept as og image',
    'coro-sentinelle-qr-code-entree.webp': 'REJECT as proof: generated scene, decorative concept only; DEFER',
    'coro-sentinelle-code-pin.webp': 'REJECT as proof: generated scene; DEFER',
    'coro-sentinelle-registre-temps-reel.webp': 'REPLACE: invented interface, a search field the registry lacks',
    'coro-sentinelle-evacuation.webp': 'REPLACE: invented interface',
    'coro-sentinelle-point-rassemblement.webp': 'REPLACE: invented interface, Confirmer le decompte not verified',
    'coro-sentinelle-personnes-manquantes.webp': 'REPLACE: invented interface',
    'coro-sentinelle-multi-sites.webp': 'REJECT: multi-site view and Ajouter un batiment not in product',
  };
  for (const [f, reason] of Object.entries(decisions)) { assert.ok(existsSync(join(process.cwd(), 'public/images/sentinelle', f)), f); assert.ok(reason.length > 15); }
  const used = baseline.fr.images.map((i) => strip(i[0]));
  assert.equal(used.length, 8);
  for (const u of used) assert.ok(decisions[u.split('/').pop() as string], u);
  assert.equal((page.match(/images\/sentinelle\//g) ?? []).length, 1, 'only the og image path remains');
  for (const f of ['building-lobby', 'evacuation-stairs', 'assembly-point', 'sentinelle-population-alert-territory', 'first-responders-arrival']) assert.ok(existsSync(join(process.cwd(), `public/website-v2/sentinel/${f}.webp`)), f);
});

test('PRODUCT TRUTH: check-in/out, PIN, visitors and contractors, evacuation accounted-for status exist in code', () => {
  const svc = read('../coro-backend/src/occupancy/occupancy.service.ts');
  assert.match(svc, /async checkIn/); assert.match(svc, /async checkOut/);
  assert.match(read('../coro-backend/prisma/schema.prisma'), /enum OccupantType \{\s*EMPLOYE\s*VISITEUR\s*CONTRACTEUR\s*\}/);
  assert.match(read('../coro-backend/prisma/schema.prisma'), /isAccountedFor\s+Boolean/);
  assert.match(read('../coro-client-portal/app/presence/[kioskToken]/page.tsx'), /pin.length >= 4/);
});

test('NO GEOLOCATION and no tracking claim: presence is not location, missing = not yet confirmed', () => {
  for (const f of ['../coro-client-portal/app/presence/[kioskToken]/page.tsx', '../coro-client-portal/app/kiosk/[token]/page.tsx', '../coro-client-portal/app/sentinelle/[buildingId]/evacuation/page.tsx']) assert.doesNotMatch(read(f), /geolocation|watchPosition|getCurrentPosition/);
  assert.match(code, /Sentinelle enregistre les entrées, les sorties et les statuts opérationnels déclarés; le registre d’occupation n’assure pas la géolocalisation continue des personnes./);
  assert.match(code, /englishAvailable={false}/);
  assert.match(read('components/site/SiteHeader.tsx'), /englishAvailable && <LanguageSwitcher/);
  assert.match(code, /N’est ni un contrôle d’accès physique ni un outil de surveillance des employés/);
  assert.doesNotMatch(code, /localiser\?|qui doit maintenant être localisé|localisation précise|GPS/);
});

test('NO unsupported claim: real time, compliance, Loi 25, retention, search, filters, other categories, multi-site view, automation, price', () => {
  assert.doesNotMatch(code, /temps réel|real-time|ISO 22301|CNPI|CNESST|NFPA|CCOHS|conforme|Loi 25|loi 25|12 mois|36 mois|recherche et filtrage|filtrer|Autres occupants|automatique|panneau d’alarme|\bIA\b|Brevo|\d+\s?\$/i);
  assert.doesNotMatch(code, /Entrepreneurs|entrepreneurs/);
});

test('privacy boundary and Incident boundary: Incident only as a linked capability of the register, no promotion', () => {
  assert.match(code, /un incident peut être déclenché/);
  assert.doesNotMatch(code, /premiers répondants|QR intervention|15 types/i);
});

test('CTAs, links and one card cluster', () => {
  assert.match(page, /const LOGIN = 'https:\/\/client\.getcoro\.io\/login';/);
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  for (const p of ['/resilience-operationnelle', '/gestion-documentaire', '/portail-client']) assert.ok(page.includes(`href: '${p}'`), p);
  for (const a of page.match(/slug: '[a-z0-9-]+'/g) ?? []) assert.ok(a.length > 10);
  assert.equal((css.match(/\bli \{[^}]*border: 1px solid var\(--line\)[^}]*border-radius/g) ?? []).length, 1);
});

test('metadata and FAQ: brand-free title, FAQPage only, from the visible source, no SoftwareApplication', () => {
  assert.match(page, /metaTitle: 'Registre d’occupation et décompte des occupants en évacuation'/);
  assert.ok(page.includes('faqJsonLd(copy.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={copy.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  assert.doesNotMatch(code, /SoftwareApplication|BreadcrumbList|Organization/);
  assert.equal((page.match(/\{ q: /g) ?? []).length, 8);
});

test('accessibility: labelled sections, native FAQ, ordered lists', () => {
  for (const id of ['problem', 'principles', 'entry', 'register', 'evac', 'seq', 'assembly', 'boundary', 'uses', 'eco', 'res', 'faq']) assert.match(page, new RegExp(`labelledBy="sentinelle-${id}-title"`), id);
  assert.match(page, /<Accordion\b/);
});
