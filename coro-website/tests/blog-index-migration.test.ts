import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, isV2MigratedRoute, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute } from '../lib/site/routes.ts';
import { PAGE_SIZE, paginate, pageNumbers } from '../lib/site/pagination.ts';

// /blog (MIG-07A) — index reshell into V2Shell. /blog/[slug] stays legacy (MIG-07B). Baseline: tests/fixtures/blog-index-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/blog/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/blog/page.module.css');
const baseline = JSON.parse(read('tests/fixtures/blog-index-baseline.json')) as {
  count: number; categories: string[]; withCoverImage: number; withEnTitleAndExcerpt: number; allSlugs: string[];
};

test('baseline fixture exists, captured against the live production API', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/blog-index-baseline.json')));
  assert.equal(baseline.count, 56);
  assert.ok(baseline.categories.length > 0);
});

test('route implementation: V2Shell used, own local page (no shared blog component yet, per MIG-07-PRE §22)', () => {
  assert.match(page, /<V2Shell locale=\{locale\} pathname="\/blog">/);
  assert.doesNotMatch(code, /lucide-react|from 'next\/image'/);
});

test('API contract preserved: no-store fetch to blog/public, fail-soft to []', () => {
  assert.match(page, /serverApiUrl\('blog\/public'\)/);
  assert.match(page, /cache: 'no-store'/);
  assert.match(page, /catch \{\s*return \[\];\s*\}/);
});

test('category filter query param preserved', () => {
  assert.match(page, /params\.set\('category', category\)/);
  assert.match(code, /activeCategory \? posts\.filter/);
});

test('FR/EN soft per-field fallback preserved on the index (title falls to FR, excerpt falls to FR)', () => {
  assert.match(code, /post\.titleEn \|\| post\.titleFr/);
  assert.match(code, /post\.excerptEn \|\| post\.excerptFr/);
});

test('SEO: static per-language title/description, absoluteTitle used since titles already carry the CORO brand', () => {
  assert.match(page, /Blogue CORO — Conformité, sécurité et mesures d.urgence/);
  assert.match(page, /CORO Blog — Emergency Management, Compliance and Fire Safety/);
  assert.match(page, /absoluteTitle: true/);
});

test('empty state text preserved exactly, same code path serves genuine-empty and API-down (§7 of the gate doc, not changed here)', () => {
  assert.match(page, /Aucun article pour l.instant\. Revenez bientôt !/);
  assert.match(page, /No articles yet\. Check back soon!/);
});

