import assert from 'node:assert/strict';
import test from 'node:test';
import { isLegacyFooterVisible, isV2MigratedRoute, migratedV2DynamicRoutes, migratedV2Routes } from '../lib/site/v2-migration.ts';

/**
 * MIG-07B dynamic route-matching matrix. `migratedV2Routes` is exact-string-match only and can never represent
 * a resolved dynamic pathname (`/blog/[slug]` literally does not match `/blog/my-article`), so `/blog/[slug]`
 * is approved through the separate, explicit `migratedV2DynamicRoutes` registry instead. This file exercises
 * that mechanism directly, independent of tests/blog-index-migration.test.ts.
 */

test('dynamic registry: exactly one approved pattern, for /blog only', () => {
  assert.equal(migratedV2DynamicRoutes.length, 1);
  assert.equal(migratedV2DynamicRoutes[0].base, '/blog');
});

test('static: /blog is V2', () => {
  assert.equal(isV2MigratedRoute('/blog'), true);
  assert.equal(isLegacyFooterVisible('/blog'), false);
});

test('dynamic: real article pathnames are V2', () => {
  for (const path of ['/blog/a', '/blog/real-slug', '/blog/article-with-many-hyphens', '/blog/conformite-resilience-operationnelle-pmu']) {
    assert.equal(isV2MigratedRoute(path), true, path);
    assert.equal(isLegacyFooterVisible(path), false, path);
  }
});

test('/blog/ normalizes to /blog (the static index route itself, not a dynamic match)', () => {
  // normalizePath() strips the trailing slash, so this resolves to the already-registered static /blog entry.
  assert.equal(isV2MigratedRoute('/blog/'), true);
});

test('not matched: nested segments and lookalike routes stay legacy', () => {
  for (const path of ['/blog/a/b', '/blog/a/b/c', '/blogger/a', '/blogfoo', '/blogger', '/other/a']) {
    assert.equal(isV2MigratedRoute(path), false, path);
    assert.equal(isLegacyFooterVisible(path), true, path);
  }
});

test('unaffected: previously migrated exact routes and unrelated routes are unchanged', () => {
  assert.equal(isV2MigratedRoute('/about'), true);
  assert.equal(isV2MigratedRoute('/'), true); // MIG-08A: Homepage is now V2
  assert.equal(isV2MigratedRoute('/unknown-route'), false);
});

test('normalization: query strings and hashes do not break dynamic matching, and combine deterministically', () => {
  assert.equal(isV2MigratedRoute('/blog/a?lang=en'), true);
  assert.equal(isV2MigratedRoute('/blog/a#section'), true);
  assert.equal(isV2MigratedRoute('/blog/a?lang=en&page=2'), true);
  assert.equal(isV2MigratedRoute('/blog/a/'), true); // trailing slash normalizes to a single segment
});

test('the mechanism is explicit, not a blanket prefix authorization: only the registered base/pattern pairs apply', () => {
  const customStatic = ['/about'];
  const customDynamic: readonly { base: string; pattern: RegExp }[] = [];
  assert.equal(isV2MigratedRoute('/blog/a', customStatic, customDynamic), false);
  assert.equal(isV2MigratedRoute('/about', customStatic, customDynamic), true);
});

test('registering /blog (static) does not implicitly authorize /blog/* — the dynamic pattern is a separate, explicit entry', () => {
  assert.equal(migratedV2Routes.includes('/blog'), true);
  const staticOnly: readonly { base: string; pattern: RegExp }[] = [];
  assert.equal(isV2MigratedRoute('/blog/some-slug', migratedV2Routes, staticOnly), false);
});
