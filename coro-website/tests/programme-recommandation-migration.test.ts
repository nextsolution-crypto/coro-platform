import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { description: string; headings: [string, string][]; links: [string | null, string][]; jsonLd: unknown[]; images: unknown[]; mainText: string }>;
const baseline = JSON.parse(read('tests/fixtures/programme-recommandation-baseline.json')) as Baseline;
const page = read('app/programme-recommandation/page.tsx');
const norm = (s: string) => s.replace(/ /g, ' ');

test('the registry holds exactly the four MIG-01 routes; the referral page has no legacy footer', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc', '/documents/plan-reprise-activites-pra']);
  assert.equal(isLegacyFooterVisible('/programme-recommandation'), false);
  assert.equal(isLegacyFooterVisible('/performance-objectifs'), false); // migrated in MIG-02C
  assert.equal(isLegacyFooterVisible('/'), true);
});

test('V2Shell owns the chrome: no page-owned header, main or footer, no legacy shell, no hiding hack, V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/programme-recommandation">/);
  assert.doesNotMatch(page, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|institutional\.module|lucide-react/);
  const css = read('app/programme-recommandation/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow|animation|@keyframes/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
  assert.match(page, /<EditorialHero id="referral-title"/);
});

test('BUSINESS CONTRACT: the $250 amount and every published condition, step and disclaimer are preserved exactly in both languages', () => {
  const terms = [
    '250\\u00a0$', '$250',
    'Nouveau prospect qui n’est ni client ni engagé dans une démarche commerciale active.', 'Une seule organisation référente par organisation recommandée.', 'Aucune auto-recommandation ou contournement de la tarification.', 'Admissibilité et conversion validées par CORO.', 'Crédit sans valeur monétaire, applicable uniquement aux services CORO admissibles.', 'CORO peut modifier, suspendre ou mettre fin au programme.',
    'A new prospect that is neither a customer nor in an active sales process.', 'Only one referring organization per referred organization.', 'No self-referral or circumvention of pricing.', 'Eligibility and conversion validated by CORO.', 'No cash value; applies only to eligible CORO services.', 'CORO may modify, suspend or end the program.',
    'Depuis Administration → Recommandations, partagez votre lien personnel ou votre code.', 'L’organisation utilise votre lien pour découvrir CORO ou demander une démonstration.', 'Après conversion et validation de l’admissibilité, un crédit de 250 $ est approuvé.',
    'From Administration → Referrals, share your personal link or code.', 'After conversion and eligibility validation, a $250 credit is approved.',
    'Le crédit de 250 $ est soumis aux conditions du programme et à la validation de CORO.', 'The $250 credit is subject to program conditions and CORO validation.',
    'de crédit CORO par recommandation admissible', 'in CORO credit per eligible referral',
    'Votre espace CORO centralise le lien, le code, le statut, les crédits approuvés et appliqués, ainsi que l’historique.',
  ];
  for (const term of terms) assert.ok(page.includes(term), term);
  assert.equal((page.match(/250/g) ?? []).length >= 8, true);
  assert.doesNotMatch(page, /\b(?:300|500|150|100)\s?\$|\$\s?(?:300|500|150|100)\b|CAD|USD|€/, 'no other amount or currency');
  assert.doesNotMatch(page, /48\s?h|24\s?h|days?\b|jours?\b|payout|versement/i, 'no invented timing');
  assert.equal((page.match(/conditions: \[/g) ?? []).length, 2);
  for (const locale of ['fr', 'en'] as const) {
    const before = norm(baseline[locale].mainText);
    for (const s of locale === 'fr' ? ['250 $', 'Nouveau prospect', 'Crédit sans valeur monétaire'] : ['$250', 'A new prospect', 'No cash value']) assert.ok(before.includes(s), `baseline ${locale} ${s}`);
  }
});

test('CTA destinations are preserved: the application login and the demo anchor', () => {
  assert.match(page, /<Button href="https:\/\/app\.getcoro\.io\/login"(?: surface="dark")?>\{t\.login\}<\/Button>/);
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  assert.doesNotMatch(page, /signup|register|inscription/i, 'no invented signup route');
  for (const locale of ['fr', 'en'] as const) {
    const hrefs = baseline[locale].links.map(([h]) => h);
    assert.ok(hrefs.includes('https://app.getcoro.io/login'));
    assert.ok(hrefs.includes(locale === 'fr' ? '/#demo' : '/?lang=en#demo'));
  }
});

test('referral mechanics are untouched: capture stays on the homepage, DemoForm still reads the two cookies, this page sets none', () => {
  assert.doesNotMatch(page, /document\.cookie|coro_referral|localStorage|searchParams\.get\('ref'\)|\bref=/);
  const home = read('app/HomePageClient.tsx');
  assert.match(home, /REFERRAL_COOKIE_CODE = 'coro_referral_code'/);
  assert.match(home, /REFERRAL_COOKIE_FIRST_TOUCH = 'coro_referral_first_touch'/);
  assert.match(home, /\^CR-\[A-HJ-NP-Z2-9\]\{6\}\$/);
  assert.match(home, /REFERRAL_COOKIE_MAX_AGE = 60 \* 60 \* 24 \* 90/);
  const form = read('app/DemoForm.tsx');
  assert.match(form, /getCookie\('coro_referral_code'\)/);
  assert.match(form, /getCookie\('coro_referral_first_touch'\)/);
});

test('metadata: brand-free document titles, amount kept, description and canonical from the hardened contract', () => {
  assert.match(page, /title: t\.metaTitle/);
  for (const [locale, title] of [['fr', 'Programme de recommandation — Recevez 250 $ de crédit'], ['en', 'Referral Program — Receive $250 in credit']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false, `${locale} title must not contain the brand`);
    const m = buildPageMetadata({ path: '/programme-recommandation?ref=CR-ABCDEF', locale, title, description: baseline[locale].description });
    assert.equal(m.title, title);
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/programme-recommandation' : 'https://getcoro.io/programme-recommandation?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
    assert.ok(page.includes(baseline[locale].description), 'description unchanged');
  }
  assert.equal(baseline.fr.jsonLd.length, 0);
  assert.doesNotMatch(page, /ld\+json|JsonLd/);
});

test('heading structure: the h1 comes from EditorialHero; the baseline h2/h3 texts remain', () => {
  for (const locale of ['fr', 'en'] as const) assert.deepEqual(baseline[locale].headings.filter(([t]) => /h[1-3]/.test(t)).map(([t]) => t), ['h1', 'h2', 'h2', 'h3', 'h3', 'h3', 'h2']);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 0);
  assert.equal((page.match(/<h2\b/g) ?? []).length, 1);
  assert.match(page, /layout="steps"/);
  for (const s of ['Partagez', 'Découverte de CORO', 'Validation et crédit', 'Share', 'Discover CORO', 'Validation and credit']) assert.ok(page.includes(s), s);
});

test('amount treatment is typographic: no badge, gradient, glow, coupon or animation', () => {
  const css = read('app/programme-recommandation/page.module.css');
  assert.match(css, /\.amount \{[^}]*font-size: var\(--coro-v1-text-display-l\)/);
  assert.doesNotMatch(css + page, /badge|coupon|confetti|glow|burst|blink|pulse/i);
});

test('no FUTURE, REVIEW or hidden route is linked, and Partners intent is not mixed in', () => {
  assert.doesNotMatch(page, /coro-incident|coro-exercices|\/guides|\/plateforme['"`]/);
  for (const raw of page.match(/'\/[a-z][a-z0-9-]*'/g) ?? []) { const r = publicRoutes.find((x) => x.path === raw.slice(1, -1)); if (r) assert.ok(r.implemented, r.path); }
  assert.doesNotMatch(page, /partenaire|partner/i);
});
