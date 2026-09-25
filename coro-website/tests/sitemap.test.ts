import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { publicRoutes, staticSitemapRoutes, type PublicRoute } from '../lib/site/routes.ts';
import { migratedV2Routes } from '../lib/site/v2-migration.ts';
import { buildBlogSitemapEntries, buildStaticSitemapEntries, fetchPublishedBlogPosts, type SitemapEntry } from '../lib/site/sitemap.ts';

const lastModified = new Date('2026-08-18');
const entries = buildStaticSitemapEntries(staticSitemapRoutes, lastModified);
const urls = entries.map((entry) => entry.url);
const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
type Baseline = { urls: { url: string; alternates: Record<string, string>; lastModified: string; changeFrequency: string; priority: number }[] };
const baseline = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/sitemap-static-baseline.json'), 'utf8')) as Baseline;

// Intentional corrections against the pre-MIG-00B.3 sitemap (English is not genuinely available on these two routes).
const REMOVED_ON_PURPOSE = ['https://getcoro.io/sentinelle?lang=en', 'https://getcoro.io/sentinelle-population?lang=en'];
const ALTERNATES_DROPPED_ON_PURPOSE = ['https://getcoro.io/sentinelle', 'https://getcoro.io/sentinelle-population'];

test('every previously valid static URL is preserved, except the documented intentional corrections', () => {
  assert.equal(baseline.urls.length, 40);
  for (const before of baseline.urls) {
    if (REMOVED_ON_PURPOSE.includes(before.url)) { assert.ok(!byUrl.has(before.url), `${before.url} should be removed (no genuine English)`); continue; }
    const after = byUrl.get(before.url);
    assert.ok(after, `${before.url} disappeared from the sitemap`);
    assert.equal(after.priority, before.priority, `${before.url} priority`);
    assert.equal(after.changeFrequency, before.changeFrequency, `${before.url} changefreq`);
    assert.equal(after.lastModified.toISOString(), before.lastModified, `${before.url} lastmod`);
    if (!ALTERNATES_DROPPED_ON_PURPOSE.includes(before.url)) assert.deepEqual(after.alternates?.languages ?? {}, before.alternates, `${before.url} alternates`);
  }
});

test('no URL is added beyond the baseline', () => {
  const known = new Set(baseline.urls.map((entry) => entry.url));
  for (const url of urls) assert.ok(known.has(url), `${url} is new`);
});

test('Sentinelle and Sentinelle Population expose no English URL or alternate: their English content is not genuine', () => {
  for (const path of ['/sentinelle', '/sentinelle-population']) {
    const entry = byUrl.get(`https://getcoro.io${path}`);
    assert.ok(entry, path);
    assert.equal(entry.alternates, undefined, `${path} must not declare alternates`);
    assert.ok(!urls.includes(`https://getcoro.io${path}?lang=en`));
  }
});

test('the six guides are French only: no English URL and no alternate', () => {
  const guides = publicRoutes.filter((route) => route.id.startsWith('guide-'));
  assert.equal(guides.length, 6);
  for (const guide of guides) {
    const entry = byUrl.get(`https://getcoro.io${guide.path}`);
    assert.ok(entry, guide.path);
    assert.equal(entry.alternates, undefined);
    assert.ok(!urls.includes(`https://getcoro.io${guide.path}?lang=en`));
  }
});

test('a genuine FR + EN route lists both URLs with reciprocal alternates', () => {
  const fr = byUrl.get('https://getcoro.io/pricing');
  const en = byUrl.get('https://getcoro.io/pricing?lang=en');
  assert.ok(fr && en);
  assert.deepEqual(fr.alternates, { languages: { 'fr-CA': 'https://getcoro.io/pricing', 'en-CA': 'https://getcoro.io/pricing?lang=en' } });
  assert.deepEqual(en.alternates, fr.alternates);
  assert.ok(byUrl.has('https://getcoro.io') && byUrl.has('https://getcoro.io?lang=en'), 'homepage keeps its historical URL form');
});

test('only discoverable, implemented, sitemap-enabled routes are listed; every other status stays out', () => {
  for (const route of publicRoutes) {
    const listed = staticSitemapRoutes.includes(route);
    if (['BUILD-NOW-HIDDEN', 'FUTURE', 'HIDDEN', 'REVIEW'].includes(route.publication)) assert.equal(listed, false, `${route.path} (${route.publication}) must not be listed`);
    if (!route.implemented) assert.equal(listed, false, `${route.path} is not implemented`);
  }
  for (const path of ['/plateforme', '/coro-exercices', '/conformite-reglementation', '/coro-knowledge', '/coro-ai', '/coro-network', '/coro-campus', '/coro-ops', '/qr-intervention', '/solutions/multi-sites', '/ressources', '/design-lab']) {
    assert.ok(!urls.some((url) => url.includes(path)), `${path} must not be in the sitemap`);
  }
});

