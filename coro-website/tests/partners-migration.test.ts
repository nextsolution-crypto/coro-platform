import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { description: string; headings: [string, string][]; links: [string | null, string][]; jsonLd: unknown[]; images: unknown[] }>;
const baseline = JSON.parse(read('tests/fixtures/partners-baseline.json')) as Baseline;
const page = read('app/partners/page.tsx');

test('the registry holds exactly /about, /contact and /partners; /partners has no legacy footer', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners']);
  assert.equal(isLegacyFooterVisible('/partners'), false);
  assert.equal(isLegacyFooterVisible('/programme-recommandation'), true);
  assert.equal(isLegacyFooterVisible('/'), true);
});

test('V2Shell owns the chrome: no page-owned header, main or footer, no legacy shell, no hiding hack, V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/partners">/);
  assert.doesNotMatch(page, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|institutional\.module|lucide-react/);
  const css = read('app/partners/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('copy is preserved exactly in both languages (categories, framework wording, CTA labels)', () => {
  for (const s of ['Partenaires CORO', 'Un écosystème qui relie expertise et opérations.', 'À qui s’adresse cet écosystème?', 'Consultants et firmes-conseils', 'Professionnels en sécurité incendie et mesures d’urgence', 'Gestionnaires immobiliers et spécialistes du risque', 'Intégrateurs et fournisseurs de solutions complémentaires', 'Un cadre adapté à chaque collaboration', 'doivent faire l’objet d’une entente écrite', 'Discuter d’une collaboration', 'Voir le programme de recommandation',
    'CORO Partners', 'An ecosystem connecting expertise and operations.', 'Who is this ecosystem for?', 'Consultants and advisory firms', 'Integrators and complementary solution providers', 'A framework suited to each collaboration', 'require a written agreement', 'Discuss a collaboration', 'View the referral program']) assert.ok(page.includes(s), s);
  assert.ok(page.includes(baseline.fr.description) && page.includes(baseline.en.description));
});

test('baseline heading structure is preserved: one h1, the two h2, the four audience h3', () => {
  for (const locale of ['fr', 'en'] as const) {
    const heads = baseline[locale].headings.filter(([tag]) => /h[1-3]/.test(tag)).map(([tag]) => tag);
    assert.deepEqual(heads, ['h1', 'h2', 'h3', 'h3', 'h3', 'h3', 'h2']);
  }
  assert.match(page, /<h3>\{item\}<\/h3>/);
  assert.match(page, /<EditorialHero id="partners-title"/);
});

test('conversation CTA goes to /contact, the referral programme stays a separate link, nothing else competes', () => {
  assert.match(page, /localizedHref\('\/contact', l\)/);
  assert.match(page, /localizedHref\('\/programme-recommandation', l\)/);
  const before = baseline.fr.links.map(([h]) => h);
  assert.ok(before.includes('/contact') && before.includes('/programme-recommandation'));
  assert.equal((page.match(/<Button\b/g) ?? []).length, 2);
});

test('no fabricated partner data: no logo, image, testimonial, customer or partner name, no claim of an existing partnership', () => {
  const code = page.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /<img|next\/image|Image\b|logo|testimonial|témoignage|clients? (?:de|of)/i);
  assert.equal(baseline.fr.images.length, 0);
  assert.doesNotMatch(code, /nos partenaires actuels|our current partners|certified partner|partenaire certifié|trusted by|ils nous font confiance/i);
  assert.match(page, /Desired partner CATEGORIES only/);
});

test('no FUTURE, REVIEW or hidden route is linked', () => {
  assert.doesNotMatch(page, /coro-incident|coro-exercices|\/guides|\/plateforme['"`]/);
  for (const raw of page.match(/'\/[a-z][a-z0-9-]*'/g) ?? []) { const r = publicRoutes.find((x) => x.path === raw.slice(1, -1)); if (r) assert.ok(r.implemented && r.publication !== 'BUILD-NOW-HIDDEN', r.path); }
});

test('title: the document title omits the brand so the root template cannot double it; the on-page label is unchanged', () => {
  assert.match(page, /title: t\.metaTitle/);
  assert.match(page, /metaTitle: 'Partenaires et collaborations'/);
  assert.match(page, /metaTitle: 'Partners and collaborations'/);
  for (const [locale, metaTitle] of [['fr', 'Partenaires et collaborations'], ['en', 'Partners and collaborations']] as const) {
    assert.equal(titleContainsBrand(metaTitle), false, `${locale} metadata title must not contain the brand`);
    const m = buildPageMetadata({ path: '/partners', locale, title: metaTitle, description: 'd' });
    assert.equal(m.title, metaTitle);
  }
  assert.match(page, /label=\{t\.title\}/, 'the hero label keeps its brand-bearing text');
  assert.match(page, /title: 'Partenaires CORO'/);
  assert.match(page, /title: 'CORO Partners'/);
});

test('metadata: contract used, canonical without tracking, no invented structured data', () => {
  assert.match(page, /buildPageMetadata\(\{ path: '\/partners'/);
  for (const [locale, title] of [['fr', 'Partenaires et collaborations'], ['en', 'Partners and collaborations']] as const) {
    const m = buildPageMetadata({ path: '/partners?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/partners' : 'https://getcoro.io/partners?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
    assert.equal(typeof titleContainsBrand(title), 'boolean');
  }
  assert.equal(baseline.fr.jsonLd.length, 0);
  assert.doesNotMatch(page, /ld\+json|JsonLd/);
});

test('EditorialHero is the shared opening of About, Contact and Partners, and keeps its small V1-token API', () => {
  const hero = read('components/page/EditorialHero.tsx');
  assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
  assert.match(hero, /PageSection/);
  for (const file of ['app/about/AboutV2.tsx', 'app/contact/page.tsx', 'app/partners/page.tsx']) assert.match(read(file), /<EditorialHero\b/, file);
  const css = read('components/page/editorial-hero.module.css');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|gradient|box-shadow/);
  // About keeps its compact mobile opening and stacked actions; Contact keeps its standard density and narrower measure.
  assert.match(read('app/about/AboutV2.tsx'), /EditorialHero[^>]*compactTop/);
  assert.match(read('app/contact/page.tsx'), /density="standard" narrow/);
  assert.match(css, /\.hero\[data-compact="true"\]/);
  assert.match(css, /max-width: 30rem/);
});
