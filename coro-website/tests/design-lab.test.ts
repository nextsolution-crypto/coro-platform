import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicRoutes } from '../lib/site/routes.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('the Design Lab exists as an internal, non-indexed route', () => {
  assert.ok(existsSync(join(root, 'app/design-lab/page.tsx')));
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.match(page, /googleBot:\s*\{\s*index:\s*false/);
  assert.doesNotMatch(page, /index:\s*true/);
  assert.match(page, /internal/i);
});

test('the Design Lab is absent from the sitemap, route registry, navigation and robots rules', () => {
  assert.doesNotMatch(read('app/sitemap.ts'), /design-lab/);
  assert.doesNotMatch(read('lib/site/routes.ts'), /design-lab/);
  assert.doesNotMatch(read('lib/site/navigation.ts'), /design-lab/);
  assert.doesNotMatch(read('app/robots.ts'), /design-lab/);
  assert.ok(!publicRoutes.some((route) => route.path.includes('design-lab')));
  for (const locale of ['fr', 'en'] as const) {
    assert.ok(!visibleNavigation(locale).flatMap((group) => group.items).some((item) => item.href?.includes('design-lab')));
  }
});

test('the target signal red exists while the legacy reds stay untouched', () => {
  const tokens = read('app/design-tokens.css');
  assert.match(tokens, /--coro-v1-red-600:\s*#e51b2a/i);
  assert.match(tokens, /--coro-red-600:\s*#c0392b/i);
  assert.match(tokens, /--coro-red-700:\s*#a93226/i);
  assert.match(read('components/product.module.css'), /#bd3b31/i);
});

test('target tokens are opt-in: production :root is not remapped', () => {
  const tokens = read('app/design-tokens.css');
  const remap = tokens.slice(tokens.indexOf("[data-coro-system='v1']"));
  assert.match(remap, /--coro-red-600:\s*var\(--coro-v1-red-600\)/);
  const beforeScope = tokens.slice(0, tokens.indexOf("[data-coro-system='v1']"));
  assert.doesNotMatch(beforeScope, /--coro-red-600:\s*var\(/);
  assert.match(beforeScope, /--coro-v1-critical:/);
  for (const family of ['navy-950', 'blue-700', 'surface-1', 'text-900', 'border-200', 'motion-base', 'shadow-3', 'radius-md', 'space-12', 'content', 'reading', 'focus', 'z-skip']) {
    assert.match(beforeScope, new RegExp(`--coro-v1-${family}:`), `--coro-v1-${family} is missing`);
  }
});

test('primary CTA is CORO red and blue is not the default action colour', () => {
  const primitives = read('components/ui/primitives.module.css');
  assert.match(primitives, /\.primary\{background:var\(--coro-red-600\)/);
  assert.doesNotMatch(read('app/design-tokens.css'), /--coro-v1-(?:red|signal)[a-z0-9-]*:\s*#(?:0d4f8b|1a6fb8)/i);
});

test('the skip link is demonstrated in the Lab and not installed in the root layout', () => {
  assert.ok(existsSync(join(root, 'app/design-lab/SkipLink.tsx')));
  assert.match(read('app/design-lab/page.tsx'), /<SkipLink/);
  assert.doesNotMatch(read('app/layout.tsx'), /SkipLink/);
});

test('navigation exposes disclosure state, Escape handling and focus return', () => {
  const desktop = read('components/site/DesktopNavigation.tsx');
  const mobile = read('components/site/MobileNavigation.tsx');
  const header = read('components/site/SiteHeader.tsx');
  assert.match(desktop, /aria-expanded/);
  assert.match(desktop, /aria-controls/);
  assert.match(desktop, /Escape/);
  assert.match(desktop, /\.focus\(\)/);
  assert.doesNotMatch(desktop, /aria-haspopup/);
  assert.match(mobile, /aria-expanded/);
  assert.match(mobile, /aria-controls/);
  assert.match(header, /Escape/);
  assert.match(header, /toggle\.current\?\.focus\(\)/);
  assert.match(header, /aria-controls/);
  assert.match(header, /useId/);
  assert.doesNotMatch(read('components/site/SiteShell.module.css'), /\.dropdown:hover|\.dropdown:focus-within/);
});

test('the language switch announces the target language', () => {
  assert.match(read('components/site/LanguageSwitcher.tsx'), /lang=\{nextLocale\}/);
});

test('Button supports dark surfaces and a non-navigable disabled state without changing defaults', () => {
  const button = read('components/ui/Button.tsx');
  assert.match(button, /surface\?: 'light' \| 'dark'/);
  assert.match(button, /aria-disabled="true"/);
  assert.match(button, /variant = 'primary'/);
  assert.match(button, /surface = 'light'/);
});

test('protected checkpoint and production files are unchanged since checkpoint 609698fc', (context) => {
  const protectedFiles = [
    // app/layout.tsx left the checkpoint list in MIG-00B.1 (LegacyChrome); tests/v2-shell.test.ts now guards it.
    // app/sitemap.ts left the checkpoint list in MIG-00B.3 (registry-driven); tests/sitemap.test.ts guards it against the recorded baseline.
    'app/HomePageClient.tsx', 'app/page.tsx', 'app/robots.ts', 'app/DemoForm.tsx',
    'app/components/Footer.tsx', 'app/components/CookieBanner.tsx', 'app/components/ChatWidget.tsx', 'app/components/ScrollToTop.tsx',
    'components/ProductPage.tsx', 'components/ProductCompositions.tsx', 'components/product.module.css', 'components/product-compositions.module.css',
    'lib/site/product-content.ts', 'app/about/AboutV2.tsx', 'app/institutional.module.css',
    'app/gestion-documentaire/page.tsx', 'app/gestion-de-projets/page.tsx', 'app/performance-objectifs/page.tsx', 'app/portail-client/page.tsx',
  ];
  try {
    execFileSync('git', ['cat-file', '-e', '609698fc^{commit}'], { cwd: root, stdio: 'ignore' });
  } catch {
    context.skip('checkpoint commit 609698fc is not available in this clone');
    return;
  }
  for (const file of protectedFiles) {
    let changed = false;
    try { execFileSync('git', ['diff', '--quiet', '609698fc', '--', file], { cwd: root, stdio: 'ignore' }); } catch { changed = true; }
    assert.equal(changed, false, `${file} differs from checkpoint 609698fc`);
  }
});

test('the referral mechanism is still owned by the homepage', () => {
  const home = read('app/HomePageClient.tsx');
  assert.match(home, /coro_referral_code|REFERRAL_COOKIE_CODE/);
  assert.match(home, /\^CR-\[A-HJ-NP-Z2-9\]\{6\}\$/);
  const form = read('app/DemoForm.tsx');
  assert.match(form, /coro_referral_code/);
  assert.match(form, /coro_referral_first_touch/);
});

test('LAB-01B: radius hierarchy, architectural surface and depth guidance exist without changing target values', () => {
  const tokens = read('app/design-tokens.css');
  for (const token of ['radius-frame', 'radius-panel', 'radius-control', 'paper', 'paper-line', 'label-tracking']) assert.match(tokens, new RegExp(`--coro-v1-${token}:`), `--coro-v1-${token} is missing`);
  assert.match(tokens, /--coro-v1-red-600:\s*#e51b2a/i);
  assert.match(tokens, /--coro-v1-radius-xl:\s*1\.5rem/);
  assert.match(tokens, /--coro-v1-shadow-3:/);
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /depthSteps/);
  assert.match(page, /rhythm/);
  const css = read('app/design-lab/design-lab.module.css');
  assert.match(css, /\.band\[data-tone="paper"\]/);
  const refined = css.slice(css.indexOf('LAB-01B refinements'));
  assert.doesNotMatch(refined, /radial-gradient|conic-gradient|linear-gradient\([^)]*(?:blue|navy|red)/, 'the architectural surface must be hairline structure, not a decorative gradient');
  assert.match(refined, /paper-line/);
});