test('PUBLISH-NOW routes that do not exist yet (/guides, /coro-incident) are excluded until implemented', () => {
  for (const id of ['guides', 'incident']) {
    const route = publicRoutes.find((r) => r.id === id) as PublicRoute;
    assert.equal(route.publication, 'PUBLISH-NOW');
    assert.equal(route.implemented, false);
    assert.ok(!urls.some((url) => url.includes(route.path)));
  }
  const promoted: PublicRoute = { ...(publicRoutes.find((r) => r.id === 'guides') as PublicRoute), kind: 'historical', implemented: true, sitemap: true, en: false };
  assert.ok(buildStaticSitemapEntries([promoted], lastModified).some((entry) => entry.url === 'https://getcoro.io/guides'), 'once implemented and enabled it is listed, FR only');
});

test('publication status is independent from implementation and from V2 migration', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets']);
  assert.ok(publicRoutes.some((r) => r.publication === 'PUBLISH-NOW' && r.implemented), 'published and implemented, yet not V2 migrated');
  assert.ok(publicRoutes.some((r) => r.publication === 'PUBLISH-NOW' && !r.implemented), 'published target, not implemented');
  assert.ok(!('v2Migrated' in publicRoutes[0]) && !('migrated' in publicRoutes[0]), 'the route registry does not own migration state');
  assert.equal(publicRoutes.find((r) => r.id === 'platform-overview')?.publication, 'BUILD-NOW-HIDDEN');
  assert.equal(publicRoutes.find((r) => r.id === 'exercises')?.publication, 'REVIEW');
});

test('the Design Lab is never a registered or listed route', () => {
  assert.ok(!publicRoutes.some((route) => route.path.includes('design-lab')));
  assert.ok(!urls.some((url) => url.includes('design-lab')));
});

test('sitemap URLs never carry tracking or referral parameters; only the locale query appears', () => {
  for (const url of urls) {
    const params = [...new URL(url).searchParams.keys()];
    assert.ok(params.every((key) => key === 'lang'), `${url} has a non-locale parameter`);
    assert.ok(!/[?&](ref|utm_[a-z]+|category)=/.test(url));
  }
});

test('blog entries come from real API data only; English only with a genuine translation', () => {
  const posts = [
    { slug: 'fr-only', publishedAt: '2026-01-02T00:00:00Z' },
    { slug: 'bilingual', updatedAt: '2026-03-04T00:00:00Z', titleEn: 'Title', contentEn: 'Content' },
    { slug: 'half-translated', titleEn: 'Title', contentEn: '  ' },
    { slug: '' }, { slug: null },
  ];
  const result = buildBlogSitemapEntries(posts, lastModified);
  const list = result.map((entry: SitemapEntry) => entry.url);
  assert.deepEqual(list, ['https://getcoro.io/blog/fr-only', 'https://getcoro.io/blog/bilingual', 'https://getcoro.io/blog/bilingual?lang=en', 'https://getcoro.io/blog/half-translated']);
  assert.equal(result[0].alternates, undefined);
  assert.equal(result[0].lastModified.toISOString(), '2026-01-02T00:00:00.000Z');
});

test('blog API success returns the articles without any warning', async () => {
  const warnings: string[] = [];
  const result = await fetchPublishedBlogPosts((async () => new Response(JSON.stringify([{ slug: 'a' }]), { status: 200 })) as typeof fetch, (message) => warnings.push(message));
  assert.equal(result.ok, true);
  assert.equal(result.posts.length, 1);
  assert.equal(warnings.length, 0);
});

test('blog API failure is fail-soft and observable: no throw, no invented article, one safe warning', async () => {
  const cases: [string, typeof fetch][] = [
    ['network', (async () => { throw new TypeError('fetch failed: getaddrinfo ENOTFOUND coro_backend'); }) as typeof fetch],
    ['http', (async () => new Response('nope', { status: 503 })) as typeof fetch],
    ['shape', (async () => new Response(JSON.stringify({ not: 'an array' }), { status: 200 })) as typeof fetch],
    ['parse', (async () => new Response('<html>', { status: 200 })) as typeof fetch],
  ];
  for (const [name, impl] of cases) {
    const warnings: string[] = [];
    const result = await fetchPublishedBlogPosts(impl, (message) => warnings.push(message));
    assert.equal(result.ok, false, name);
    assert.deepEqual(result.posts, [], name);
    assert.equal(warnings.length, 1, name);
    assert.match(warnings[0], /sitemap/i);
    assert.doesNotMatch(warnings[0], /coro_backend|ENOTFOUND|https?:\/\//, `${name}: the warning must not leak internal hosts or URLs`);
    assert.deepEqual(buildBlogSitemapEntries(result.posts, lastModified), []);
  }
});

test('app/sitemap.ts is generated from the registry and stays the only place that wires the blog fail-soft fetch', () => {
  const source = readFileSync(join(process.cwd(), 'app/sitemap.ts'), 'utf8');
  assert.match(source, /buildStaticSitemapEntries\(staticSitemapRoutes/);
  assert.match(source, /fetchPublishedBlogPosts\(\)/);
  assert.doesNotMatch(source, /design-lab/);
});
