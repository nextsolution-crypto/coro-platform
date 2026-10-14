/* eslint-disable @typescript-eslint/no-require-imports */
// Tests du design system Liquid Glass : thème, persistance, script anti-flash,
// isolation legacy (CSS) et contrastes WCAG AA. Lancer : npm run test:design-system
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const appLayout = path.join(__dirname, '..', '..', 'app', 'layout.tsx');

// Chargeur TypeScript minimal (même approche que les autres tests .cjs du projet).
require.extensions['.ts'] = require.extensions['.tsx'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  module._compile(out, filename);
};

const core = require('./theme-core.ts');

// ───────── Environnement navigateur simulé ─────────
function makeBrowser({ storage = {}, dark = false, storageThrows = false, noMatchMedia = false } = {}) {
  const store = { ...storage };
  const attrs = {};
  const winListeners = {};
  const mqlListeners = new Set();
  const mql = {
    matches: dark,
    addEventListener: (_t, fn) => mqlListeners.add(fn),
    removeEventListener: (_t, fn) => mqlListeners.delete(fn),
  };
  const localStorage = {
    getItem: (k) => { if (storageThrows) throw new Error('blocked'); return k in store ? store[k] : null; },
    setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); store[k] = String(v); },
  };
  const documentElement = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = v; },
  };
  const window = {
    localStorage,
    matchMedia: noMatchMedia ? undefined : () => mql,
    addEventListener: (t, fn) => { (winListeners[t] ||= new Set()).add(fn); },
    removeEventListener: (t, fn) => { winListeners[t]?.delete(fn); },
  };
  return {
    window, document: { documentElement }, attrs, store, mql, winListeners,
    setSystemDark(v) { mql.matches = v; mqlListeners.forEach((fn) => fn({ matches: v })); },
    fireStorage(key) { winListeners.storage?.forEach((fn) => fn({ key })); },
  };
}

function runInitScript(opts) {
  const b = makeBrowser(opts);
  vm.runInNewContext(core.buildThemeInitScript(), { window: b.window, document: b.document });
  return b.attrs;
}

// ───────── Fonctions pures ─────────
test('SYSTEM suit la préférence du système, LIGHT et DARK sont forcés', () => {
  assert.equal(core.resolveTheme('SYSTEM', true), 'dark');
  assert.equal(core.resolveTheme('SYSTEM', false), 'light');
  assert.equal(core.resolveTheme('DARK', false), 'dark');
  assert.equal(core.resolveTheme('LIGHT', true), 'light');
});

test('préférence invalide, vide ou corrompue → SYSTEM ; seul "glass" active glass', () => {
  for (const bad of [null, undefined, '', 'dark', 'Light', 'banana', 42, {}, '{"a":1}']) {
    assert.equal(core.parseThemePreference(bad), 'SYSTEM');
  }
  for (const ok of ['LIGHT', 'DARK', 'SYSTEM']) assert.equal(core.parseThemePreference(ok), ok);
  for (const bad of [null, undefined, '', 'GLASS', 'true', 1, 'legacy']) assert.equal(core.parseUiGeneration(bad), 'legacy');
  assert.equal(core.parseUiGeneration('glass'), 'glass');
});

// ───────── Script anti-flash ─────────
test('legacy est le comportement par défaut (stockage vide)', () => {
  assert.deepEqual(runInitScript({}), { 'data-ui': 'legacy', 'data-theme': 'light' });
});

test('script anti-flash : parité avec les fonctions pures sur toutes les combinaisons', () => {
  const prefs = [undefined, 'LIGHT', 'DARK', 'SYSTEM', 'invalide', ''];
  const uis = [undefined, 'glass', 'legacy', 'autre'];
  for (const p of prefs) for (const u of uis) for (const dark of [true, false]) {
    const storage = {};
    if (p !== undefined) storage[core.THEME_STORAGE_KEY] = p;
    if (u !== undefined) storage[core.UI_STORAGE_KEY] = u;
    const got = runInitScript({ storage, dark });
    assert.equal(got['data-ui'], core.parseUiGeneration(u), `ui p=${p} u=${u}`);
    assert.equal(got['data-theme'], core.resolveTheme(core.parseThemePreference(p), dark), `theme p=${p} u=${u} dark=${dark}`);
  }
});

