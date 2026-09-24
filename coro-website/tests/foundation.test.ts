import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { publicApiUrl, serverApiUrl } from '../lib/site/api.ts';
import { localizedHref, localeFromSearchParams, normalizeLocale, switchLocaleHref } from '../lib/site/locale.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';
import { historicalRoutes, publicRoutes, staticSitemapRoutes } from '../lib/site/routes.ts';
import { absoluteUrl, buildPageMetadata, languageAlternates } from '../lib/site/seo.ts';
import { registeredSitemapUrls } from '../lib/site/sitemap.ts';
import { productStatusLabel } from '../lib/site/status.ts';

const protectedPaths = [
  '/', '/about', '/security', '/privacy', '/terms', '/pricing', '/sentinelle', '/sentinelle-population',
  '/gestion-documentaire', '/gestion-de-projets', '/resilience-operationnelle', '/performance-objectifs',
  '/portail-client', '/programme-recommandation', '/contact', '/partners', '/blog',
  '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi',
  '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc',
  '/documents/plan-reprise-activites-pra', '/documents/plan-urgence-environnementale-pue',
];

test('the protected historical URL contract is complete and unchanged', () => {
  assert.deepEqual(historicalRoutes.map((route) => route.path).sort(), protectedPaths.sort());
  assert.ok(publicRoutes.some((route) => route.path === '/blog/[slug]' && route.kind === 'dynamic'));
});

test('registered URLs and ids are unique', () => {
  assert.equal(new Set(publicRoutes.map((route) => route.path)).size, publicRoutes.length);
  assert.equal(new Set(publicRoutes.map((route) => route.id)).size, publicRoutes.length);
});

test('every historical static route still has a source page', () => {
  for (const route of historicalRoutes) {
    assert.ok(route.source, `${route.path} has no source`);
    assert.ok(existsSync(resolve(route.source!)), `${route.path} source is missing`);
  }
});

test('all sitemap routes are indexable and have their declared locale variants', () => {
  const urls = registeredSitemapUrls(publicRoutes);
  for (const route of staticSitemapRoutes) {
    assert.equal(route.indexable, true, `${route.path} is non-indexable but in sitemap`);
    assert.ok(urls.some((entry) => entry.routeId === route.id && entry.locale === 'fr'));
    assert.equal(urls.some((entry) => entry.routeId === route.id && entry.locale === 'en'), route.en);
  }
});

test('the current sitemap source contains every registered historical path', () => {
  const source = readFileSync(resolve('app/sitemap.ts'), 'utf8');
  for (const route of staticSitemapRoutes) {
    if (route.path === '/') continue;
    assert.ok(source.includes(route.path), `${route.path} is absent from app/sitemap.ts`);
  }
});

test('locale helpers preserve paths, queries and fragments', () => {
  assert.equal(normalizeLocale('en'), 'en'); assert.equal(normalizeLocale('de'), 'fr');
  assert.equal(localeFromSearchParams(new URLSearchParams('lang=en')), 'en');
  assert.equal(localizedHref('/blog?category=risques#top', 'en'), '/blog?category=risques&lang=en#top');
  assert.equal(localizedHref('/blog?lang=en#top', 'fr'), '/blog#top');
  assert.equal(switchLocaleHref('/pricing?lang=en', 'en'), '/pricing');
});

test('SEO helpers create canonical and hreflang without changing the URL model', () => {
  assert.equal(absoluteUrl('/pricing', 'en'), 'https://getcoro.io/pricing?lang=en');
  const alternates = languageAlternates('/pricing');
  assert.equal(alternates.languages['x-default'], 'https://getcoro.io/pricing');
  const metadata = buildPageMetadata({ path: '/pricing', locale: 'en', title: 'Pricing', description: 'Pricing description' });
  assert.equal(metadata.alternates?.canonical, 'https://getcoro.io/pricing?lang=en');
});

test('status labels are bilingual and do not expose an unvalidated public status', () => {
  assert.equal(productStatusLabel('available', 'fr'), 'Disponible');
  assert.equal(productStatusLabel('coming-soon', 'en'), 'Coming soon');
});

test('navigation exposes implemented destinations only', () => {
  for (const locale of ['fr', 'en'] as const) {
    for (const group of visibleNavigation(locale)) {
      for (const item of group.items) {
        assert.ok(item.href?.startsWith('/'));
        const basePath = item.href!.split('?')[0];
        assert.ok(publicRoutes.some((route) => route.implemented && route.path === basePath));
      }
    }
  }
  assert.ok(!visibleNavigation('fr').flatMap((group) => group.items).some((item) => item.id === 'knowledge'));
});

test('API URL helpers never duplicate the api segment', () => {
  const previousPublic = process.env.NEXT_PUBLIC_API_URL; const previousInternal = process.env.INTERNAL_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.getcoro.io/api/'; process.env.INTERNAL_API_URL = 'http://backend:3002/api';
  assert.equal(publicApiUrl('/chat/vitrine'), 'https://api.getcoro.io/api/chat/vitrine');
  assert.equal(serverApiUrl('blog/public'), 'http://backend:3002/api/blog/public');
  if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = previousPublic;
  if (previousInternal === undefined) delete process.env.INTERNAL_API_URL; else process.env.INTERNAL_API_URL = previousInternal;
});
