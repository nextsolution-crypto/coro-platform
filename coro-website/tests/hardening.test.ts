import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// LAB-08 hardening: contracts for defects found by the responsive / accessibility / resilience audit.
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((name) => {
  const path = join(dir, name);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});
const v2Css = ['site', 'ui', 'hero', 'page', 'spatial', 'operational', 'flow', 'conversion'].flatMap((dir) => walk(`components/${dir}`)).filter((path) => path.endsWith('.css'));

const tokens = read('app/design-tokens.css');
const token = (name: string) => tokens.match(new RegExp(`--coro-v1-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? '';
const channel = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const luminance = (hex: string) => { const [r, g, b] = channel(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('LAB08-003/004: semantic text colours reach WCAG AA on every V2 light surface', () => {
  const surfaces = { white: token('surface-0'), surface1: token('surface-1'), soft: token('surface-2') };
  for (const [name, surface] of Object.entries(surfaces)) {
    for (const foreground of ['text-900', 'text-600', 'success', 'warning', 'critical', 'info', 'blue-700']) {
      assert.ok(ratio(token(foreground), surface) >= 4.5, `${foreground} on ${name}: ${ratio(token(foreground), surface).toFixed(2)}`);
    }
  }
});

test('contrast holds on the navy surfaces and for the CORO red CTA and focus rings', () => {
  for (const navy of [token('navy-950'), token('navy-900')]) {
    for (const foreground of ['on-dark-900', 'on-dark-600', 'success-on-dark', 'warning-on-dark', 'red-300', 'focus-on-dark']) {
      assert.ok(ratio(token(foreground), navy) >= 4.5, `${foreground} on ${navy}: ${ratio(token(foreground), navy).toFixed(2)}`);
    }
  }
  assert.ok(ratio('#ffffff', token('red-600')) >= 4.5, 'white on the CORO red');
  assert.equal(token('red-600').toLowerCase(), '#c0392b', 'the signal red matches the official CORO brand red (CLAUDE.md)');
  for (const surface of [token('surface-0'), token('surface-2')]) assert.ok(ratio(token('focus'), surface) >= 3, 'focus ring on light');
  for (const navy of [token('navy-950'), token('navy-900')]) assert.ok(ratio(token('focus-on-dark'), navy) >= 3, 'focus ring on navy');
});

test('LAB08-005: desktop header labels never wrap and the tight range tightens spacing instead', () => {
  const css = read('components/site/SiteShell.module.css');
  assert.match(css, /@media\(min-width:68rem\)\{\.dropdown>button,\.directLink,\.login,\.demo,\.language\{white-space:nowrap\}\}/);
  assert.match(css, /@media\(min-width:68rem\) and \(max-width:74\.99rem\)\{[\s\S]*?\.dropdown>button,\.directLink\{padding-inline:\.5rem\}/);
});

test('LAB08-006: operational labels can wrap, and a long label cannot widen a row', () => {
  const css = read('components/operational/operational.module.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const selector of ['.chip', '.demoTag', '.actStatus']) {
    const block = css.match(new RegExp(`${selector.replace('.', '\\.')} \\{[^}]*\\}`))?.[0] ?? '';
    assert.doesNotMatch(block, /white-space:\s*nowrap/, selector);
    assert.match(block, /overflow-wrap:\s*anywhere/, selector);
  }
  assert.equal((css.match(/fit-content\(45%\)/g) ?? []).length, 3, 'timeline, action and document rows cap their state column');
  assert.doesNotMatch(css, /grid-template-columns:[^;]*minmax\(0, 1fr\) auto;/);
});

test('LAB08-007: a very long word wraps inside its data-to-action beat', () => {
  const css = read('components/flow/flow.module.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.d2aWord \{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /\.d2aList \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.d2aList \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.1fr\)/);
});

test('LAB08-008: no V2 text is set below the 10px micro-label floor', () => {
  for (const path of v2Css) {
    for (const match of read(path).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/font-size:\s*([\d.]+)rem/g)) {
      assert.ok(Number(match[1]) >= 0.625, `${path}: font-size ${match[1]}rem`);
    }
  }
});

test('every V2 animation has a reduced-motion counterpart and none loops forever', () => {
  for (const path of v2Css.filter((file) => /@keyframes|animation:/.test(read(file)))) {
    const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(css, /prefers-reduced-motion/, `${path} declares animation without a reduced-motion rule`);
    assert.doesNotMatch(css, /infinite/, path);
  }
  assert.match(tokens, /prefers-reduced-motion: reduce\) \{ \*, \*::before, \*::after \{[^}]*animation-duration: \.01ms !important[^}]*transition-duration: \.01ms !important/);
});

test('V2 header switches between the two navigations at one shared breakpoint', () => {
  const css = read('components/site/SiteShell.module.css');
  assert.match(css, /@media\(min-width:68rem\)\{\.headerInner\{[^}]*\}\.menuToggle,\.mobilePanel\{display:none\}\.desktopNav,\.headerActions\{display:flex/);
  assert.match(css, /\.desktopNav,\.headerActions\{display:none\}\.menuToggle\{/);
});

test('V2 breakpoints are the shared 48rem / 68rem pair, with three documented content-driven exceptions', () => {
  const found = new Set<string>();
  for (const path of v2Css) for (const match of read(path).matchAll(/@media\s*\(min-width:\s*([\d.]+)rem/g)) found.add(`${match[1]}rem`);
  assert.deepEqual([...found].sort(), ['48rem', '62rem', '68rem', '75rem', '80rem']);
  assert.match(read('components/flow/flow.module.css'), /75rem/);
  assert.match(read('components/hero/technical-annotations.module.css'), /80rem/);
  // Approved exception (MIG-08A-QA-GOV): EditorialHero's Homepage Hero overlay cards (CONNAÎTRE/PERSONNES/AGIR) must stay
  // hidden through the width range where they would collide with the editorial copy column. 48rem shows them too early
  // (copy is still wide); 68rem hides them too late on common laptop widths (992-1088px). 62rem is an intentional,
  // component-specific collision breakpoint — scoped to this one overlay, not a general-purpose addition to the pair.
  assert.match(read('components/page/editorial-hero.module.css'), /62rem/);
});

test('LAB08-009: the form error summary receives focus when it appears and shows a visible ring', () => {
  const form = read('components/conversion/LeadForm.tsx');
  assert.ok(form.includes("useEffect(() => { if (state === 'error') summary.current?.focus(); }, [state])"));
  assert.ok(form.includes('ref={summary} role="alert" data-kind="error" tabIndex={-1}'));
  assert.ok(read('components/conversion/conversion.module.css').includes('.formBanner:focus-visible { outline: 3px solid'));
});