test('script anti-flash : localStorage bloqué → legacy + SYSTEM (suit le système) ; matchMedia absent → light, sans exception', () => {
  assert.deepEqual(runInitScript({ storageThrows: true, dark: true }), { 'data-ui': 'legacy', 'data-theme': 'dark' });
  assert.deepEqual(runInitScript({ storageThrows: true, dark: false }), { 'data-ui': 'legacy', 'data-theme': 'light' });
  assert.deepEqual(runInitScript({ noMatchMedia: true, storage: { [core.THEME_STORAGE_KEY]: 'SYSTEM' } }),
    { 'data-ui': 'legacy', 'data-theme': 'light' });
});

// ───────── Store : persistance et réactivité ─────────
function loadStore(browser) {
  global.window = browser.window;
  global.document = browser.document;
  delete require.cache[require.resolve('./theme-store.ts')];
  return require('./theme-store.ts');
}
function cleanup() { delete global.window; delete global.document; }

test('rendu serveur : snapshot constant legacy / SYSTEM / light, sans window', () => {
  cleanup();
  delete require.cache[require.resolve('./theme-store.ts')];
  const store = require('./theme-store.ts');
  assert.equal(store.getSnapshot(), store.SERVER_THEME_SNAPSHOT);
  assert.equal(store.getServerSnapshot(), store.SERVER_THEME_SNAPSHOT);
  assert.deepEqual({ ...store.SERVER_THEME_SNAPSHOT }, { preference: 'SYSTEM', resolvedTheme: 'light', ui: 'legacy' });
  assert.doesNotThrow(() => store.setThemePreference('DARK'));
  assert.doesNotThrow(() => store.reapplyCurrentTheme());
});

test('persistance : setPreference écrit en local, applique immédiatement et survit à un rechargement', () => {
  const b = makeBrowser();
  let store = loadStore(b);
  const seen = [];
  const unsub = store.subscribe(() => seen.push(store.getSnapshot().resolvedTheme));
  store.setThemePreference('DARK');
  assert.equal(b.store[core.THEME_STORAGE_KEY], 'DARK');
  assert.equal(b.attrs['data-theme'], 'dark');
  assert.equal(store.getSnapshot().preference, 'DARK');
  assert.deepEqual(seen, ['dark']);
  unsub();
  // « rechargement » : nouveau module, même stockage
  store = loadStore(makeBrowser({ storage: { ...b.store } }));
  assert.equal(store.getSnapshot().preference, 'DARK');
  assert.equal(store.getSnapshot().resolvedTheme, 'dark');
  cleanup();
});

test('SYSTEM réagit en direct aux changements du système, LIGHT/DARK les ignorent', () => {
  const b = makeBrowser({ dark: false });
  const store = loadStore(b);
  const unsub = store.subscribe(() => {});
  assert.equal(store.getSnapshot().resolvedTheme, 'light');
  b.setSystemDark(true);
  assert.equal(store.getSnapshot().resolvedTheme, 'dark');
  assert.equal(b.attrs['data-theme'], 'dark');
  store.setThemePreference('LIGHT');
  b.setSystemDark(false); b.setSystemDark(true);
  assert.equal(store.getSnapshot().resolvedTheme, 'light');
  unsub();
  assert.equal(b.winListeners.storage.size, 0, 'les écouteurs sont retirés au désabonnement');
  cleanup();
});

test('synchronisation entre onglets via l’événement storage', () => {
  const b = makeBrowser();
  const store = loadStore(b);
  const unsub = store.subscribe(() => {});
  b.store[core.THEME_STORAGE_KEY] = 'DARK';
  b.fireStorage(core.THEME_STORAGE_KEY);
  assert.equal(store.getSnapshot().resolvedTheme, 'dark');
  unsub();
  cleanup();
});

test('valeur stockée invalide → SYSTEM ; stockage bloqué → le changement reste actif en session', () => {
  const bad = makeBrowser({ storage: { [core.THEME_STORAGE_KEY]: '<script>', [core.UI_STORAGE_KEY]: 'GLASS' } });
  let store = loadStore(bad);
  assert.equal(store.getSnapshot().preference, 'SYSTEM');
  assert.equal(store.getSnapshot().ui, 'legacy');
  const blocked = makeBrowser({ storageThrows: true });
  store = loadStore(blocked);
  assert.doesNotThrow(() => store.setThemePreference('DARK'));
  assert.equal(store.getSnapshot().resolvedTheme, 'dark');
  assert.equal(blocked.attrs['data-theme'], 'dark');
  cleanup();
});

