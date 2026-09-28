import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { filterPostsByTaxonomy, normalizeTaxonomyValue } from '../lib/site/blog-taxonomy.ts';
import { paginate } from '../lib/site/pagination.ts';

// MIG-07C — Blog discovery & taxonomy (category/tag filtering). Deterministic fixture data only —
// NEVER asserts today's live production taxonomy counts (251 distinct tags across 56 posts, per
// the MIG-07C audit against https://api.getcoro.io/api/blog/public — see MIG-07-BLOG-GATE.md).

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const indexPage = read('app/blog/page.tsx');
const indexCode = indexPage.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const articlePage = read('app/blog/[slug]/page.tsx');

type Fixture = { id: string; slug: string; titleFr: string; category?: string; tags?: string[] };

const fixture: Fixture[] = [
  { id: '1', slug: 'a', titleFr: 'A', category: 'Guides pratiques', tags: ['Conformité', 'PMU'] },
  { id: '2', slug: 'b', titleFr: 'B', category: 'Guides pratiques', tags: ['conformité', 'PSI'] }, // casing variant of "Conformité"
  { id: '3', slug: 'c', titleFr: 'C', category: 'Nouvelles CORO', tags: ['PMU'] },
  { id: '4', slug: 'd', titleFr: 'D', category: 'Guides pratiques', tags: [] }, // no tags — must be safely handled
  { id: '5', slug: 'e', titleFr: 'E', category: undefined, tags: ['Résilience organisationnelle'] }, // no category — must be safely handled
];

/* ─── normalization ─── */

test('taxonomy: normalization is trim + lowercase, comparison-only (never mutates display value)', () => {
  assert.equal(normalizeTaxonomyValue('  Conformité  '), 'conformité');
  assert.equal(normalizeTaxonomyValue('CONFORMITÉ'), 'conformité');
  assert.equal(normalizeTaxonomyValue('conformité'), 'conformité');
});

/* ─── filtering ─── */

test('taxonomy: no filter returns all posts unchanged', () => {
  assert.deepEqual(filterPostsByTaxonomy(fixture, '', ''), fixture);
});

test('taxonomy: known tag matches case/whitespace-insensitively across real casing variants', () => {
  const result = filterPostsByTaxonomy(fixture, '', 'Conformité');
  assert.deepEqual(result.map((p) => p.id), ['1', '2']); // matches both "Conformité" and "conformité"
});

test('taxonomy: unknown tag returns zero matches, not an error, not the whole list', () => {
  const result = filterPostsByTaxonomy(fixture, '', 'taxonomy-value-that-does-not-exist');
  assert.deepEqual(result, []);
});

test('taxonomy: known category returns exact matches only', () => {
  const result = filterPostsByTaxonomy(fixture, 'Nouvelles CORO', '');
  assert.deepEqual(result.map((p) => p.id), ['3']);
});

test('taxonomy: category AND tag combine (both must match)', () => {
  const result = filterPostsByTaxonomy(fixture, 'Guides pratiques', 'PMU');
  assert.deepEqual(result.map((p) => p.id), ['1']);
});

test('taxonomy: posts with no tags or no category are handled safely, never throw', () => {
  assert.doesNotThrow(() => filterPostsByTaxonomy(fixture, '', 'anything'));
  assert.doesNotThrow(() => filterPostsByTaxonomy(fixture, 'anything', ''));
});

test('taxonomy: no duplicates, no missing matches for a tag shared by multiple posts', () => {
  const result = filterPostsByTaxonomy(fixture, '', 'PMU');
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map((p) => p.id)).size, 2);
});

/* ─── filter-before-pagination ─── */

