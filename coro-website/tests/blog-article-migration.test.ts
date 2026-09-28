import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, isV2MigratedRoute } from '../lib/site/v2-migration.ts';
import { getRoute } from '../lib/site/routes.ts';

/**
 * /blog/[slug] (MIG-07B) — dynamic article reshell into V2Shell. Baseline: tests/fixtures/blog-article-baseline.json.
 * Protects the CONTRACT (API shape, publication gate, strict FR/EN gate, slug/SEO/structured-data/body-rendering
 * behavior), not today's live catalog. See docs/website-v2/05-migration/MIG-07-BLOG-GATE.md §32/§34.
 * Dynamic route-matching itself is covered separately in tests/blog-dynamic-registry.test.ts.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/blog/[slug]/page.tsx');
const css = read('app/blog/[slug]/page.module.css');
const baseline = JSON.parse(read('tests/fixtures/blog-article-baseline.json')) as {
  qaArticles: { slug: string; isPublished: boolean; hasEnglish: boolean; category: string; hasCoverImage: boolean; tagCount: number }[];
  requiredResponseFields: string[];
};

test('baseline fixture exists and lists real, published QA articles', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/blog-article-baseline.json')));
  assert.ok(baseline.qaArticles.length >= 2);
  for (const a of baseline.qaArticles) assert.equal(a.isPublished, true, a.slug);
});

test('route implementation: V2Shell used, no page-owned <main>/<footer>/legacy nav', () => {
  assert.match(page, /V2Shell/);
  assert.doesNotMatch(page, /<main\b/);
  assert.doesNotMatch(page, /<footer\b/);
});

test('API contract: GET /api/blog/public/:slug, cache: no-store, fail-soft to null', () => {
  assert.match(page, /serverApiUrl\(`blog\/public\/\$\{slug\}`\)/);
  assert.match(page, /cache:\s*'no-store'/);
  assert.match(page, /catch\s*\{\s*return null;\s*\}/);
});

test('publication gate: !post || !post.isPublished -> notFound(), preserved exactly', () => {
  assert.match(page, /if \(!post \|\| !post\.isPublished\) \{\s*notFound\(\);\s*\}/);
});

test('language contract: strict gate (titleEn AND contentEn both required), no soft per-field fallback', () => {
  const hasEnglishMatches = page.match(/hasEnglish = Boolean\(post\.titleEn\?\.trim\(\)\) && Boolean\(post\.contentEn\?\.trim\(\)\)/g) ?? [];
  assert.ok(hasEnglishMatches.length >= 1, 'strict hasEnglish gate must be present');
  // The index's soft per-field fallback looks like `post.titleEn || post.titleFr` for the DISPLAYED title/excerpt.
  // The article's own legacy SEO-title fallback chain (`seoTitleEn || titleEn || seoTitleFr || titleFr`) is a
  // different, pre-existing, metadata-only chain — not the index's body/display soft-fallback — and is preserved
  // verbatim from the legacy page, so it must NOT be flagged here.
  assert.doesNotMatch(page, /const title =\s*\n?\s*lang === 'fr'\s*\n?\s*\?\s*post\.titleFr\s*\n?\s*:\s*post\.titleEn \|\|/);
});

test('slug contract: no slug regeneration/renormalization, same slug used for FR and EN', () => {
  assert.doesNotMatch(page, /generateSlug|slugify|normalize.*slug/i);
  assert.match(page, /`\$\{SITE_URL\}\/blog\/\$\{slug\}`/);
  assert.match(page, /`\$\{SITE_URL\}\/blog\/\$\{slug\}\?lang=en`/);
});

test('article body security: dangerouslySetInnerHTML scoped to `content` only, no new raw-HTML surface', () => {
  // Exactly 3 JSX usages: JSON-LD (Article), JSON-LD (BreadcrumbList), article body content.
  const usages = page.match(/dangerouslySetInnerHTML=\{\{/g) ?? [];
  assert.equal(usages.length, 3);
  assert.match(page, /dangerouslySetInnerHTML=\{\{ __html: content \}\}/);
});

test('body typography supports headings, lists, links, blockquotes, images, tables, hr, pre/code', () => {
  for (const tag of ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'blockquote', 'img', 'hr', 'table', 'th', 'td', 'pre']) {
    assert.match(css, new RegExp(`:global\\(${tag}\\)`), `.body must style <${tag}>`);
  }
});

test('reading width is controlled (~65-75ch equivalent), distinct from the wide index canvas', () => {
  // MIG-07B-B: two widths — an outer article canvas plus a narrower prose grid track (min(46rem, 100%))
  // that ordinary paragraphs/lists/headings render into; wide structural elements (tables/images/callouts)
  // opt into the wider track. See docs/website-v2/05-migration/MIG-07-BLOG-GATE.md MIG-07B-B section.
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*min\(46rem,\s*100%\)\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.body\s*>\s*\*\s*\{\s*grid-column:\s*2;\s*\}/);
});

test('SEO/metadata contract: canonical, alternates, OpenGraph, Twitter, robots fields preserved', () => {
  assert.match(page, /alternates:\s*\{/);
  assert.match(page, /canonical: currentUrl/);
  assert.match(page, /openGraph:\s*\{/);
  assert.match(page, /twitter:\s*\{/);
  assert.match(page, /robots:\s*\{/);
  assert.match(page, /\| Blogue CORO/); // non-localized suffix preserved as-is (D-05, not silently fixed)
});

test('structured data: Article + BreadcrumbList JSON-LD field mapping preserved', () => {
  assert.match(page, /'@type':\s*'Article'/);
  assert.match(page, /'@type':\s*'BreadcrumbList'/);
  assert.match(page, /headline: title/);
  assert.match(page, /datePublished: post\.publishedAt/);
  assert.match(page, /dateModified: post\.updatedAt/);
});

test('unknown/missing post -> notFound() (same code path as unpublished)', () => {
  // Single shared branch, not a separate literal-404 code path — matches the existing (approved, not fixed here) contract.
  assert.match(page, /const post = await getPost\(slug\);/);
  assert.match(page, /if \(!post \|\| !post\.isPublished\) \{\s*notFound\(\);\s*\}/);
});

test('dynamic registry: /blog/[slug] resolves to V2 via the explicit dynamic pattern (not the literal string)', () => {
  for (const a of baseline.qaArticles) {
    const path = `/blog/${a.slug}`;
    assert.equal(isV2MigratedRoute(path), true, path);
    assert.equal(isLegacyFooterVisible(path), false, path);
  }
});

test('no backend modification: blog controller/service not touched by this migration (source untouched check via routes.ts)', () => {
  const route = getRoute('blog-post');
  assert.equal(route?.path, '/blog/[slug]');
  assert.equal(route?.publication, 'LEGACY-PRESERVE');
});

test('required API response fields are all referenced by the page (no invented fields)', () => {
  for (const field of baseline.requiredResponseFields) {
    assert.match(page, new RegExp(`post\\.${field}\\b`), `page must reference post.${field}`);
  }
});

test('no fabricated metadata: no reading time, "featured", certification, or source-count copy', () => {
  assert.doesNotMatch(page, /reading.?time|temps de lecture|featured|certifi|expert-reviewed/i);
});
