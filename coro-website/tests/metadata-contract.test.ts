import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAvailableLocale, switchLocaleHref } from '../lib/site/locale.ts';
import { buildPageMetadata, contentPath, titleContainsBrand } from '../lib/site/seo.ts';

const base = { path: '/documents/plan-mesures-urgence-pmu', title: 'Plan de mesures d’urgence', description: 'Guide.' };
const PMU = 'https://getcoro.io/documents/plan-mesures-urgence-pmu';
type Social = { url?: string; locale?: string; alternateLocale?: string[]; type?: string; images?: unknown[] };
const og = (m: ReturnType<typeof buildPageMetadata>) => m.openGraph as Social;
const tw = (m: ReturnType<typeof buildPageMetadata>) => m.twitter as Social & { card?: string };

test('the available locale falls back to French when no genuine English version exists', () => {
  assert.equal(resolveAvailableLocale('fr', true), 'fr');
  assert.equal(resolveAvailableLocale('en', true), 'en');
  assert.equal(resolveAvailableLocale('en', false), 'fr');
  assert.equal(resolveAvailableLocale('fr', false), 'fr');
});

test('FR-only route requested in French: FR canonical, FR + x-default only', () => {
  const m = buildPageMetadata({ ...base, locale: 'fr', hasEnglish: false });
  assert.equal(m.alternates?.canonical, PMU);
  assert.deepEqual(m.alternates?.languages, { 'fr-CA': PMU, 'x-default': PMU });
});

test('FR-only route requested with ?lang=en never gets an English canonical, hreflang or Open Graph locale', () => {
  const m = buildPageMetadata({ ...base, locale: 'en', hasEnglish: false });
  assert.equal(m.alternates?.canonical, PMU);
  assert.ok(!('en-CA' in (m.alternates?.languages ?? {})));
  assert.equal(og(m).url, PMU);
  assert.equal(og(m).locale, 'fr_CA');
  assert.equal(og(m).alternateLocale, undefined);
});

test('FR+EN route requested in French: FR canonical, FR / EN / x-default', () => {
  const m = buildPageMetadata({ path: '/about', locale: 'fr', title: 'À propos', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/about');
  assert.deepEqual(m.alternates?.languages, { 'fr-CA': 'https://getcoro.io/about', 'en-CA': 'https://getcoro.io/about?lang=en', 'x-default': 'https://getcoro.io/about' });
  assert.equal(og(m).locale, 'fr_CA');
  assert.deepEqual(og(m).alternateLocale, ['en_CA']);
});

test('FR+EN route requested in English: self-referencing ?lang=en canonical, same alternates', () => {
  const m = buildPageMetadata({ path: '/about', locale: 'en', title: 'About', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/about?lang=en');
  assert.deepEqual(m.alternates?.languages, { 'fr-CA': 'https://getcoro.io/about', 'en-CA': 'https://getcoro.io/about?lang=en', 'x-default': 'https://getcoro.io/about' });
  assert.equal(og(m).url, 'https://getcoro.io/about?lang=en');
  assert.equal(og(m).locale, 'en_CA');
  assert.deepEqual(og(m).alternateLocale, ['fr_CA']);
});

test('tracking and irrelevant query parameters and hashes never enter canonical or alternates', () => {
  assert.equal(contentPath('/about?ref=CR-ABCDEF&utm_source=x#top'), '/about');
  assert.equal(contentPath('/blog/'), '/blog');
  assert.equal(contentPath('/'), '/');
  const m = buildPageMetadata({ path: '/about?ref=CR-ABCDEF&category=x#top', locale: 'en', title: 'About', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/about?lang=en');
  assert.equal(m.alternates?.languages?.['fr-CA'], 'https://getcoro.io/about');
});

test('title contract: brand-free titles use the root template, branded titles must be absolute', () => {
  assert.equal(buildPageMetadata({ path: '/about', locale: 'fr', title: 'À propos', description: 'd' }).title, 'À propos');
  assert.deepEqual(buildPageMetadata({ path: '/about', locale: 'fr', title: 'CORO · Résilience', description: 'd', absoluteTitle: true }).title, { absolute: 'CORO · Résilience' });
  assert.equal(titleContainsBrand('À propos'), false);
  assert.equal(titleContainsBrand('CORO · Résilience'), true);
});

test('social metadata: the default image is the fallback, alt and Open Graph type are opt-in, Twitter mirrors the image', () => {
  const plain = buildPageMetadata({ path: '/about', locale: 'fr', title: 'À propos', description: 'd' });
  assert.equal(og(plain).type, 'website');
  assert.deepEqual(og(plain).images, ['/og-coro.jpg']);
  assert.deepEqual(tw(plain).images, ['/og-coro.jpg']);
  const rich = buildPageMetadata({ path: '/blog/x', locale: 'fr', title: 'Article', description: 'd', ogType: 'article', imageAlt: 'Couverture' });
  assert.equal(og(rich).type, 'article');
  assert.deepEqual(og(rich).images, [{ url: '/og-coro.jpg', alt: 'Couverture' }]);
  assert.deepEqual(tw(rich).images, [{ url: '/og-coro.jpg', alt: 'Couverture' }]);
  assert.equal(tw(rich).card, 'summary_large_image');
});

test('robots follows indexability and the locale switch keeps the URL model', () => {
  assert.deepEqual(buildPageMetadata({ path: '/x', locale: 'fr', title: 't', description: 'd', indexable: false }).robots, { index: false, follow: false });
  assert.equal(switchLocaleHref('/about', 'fr'), '/about?lang=en');
  assert.equal(switchLocaleHref('/about?lang=en', 'en'), '/about');
});

test('a migrated page passes its resolved content locale to V2Shell', () => {
  assert.equal(resolveAvailableLocale('en', false), 'fr', 'FR-only content is rendered in French, so the shell must receive fr');
});