test('article links preserve slug + lang query param, no slug regeneration', () => {
  assert.match(code, /`\/blog\/\$\{slug\}/);
});

test('images: real cover image or placeholder, no next/image, no domain allowlist introduced', () => {
  assert.match(code, /coverImage/);
  assert.match(code, /📄/);
  assert.doesNotMatch(code, /next\/image/);
});

test('design: one featured story distinct from the supporting grid, category filter integrated', () => {
  assert.match(page, /featured/);
  assert.match(css, /\.featured\s*\{/);
  assert.match(css, /\.grid\s*\{/);
  assert.match(css, /\.filterChip/);
});

test('/blog/[slug] (article page) is untouched by MIG-07A', () => {
  const article = read('app/blog/[slug]/page.tsx');
  assert.match(article, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(article, /V2Shell/);
});

test('Homepage untouched by MIG-07A', () => {
  assert.doesNotMatch(read('app/page.tsx'), /blog\/page/i);
});

// Pagination (MIG-07A polish) — deterministic fixture, does not assert today's live count of 56.
const fixture = Array.from({ length: 30 }, (_, i) => ({
  id: `post-${i}`,
  slug: `article-${i}`,
  titleFr: `Titre ${i}`,
  titleEn: `Title ${i}`,
}));

test('pagination: page size is ~12, page 1 with no param', () => {
  assert.equal(PAGE_SIZE, 12);
  const { pageItems, currentPage, totalPages } = paginate(fixture, 1);
  assert.equal(currentPage, 1);
  assert.equal(pageItems.length, 12);
  assert.equal(totalPages, 3);
  assert.equal(pageItems[0].id, 'post-0');
});

test('pagination: page 2 returns the next slice, no duplicates with page 1', () => {
  const page1 = paginate(fixture, 1).pageItems;
  const page2 = paginate(fixture, 2).pageItems;
  assert.equal(page2.length, 12);
  assert.equal(page2[0].id, 'post-12');
  const overlap = page1.filter((p) => page2.some((q) => q.id === p.id));
  assert.equal(overlap.length, 0);
});

test('pagination: final page has the remainder, no missing articles across all pages', () => {
  const { pageItems, currentPage, totalPages } = paginate(fixture, 3);
  assert.equal(currentPage, 3);
  assert.equal(totalPages, 3);
  assert.equal(pageItems.length, 6);
  const seen = new Set<string>();
  for (let p = 1; p <= totalPages; p++) paginate(fixture, p).pageItems.forEach((i) => seen.add(i.id));
  assert.equal(seen.size, fixture.length);
});

test('pagination: invalid/zero/negative/excessive page values normalize safely, never empty when articles exist', () => {
  assert.equal(paginate(fixture, 0).currentPage, 1);
  assert.equal(paginate(fixture, -5).currentPage, 1);
  assert.equal(paginate(fixture, NaN).currentPage, 1);
  const excessive = paginate(fixture, 999);
  assert.equal(excessive.currentPage, 3);
  assert.ok(excessive.pageItems.length > 0);
});

test('pagination: empty list still returns totalPages=1 without throwing', () => {
  const { pageItems, currentPage, totalPages } = paginate([], 1);
  assert.equal(pageItems.length, 0);
  assert.equal(currentPage, 1);
  assert.equal(totalPages, 1);
});

test('pagination: page-number UI uses ellipsis for large page counts, no unbounded list', () => {
  const many = pageNumbers(5, 20);
  assert.ok(many.includes('ellipsis'));
  assert.ok(many.length < 20);
  const few = pageNumbers(1, 3);
  assert.doesNotMatch(few.join(','), /ellipsis/);
});

test('pagination: URL contract uses ?page=N query param, /blog is canonical page 1', () => {
  assert.match(read('app/blog/page.tsx'), /params\.set\('page', String\(page\)\)/);
  assert.doesNotMatch(read('app/blog/page.tsx'), /\/blog\/page\//);
});

test('pagination: FR/EN and category filter still slice deterministically (frontend-only, documented as non-blocking perf debt)', () => {
  assert.match(page, /Blog API currently returns the complete published collection|FRONTEND\/CLIENT-SIDE slicing/i);
  assert.match(page, /requestedPage/);
  assert.match(page, /activeCategory/);
});

test('pagination: accessibility — semantic nav, aria-current, real anchors', () => {
  assert.match(page, /aria-label=\{t\.paginationLabel\}/);
  assert.match(page, /aria-current=\{p === currentPage \? 'page' : undefined\}/);
  assert.doesNotMatch(code, /<div[^>]*onClick.*page/i);
});

test('pagination: page 2+ does not repeat the dominant featured treatment (no false "new featured" article)', () => {
  assert.match(code, /isFirstPage \? pageItems\[0\] : undefined/);
});

test('registry: /blog is registered V2, /blog/[slug] is not', () => {
  assert.equal(migratedV2Routes.includes('/blog'), true);
  assert.equal(isLegacyFooterVisible('/blog'), false);
  assert.equal(isV2MigratedRoute('/blog/some-real-slug'), false);
  assert.equal(isLegacyFooterVisible('/blog/some-real-slug'), true);
  const r = getRoute('blog');
  assert.equal(r?.path, '/blog');
  assert.equal(r?.publication, 'LEGACY-PRESERVE');
});