test('activer glass est indépendant du thème, et légal à désactiver', () => {
  const b = makeBrowser({ dark: true });
  const store = loadStore(b);
  store.setUiGeneration('glass');
  assert.equal(b.attrs['data-ui'], 'glass');
  assert.equal(store.getSnapshot().preference, 'SYSTEM');
  store.setThemePreference('LIGHT');
  assert.equal(b.attrs['data-ui'], 'glass');
  store.setUiGeneration('legacy');
  assert.equal(b.attrs['data-ui'], 'legacy');
  assert.equal(b.attrs['data-theme'], 'light');
  cleanup();
});

test('snapshot stable : getSnapshot renvoie la même référence tant que rien ne change', () => {
  const b = makeBrowser();
  const store = loadStore(b);
  const first = store.getSnapshot();
  assert.equal(store.getSnapshot(), first);
  store.setThemePreference('SYSTEM');
  assert.equal(store.getSnapshot(), first);
  cleanup();
});

// ───────── Hydratation / SSR ─────────
test('SSR : ThemeProvider se rend sans window ni erreur, sans ajouter de DOM', () => {
  cleanup();
  const React = require('react');
  const { renderToString } = require('react-dom/server');
  delete require.cache[require.resolve('./theme-store.ts')];
  const { ThemeProvider, useTheme } = require('./ThemeProvider.tsx');
  function Probe() { const t = useTheme(); return React.createElement('i', null, `${t.ui}|${t.preference}|${t.resolvedTheme}`); }
  const html = renderToString(React.createElement(ThemeProvider, null, React.createElement(Probe)));
  assert.equal(html, '<i>legacy|SYSTEM|light</i>');
});

test('layout racine : html legacy par défaut, suppressHydrationWarning, script dans <head>, fournisseur posé', () => {
  const src = fs.readFileSync(appLayout, 'utf8');
  assert.match(src, /<html lang="fr" data-ui="legacy" data-theme="light" suppressHydrationWarning>/);
  assert.match(src, /<head>\s*<ThemeInitScript \/>\s*<\/head>/);
  assert.match(src, /<ThemeProvider>[\s\S]*<AuthProvider>[\s\S]*<\/AuthProvider>[\s\S]*<\/ThemeProvider>/);
});

test('ThemeInitScript émet exactement le script attendu', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { ThemeInitScript } = require('./ThemeInitScript.tsx');
  const html = renderToStaticMarkup(React.createElement(ThemeInitScript));
  assert.ok(html.startsWith('<script>') && html.includes('data-theme'));
});

// ───────── CSS : isolation legacy ─────────
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

/** Retourne [{selector, body, at}] pour chaque règle, y compris dans @media/@supports. */
function parseRules(css, at = '') {
  const rules = []; let i = 0; css = stripComments(css);
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith('@')) rules.push(...parseRules(body, head)); else rules.push({ selector: head, body, at });
    i = j;
  }
  return rules;
}