test('taxonomy + pagination: filtering happens before slicing, never produces a sparse/empty page incorrectly', () => {
  const many: Fixture[] = Array.from({ length: 20 }, (_, i) => ({
    id: String(i), slug: `s${i}`, titleFr: `T${i}`, tags: i % 2 === 0 ? ['even'] : ['odd'],
  }));
  const filtered = filterPostsByTaxonomy(many, '', 'even');
  assert.equal(filtered.length, 10);
  const { pageItems, totalPages } = paginate(filtered, 1);
  assert.equal(totalPages, 1); // 10 items < PAGE_SIZE (12) — would be 2 pages if filtering ran after slicing on the full 20
  assert.equal(pageItems.length, 10);
});

/* ─── URL contract (index) ─── */

test('taxonomy: /blog?tag=<value> URL contract, not a new dynamic route', () => {
  assert.match(indexPage, /params\.set\('tag', tag\)/);
  assert.doesNotMatch(indexPage, /\/blog\/tag\//);
});

test('taxonomy: changing filter resets pagination (clearTagHref/categoryHref never carry a page param)', () => {
  const clearTagHrefBody = indexPage.slice(indexPage.indexOf('function clearTagHref'), indexPage.indexOf('function pageHref'));
  assert.doesNotMatch(clearTagHrefBody, /params\.set\('page'/);
});

test('taxonomy: language preserved across filter links (?lang=en carried through)', () => {
  assert.match(indexPage, /if \(locale === 'en'\) params\.set\('lang', 'en'\)/);
});

/* ─── active filter / clear filter / distinct empty state ─── */

test('taxonomy: active filter UI is distinct from the global empty-Blog state (posts.length checked before filteredPosts)', () => {
  const emptyIdx = indexCode.indexOf('posts.length === 0');
  const filteredEmptyIdx = indexCode.indexOf('filteredPosts.length === 0');
  assert.ok(emptyIdx >= 0 && filteredEmptyIdx > emptyIdx);
  assert.match(indexCode, /t\.tagEmpty/);
});

test('taxonomy: clear-filter control has real text, not a bare icon, and is a real anchor', () => {
  assert.match(indexPage, /className=\{styles\.clearFilter\}/);
  assert.match(indexPage, /t\.clearFilter/);
});

/* ─── SEO for filtered states ─── */

test('taxonomy: filtered index states are noindex,follow (discovery UX, not independent SEO landing pages)', () => {
  assert.match(indexPage, /isFiltered = Boolean\(params\.category \|\| params\.tag\)/);
  assert.match(indexPage, /indexable: !isFiltered/);
});

test('taxonomy: canonical excludes query params by construction (lib/site/seo.ts buildPageMetadata never includes query in canonical)', () => {
  const seo = read('lib/site/seo.ts');
  assert.match(seo, /Query \(\?ref, \?category, utm\.\.\.\) and hash are never part of a canonical/);
});

/* ─── article taxonomy links ─── */

test('article: category badge is a real anchor linking back to /blog?category=', () => {
  assert.match(articlePage, /href=\{`\/blog\?category=\$\{encodeURIComponent\(post\.category\)\}/);
});

test('article: tags are real anchors linking back to /blog?tag=, not plain spans', () => {
  assert.match(articlePage, /href=\{`\/blog\?tag=\$\{encodeURIComponent\(tag\)\}/);
  assert.doesNotMatch(articlePage, /<span key=\{tag\} className=\{styles\.tag\}>#\{tag\}<\/span>/);
});

test('article: taxonomy links preserve language, do not pollute the query with anything else', () => {
  assert.match(articlePage, /\$\{lang === 'en' \? '&lang=en' : ''\}/);
});

/* ─── security: taxonomy values rendered as text, not injected as HTML ─── */

test('security: taxonomy values are never passed through dangerouslySetInnerHTML (only the trusted content field is)', () => {
  const dangerousUses = articlePage.match(/dangerouslySetInnerHTML=\{\{/g) ?? [];
  assert.equal(dangerousUses.length, 3); // jsonLd, breadcrumbLd, article content — unchanged count from MIG-07B
  assert.doesNotMatch(articlePage, /dangerouslySetInnerHTML=\{\{ __html: .*tag/i);
});
