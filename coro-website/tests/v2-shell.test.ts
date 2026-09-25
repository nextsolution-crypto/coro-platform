import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, isV2MigratedRoute, migratedV2Routes } from '../lib/site/v2-migration.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('the V2 migration registry starts empty: no current route is migrated', () => {
  assert.equal(migratedV2Routes.length, 0);
  const partial = ['/', '/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/sentinelle', '/blog', '/design-lab'];
  for (const path of partial) assert.equal(isV2MigratedRoute(path), false, path);
  assert.equal(isV2MigratedRoute('/unknown-route'), false);
  assert.equal(isV2MigratedRoute(null), false);
});

test('the registry matches exact paths only and ignores query, hash and trailing slash', () => {
  const routes = ['/about'];
  assert.equal(isV2MigratedRoute('/about', routes), true);
  assert.equal(isV2MigratedRoute('/about/', routes), true);
  assert.equal(isV2MigratedRoute('/about?lang=en', routes), true);
  assert.equal(isV2MigratedRoute('/about/team', routes), false);
  assert.equal(isV2MigratedRoute('/', routes), false);
});

test('the legacy footer is kept for legacy routes and suppressed only for migrated ones', () => {
  assert.equal(isLegacyFooterVisible('/about'), true);
  assert.equal(isLegacyFooterVisible('/'), true);
  assert.equal(isLegacyFooterVisible('/about', ['/about']), false);
  assert.equal(isLegacyFooterVisible('/contact', ['/about']), true);
});

test('V2Shell owns the V1 scope, language, skip link, header, one main landmark and the V2 footer', () => {
  const shell = read('components/site/V2Shell.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(shell, /data-coro-system="v1"/);
  assert.match(shell, /lang=\{locale\}/);
  assert.match(shell, /<SkipLink\b/);
  assert.match(shell, /<SiteHeader\b/);
  assert.match(shell, /<SiteFooterV2\b/);
  assert.equal((shell.match(/<main\b/g) ?? []).length, 1);
  assert.match(shell, /<main id="main-content" tabIndex=\{-1\}/);
  assert.ok(shell.indexOf('<SkipLink') < shell.indexOf('<SiteHeader'), 'skip link comes first');
  assert.ok(shell.indexOf('<SiteHeader') < shell.indexOf('<main'));
  assert.ok(shell.indexOf('</main>') < shell.indexOf('<SiteFooterV2'));
});

test('the shared SkipLink targets #main-content by default and is one implementation', () => {
  const skip = read('components/site/SkipLink.tsx');
  assert.match(skip, /targetId = 'main-content'/);
  assert.match(skip, /href=\{`#\$\{targetId\}`\}/);
  const css = read('components/site/SkipLink.module.css');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(read('app/design-lab/SkipLink.tsx'), /from '@\/components\/site\/SkipLink'/);
});

test('the root layout delegates chrome to LegacyChrome and keeps html lang, without V1 on html or body', () => {
  const layout = read('app/layout.tsx');
  assert.match(layout, /<LegacyChrome \/>/);
  assert.match(layout, /<html lang="fr"/);
  assert.doesNotMatch(layout, /data-coro-system/);
  assert.doesNotMatch(layout, /<Footer\b|<CookieBanner\b|<ScrollToTop\b|<ChatWidget\b/);
});

test('LegacyChrome guards only the footer; cookie notice, scroll-to-top and chat stay global', () => {
  const chrome = read('app/components/LegacyChrome.tsx');
  assert.match(chrome, /usePathname\(\)/);
  assert.match(chrome, /isLegacyFooterVisible\(pathname\) && <Footer \/>/);
  for (const name of ['CookieBanner', 'ScrollToTop', 'ChatWidget']) {
    assert.match(chrome, new RegExp(String.raw`^\s*<${name} />`, 'm'), name);
    assert.doesNotMatch(chrome, new RegExp(`&& <${name}`), name);
  }
});

test('no production page uses V2Shell yet', () => {
  for (const file of ['app/about/page.tsx', 'app/about/AboutV2.tsx', 'app/contact/page.tsx', 'app/page.tsx', 'components/ProductPage.tsx']) {
    assert.doesNotMatch(read(file), /V2Shell/, file);
  }
});