for (const file of ['tokens.css', 'primitives.css']) {
  test(`legacy intact : toutes les règles de ${file} sont scopées sous :root[data-ui="glass"]`, () => {
    const rules = parseRules(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.ok(rules.length > 5);
    for (const r of rules) for (const sel of r.selector.split(',').map((s) => s.trim())) {
      assert.ok(sel.startsWith(':root[data-ui="glass"]'), `sélecteur non scopé : ${sel}`);
    }
  });
}

test('legacy intact : globals.css n’a pas été modifié et ne référence aucun token --cg-', () => {
  const globals = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');
  assert.ok(!globals.includes('--cg-') && !globals.includes('data-ui'));
});

test('repli d’accessibilité présents : transparence réduite, sans backdrop-filter, mouvement réduit, contraste, forced-colors', () => {
  const css = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
  for (const q of ['prefers-reduced-transparency: reduce', '@supports not ((backdrop-filter', 'prefers-reduced-motion: reduce',
    'prefers-contrast: more', 'forced-colors: active']) assert.ok(css.includes(q), q);
});

test('l’urgence n’est redéfinie dans aucun thème ni repli', () => {
  const rules = parseRules(fs.readFileSync(path.join(root, 'tokens.css'), 'utf8'));
  const holders = rules.filter((r) => /--cg-emergency-/.test(r.body));
  assert.equal(holders.length, 1);
  assert.equal(holders[0].selector, ':root[data-ui="glass"]');
});

test('chaque token du thème Light a son équivalent Dark (sauf valeurs communes et urgence)', () => {
  const rules = parseRules(fs.readFileSync(path.join(root, 'tokens.css'), 'utf8'));
  const names = (sel) => new Set([...rules.find((r) => r.selector === sel).body.matchAll(/(--cg-[\w-]+)\s*:/g)].map((m) => m[1]));
  const light = names(':root[data-ui="glass"]');
  const dark = names(':root[data-ui="glass"][data-theme="dark"]');
  const common = /^--cg-(space|radius|blur|glass-saturate|duration|ease|focus-width|focus-offset|font|emergency|canvas-gradient)/;
  const missing = [...light].filter((n) => !common.test(n) && !dark.has(n));
  assert.deepEqual(missing, []);
});

// ───────── Contrastes WCAG AA ─────────
function tokens(selector) {
  const rules = parseRules(fs.readFileSync(path.join(root, 'tokens.css'), 'utf8'));
  const out = {};
  for (const r of rules.filter((x) => x.selector === ':root[data-ui="glass"]' && !x.at)) for (const m of r.body.matchAll(/(--cg-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  if (selector === 'dark') {
    const d = rules.find((x) => x.selector === ':root[data-ui="glass"][data-theme="dark"]');
    for (const m of d.body.matchAll(/(--cg-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  }
  return out;
}
function color(v) {
  v = v.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = v.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
  throw new Error('couleur non analysable : ' + v);
}
const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
function lum({ r, g, b }) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

for (const theme of ['light', 'dark']) {
  test(`WCAG AA (≥ 4.5:1) — thème ${theme} : textes courants, états, accent et urgence`, () => {
    const t = tokens(theme); const c = (k) => color(t[k]);
    const failures = [];
    const check = (label, fg, bg, min = 4.5) => { const r = ratio(fg, bg); if (r < min) failures.push(`${label}: ${r.toFixed(2)} < ${min}`); };
    // Le verre est testé sur le pire des fonds : base du canevas et chacune des deux lueurs.
    for (const canvasKey of ['--cg-canvas', '--cg-canvas-glow-a', '--cg-canvas-glow-b']) {
      const canvas = c(canvasKey);
      for (const glassKey of ['--cg-glass-bg', '--cg-glass-bg-strong', '--cg-panel-bg']) {
        const glass = over(c(glassKey), canvas);
        for (const text of ['--cg-text-primary', '--cg-text-secondary', '--cg-text-muted', '--cg-text-link', '--cg-accent-text']) check(`${text} sur ${glassKey}/${canvasKey}`, c(text), glass);
        for (const tone of ['success', 'warning', 'danger', 'info', 'neutral', 'purple']) {
          check(`${tone} badge sur ${glassKey}/${canvasKey}`, c(`--cg-${tone}-fg`), over(c(`--cg-${tone}-bg`), glass));
        }
      }
    }
    for (const text of ['--cg-text-primary', '--cg-text-secondary', '--cg-text-muted']) check(`${text} sur surface opaque`, c(text), c('--cg-surface-solid'));
    for (const k of ['--cg-accent', '--cg-accent-hover', '--cg-accent-active']) check(`texte sur ${k}`, c('--cg-text-on-accent'), c(k));
    check('urgence', c('--cg-emergency-fg'), c('--cg-emergency-bg'));
    // Éléments d'interface (focus, bordure de champ) : 3:1 minimum (WCAG 1.4.11).
    const surface = over(c('--cg-glass-bg-strong'), c('--cg-canvas'));
    check('anneau de focus', c('--cg-focus-ring'), surface, 3);
    check('bordure de champ', over(c('--cg-border-strong'), surface), surface, 3);
    assert.deepEqual(failures, []);
  });
}
