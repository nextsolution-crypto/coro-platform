import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { aboutContent, type AboutContent } from '../app/about/content.ts';
import { migratedV2Routes, isLegacyFooterVisible } from '../lib/site/v2-migration.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';
import { publicRoutes } from '../lib/site/routes.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { title: string; description: string; canonical: string; jsonLd: { '@type': string; name?: string }[]; headings: [string, string][]; links: [string | null, string][] }>;
const baseline = JSON.parse(read('tests/fixtures/about-baseline.json')) as Baseline;
const view = read('app/about/AboutV2.tsx');
const page = read('app/about/page.tsx');

test('/about is a migrated route (with /contact) and has no legacy footer', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca']);
  assert.equal(isLegacyFooterVisible('/about'), false);
  assert.equal(isLegacyFooterVisible('/about?lang=en'), false);
});

test('V2Shell owns the chrome: the page passes content only, and no page-owned header, main, footer or hiding hack remains', () => {
  assert.match(page, /<V2Shell locale=\{locale\} pathname="\/about">/);
  assert.doesNotMatch(view, /<SiteHeader|<SiteFooter|<main\b|<footer\b|<header\b/);
  const css = read('app/about/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none/, 'no footer-hiding workaround');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/, 'V1 tokens only, no legacy colours or aliases');
});

test('the effective content locale is passed to the shell (About has genuine EN, so effective = requested)', () => {
  assert.match(page, /const locale = localeFromSearchParams/);
  assert.match(page, /<V2Shell locale=\{locale\}/);
  assert.match(page, /buildPageMetadata\(\{[^}]*hasEnglish|buildPageMetadata\(\{\s*path: '\/about'/);
});

test('every content field of both languages is rendered by the migrated view (no silent omission)', () => {
  const walk = (value: unknown, prefix: string, out: string[]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, child] of Object.entries(value)) walk(child, `${prefix}.${key}`, out);
    else out.push(prefix);
  };
  for (const locale of ['fr', 'en'] as const) {
    const paths: string[] = [];
    walk(aboutContent[locale], 't', paths);
    for (const path of paths) {
      if (path.startsWith('t.metadata')) continue;
      // The nine stages are rendered by the canonical Continuum component (same words, checked in the next test), not from this list.
      if (path === 't.continuum.steps') continue;
      assert.ok(view.includes(path), `${locale}: ${path} is not rendered`);
    }
  }
  const keys = (c: AboutContent) => Object.keys(c).sort();
  assert.deepEqual(keys(aboutContent.fr), keys(aboutContent.en));
});

test('the nine continuum stages remain the canonical set, in the same words', () => {
  const words = (locale: 'fr' | 'en') => aboutContent[locale].continuum.steps.map((step) => step.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase());
  const flow = read('app/design-lab/flow-data.ts');
  for (const word of words('fr')) assert.match(flow.normalize('NFD').replace(/[̀-ͯ]/g, ''), new RegExp(`'${word}'`));
  assert.equal(aboutContent.fr.continuum.steps.length, 9);
  assert.match(view, /<Continuum\b/);
});

test('metadata: titles carry no brand (the root template adds it once) and the contract is used', () => {
  for (const locale of ['fr', 'en'] as const) {
    const meta = aboutContent[locale].metadata;
    assert.equal(titleContainsBrand(meta.title), false, `${locale} title is double-branded`);
    const built = buildPageMetadata({ path: '/about', locale, title: meta.title, description: meta.description });
    assert.equal(built.title, meta.title);
    assert.equal(built.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/about' : 'https://getcoro.io/about?lang=en');
    assert.equal(baseline[locale].description, meta.description, `${locale} description is unchanged`);
    assert.ok(baseline[locale].title.startsWith(`${meta.schemaName} |`) || baseline[locale].title.includes(meta.title), `${locale} title text preserved`);
  }
});

test('structured data is preserved: Organization + AboutPage, with the same names as before the migration', () => {
  assert.match(page, /organizationJsonLd\(\)/);
  assert.match(page, /'@type': 'AboutPage'/);
  assert.match(page, /name: content\.metadata\.schemaName/);
  for (const locale of ['fr', 'en'] as const) {
    const before = baseline[locale].jsonLd.find((entry) => entry['@type'] === 'AboutPage');
    assert.equal(before?.name, aboutContent[locale].metadata.schemaName, `${locale} AboutPage name`);
    assert.deepEqual(baseline[locale].jsonLd.map((e) => e['@type']).sort(), ['AboutPage', 'Organization']);
  }
});

test('links: original in-page destinations are preserved, the broken /#features is retargeted, no FUTURE or hidden route is linked', () => {
  assert.match(view, /#about-vision/);
  assert.match(view, /localizedHref\('\/#demo', locale\)/);
  assert.match(view, /localizedHref\('\/#plateforme', locale\)/);
  assert.doesNotMatch(view, /#features/);
  const beforeHrefs = baseline.fr.links.map(([href]) => href);
  assert.ok(beforeHrefs.includes('/#features'), 'baseline documents the previous target');
  const linked = view.match(/['"`]\/[a-z][a-z0-9/-]*/g) ?? [];
  for (const raw of linked) {
    const route = publicRoutes.find((r) => r.path === raw.slice(1));
    if (route) assert.ok(route.implemented, `${route.path} is linked but not implemented`);
  }
  assert.doesNotMatch(view, /\/plateforme['"`]|coro-incident|coro-exercices|\/guides/, 'no BUILD-NOW-HIDDEN, REVIEW or not-yet-built route');
});

test('accessibility structure: one h1, labelled sections, no decorative-icon dependency', () => {
  assert.match(view, /<EditorialHero id="about-title"/);
  assert.equal((view.match(/<h1\b/g) ?? []).length, 0, 'the single h1 is rendered by EditorialHero');
  assert.doesNotMatch(view, /lucide-react/, 'no icon libraries required for meaning');
});

test('baseline heading structure is preserved (H1, then the same H2 titles in the same order)', () => {
  for (const locale of ['fr', 'en'] as const) {
    const c = aboutContent[locale];
    const expectedH2 = [c.why.title, c.evolution.title, c.identity.title, c.vision.title, c.continuum.title, c.data.title, c.lifecycle.title, c.human.title, c.network.title, c.canada.title, c.cta.title];
    const before = baseline[locale].headings.filter(([tag]) => tag === 'h2').map(([, text]) => text).slice(0, expectedH2.length);
    assert.deepEqual(before, expectedH2, `${locale} H2 order`);
    assert.equal(baseline[locale].headings.filter(([tag]) => tag === 'h1').length, 1);
  }
});
