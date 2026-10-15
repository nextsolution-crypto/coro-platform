/* eslint-disable @typescript-eslint/no-require-imports */
// Registre des routes : cohérence avec le code, routes inconnues, bêta, îlots, script anti-flash.
// Lancer : npm run test:design-system
require('../test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ROUTE_REGISTRY } = require('./route-registry.ts');
const matcher = require('./route-matcher.ts');
const { buildThemeInitScript } = require('../theme/theme-core.ts');
const { scanRoutes } = require('../tools/route-scanner.cjs');

const scanned = scanRoutes();
const byPattern = new Map(ROUTE_REGISTRY.map((e) => [e.pattern, e]));

// Routes autorisées à rendre du Glass. Toute activation d'une nouvelle route doit modifier CETTE liste : décision explicite et relue.
const GA_ALLOWLIST = ['/dashboard', '/profile', '/glass-kit'];
const BETA_ALLOWLIST = ['/activities/portfolio', '/profile/rendement', '/settings'];

const sample = (pattern) => pattern.replace(/\[\.\.\.[^\]]+\]/g, 'a/b').replace(/\[[^\]]+\]/g, 'abc123');

test('inventaire canonique : une page = une route, aucun doublon', () => {
  assert.equal(new Set(scanned.map((r) => r.pattern)).size, scanned.length);
  assert.equal(new Set(ROUTE_REGISTRY.map((e) => e.pattern)).size, ROUTE_REGISTRY.length, 'motif en double dans le registre');
  assert.equal(scanned.filter((r) => r.dynamic).length, scanned.filter((r) => r.pattern.includes('[')).length);
});

test('le registre couvre exactement les pages de app/ (rien en trop, rien d’oublié)', () => {
  const a = new Set(scanned.map((r) => r.pattern)); const b = new Set(ROUTE_REGISTRY.map((e) => e.pattern));
  assert.deepEqual([...a].filter((p) => !b.has(p)), [], 'page sans entrée au registre');
  assert.deepEqual([...b].filter((p) => !a.has(p)), [], 'entrée du registre sans page');
});

test('shell, styles et actions destructives du registre = analyse des imports', () => {
  for (const r of scanned) {
    const e = byPattern.get(r.pattern);
    assert.equal(e.shell, r.shell, `${r.pattern} : shell`);
    assert.deepEqual([...e.styling].sort(), [...r.styling].sort(), `${r.pattern} : styles`);
    assert.equal((e.sensitivity || []).includes('destructive'), r.destructive, `${r.pattern} : destructive`);
  }
});

test('statuts : seules les routes validées sont ga ; aucune bêta tant qu’aucun écran n’est prêt', () => {
  const ga = ROUTE_REGISTRY.filter((e) => e.status === 'ga').map((e) => e.pattern).sort();
  assert.deepEqual(ga, [...GA_ALLOWLIST].sort());
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta').map((e) => e.pattern).sort(), BETA_ALLOWLIST);
  for (const e of ROUTE_REGISTRY) assert.ok(['legacy-only', 'beta', 'ga'].includes(e.status));
});

test('routes sensibles : jamais ga ni bêta, et jamais sans validation distincte', () => {
  for (const e of ROUTE_REGISTRY) {
    if ((e.sensitivity || []).some((s) => ['emergency-content', 'documents', 'financial-legal', 'auth'].includes(s))) {
      assert.equal(e.status, 'legacy-only', `${e.pattern} est sensible et doit rester legacy-only`);
    }
  }
});

test('routes inconnues : legacy-only, document entièrement Legacy (aucun shell Glass)', () => {
  for (const p of ['/nouvelle-page', '/projects/abc/inconnu', '/admin/commercial/zzz', '/glass-kit/extra', '/api/x']) {
    const r = matcher.resolveRoute(p);
    assert.equal(r.entry, null, p); assert.equal(r.mode, 'legacy', p); assert.equal(matcher.isShellRoute(p), false, p);
  }
});

test('résolution : statique avant dynamique, requête et barre finale ignorées', () => {
  assert.equal(matcher.findRouteEntry('/projects/42/mandate').pattern, '/projects/[id]/mandate');
  assert.equal(matcher.findRouteEntry('/admin/commercial/proposals/new').pattern, '/admin/commercial/proposals/new');
  assert.equal(matcher.findRouteEntry('/admin/commercial/proposals/xyz').pattern, '/admin/commercial/proposals/[proposalId]');
  assert.equal(matcher.findRouteEntry('/dashboard/?a=1#x').pattern, '/dashboard');
  assert.equal(matcher.findRouteEntry('/').pattern, '/');
  assert.equal(matcher.findRouteEntry('/blog/new').pattern, '/blog/new');
  assert.equal(matcher.findRouteEntry('/blog/9/edit').pattern, '/blog/[id]/edit');
});

test('modes de rendu : ga → glass ; legacy-only → îlot ; sans shell → legacy', () => {
  assert.equal(matcher.resolveRoute('/dashboard').mode, 'glass');
  assert.equal(matcher.resolveRoute('/profile').mode, 'glass');
  assert.equal(matcher.resolveRoute('/projects').mode, 'island');
  assert.equal(matcher.resolveRoute('/profile/rendement').mode, 'island');
  assert.equal(matcher.resolveRoute('/login').mode, 'legacy');
  assert.equal(matcher.resolveRoute('/editor/abc').mode, 'legacy');
  assert.equal(matcher.resolveRoute('/configurator/abc').mode, 'legacy');
});

test('bêta : Glass seulement avec activation explicite ; île sinon ; island:false → bare ; devOnly masqué en production', () => {
  const entries = [
    { pattern: '/b', family: 'work', shell: 'app', status: 'beta', styling: ['none'] },
    { pattern: '/n', family: 'work', shell: 'app', status: 'legacy-only', styling: ['none'], island: false },
    { pattern: '/d', family: 'dev', shell: 'app', status: 'ga', styling: ['none'], devOnly: true },
    { pattern: '/g', family: 'work', shell: 'app', status: 'ga', styling: ['none'] },
  ];
  assert.equal(matcher.resolveRoute('/b', { entries }).mode, 'island');
  assert.equal(matcher.resolveRoute('/b', { entries, betaEnabled: false }).mode, 'island');
  assert.equal(matcher.resolveRoute('/b', { entries, betaEnabled: true }).mode, 'glass');
  assert.equal(matcher.resolveRoute('/n', { entries }).mode, 'bare');
  assert.equal(matcher.resolveRoute('/d', { entries }).mode, 'glass');
  assert.equal(matcher.resolveRoute('/d', { entries, production: true }).mode, 'legacy');
  assert.equal(matcher.resolveRoute('/g', { entries, betaEnabled: true }).mode, 'glass');
});

test('script anti-flash : décision de shell identique à la résolution TypeScript, pour toutes les routes et des inconnues', () => {
  const table = matcher.shellTable();
  const paths = [...ROUTE_REGISTRY.map((e) => sample(e.pattern)), '/inconnue', '/projects/1/zzz', '/dashboard/', '/'];
  for (const p of paths) {
    const attrs = {};
    const ctx = {
      window: { localStorage: { getItem: (k) => (k === 'coro-ui-generation' ? 'glass' : null) }, matchMedia: () => ({ matches: false }), location: { pathname: p }, setTimeout: () => 0 },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    };
    vm.runInNewContext(buildThemeInitScript(table), ctx);
    const expected = matcher.isShellRoute(p) ? 'glass' : 'legacy';
    assert.equal(attrs['data-ui'], expected, p);
  }
});

test('script anti-flash sans table : comportement historique inchangé (préférence appliquée telle quelle)', () => {
  const attrs = {};
  vm.runInNewContext(buildThemeInitScript(), {
    window: { localStorage: { getItem: (k) => (k === 'coro-ui-generation' ? 'glass' : null) }, matchMedia: () => ({ matches: false }) },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
  });
  assert.equal(attrs['data-ui'], 'glass');
});

// ───────── Contrat CSS de l'îlot Legacy ─────────
const primitives = fs.readFileSync(path.join(__dirname, '..', 'primitives.css'), 'utf8');
function ruleBody(css, selectorStart) {
  const i = css.indexOf(selectorStart); if (i < 0) return null;
  const open = css.indexOf('{', i); const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

test('îlot Legacy : aucune propriété qui piège les éléments fixes ou crée un contexte d’empilement', () => {
  const body = ruleBody(primitives, ':root[data-ui="glass"] .cg-legacy-island {');
  assert.ok(body, 'règle .cg-legacy-island absente');
  for (const forbidden of ['transform', 'filter', 'backdrop-filter', 'isolation', 'z-index', 'overflow', 'contain', 'will-change', 'perspective', 'position', 'mix-blend-mode', 'opacity']) {
    assert.ok(!new RegExp('(^|[;\\s])' + forbidden + '\\s*:', 'm').test(body), `.cg-legacy-island ne doit pas définir ${forbidden}`);
  }
  assert.ok(/color-scheme:\s*light/.test(body), 'color-scheme: light attendu');
});

test('îlot Legacy : restaure les variables que le pont Glass redéfinit', () => {
  const body = ruleBody(primitives, ':root[data-ui="glass"] .cg-legacy-island {');
  for (const v of ['--text-primary', '--text-secondary', '--text-muted', '--foreground']) assert.ok(body.includes(v + ':'), v);
});

test('îlot Legacy : sélecteurs limités à l’îlot (aucun style global sur modales, portails ou menus)', () => {
  const bare = primitives.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...bare.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter((s) => s.includes('cg-legacy-island'));
  assert.ok(rules.length >= 1);
  for (const sel of rules) for (const part of sel.split(',').map((s) => s.trim())) {
    assert.ok(part.startsWith(':root[data-ui="glass"] .cg-legacy-island'), 'sélecteur hors îlot : ' + part);
    assert.ok(!/(\[role|\.fixed|dialog|portal|body\s*>)/.test(part), 'cible interdite : ' + part);
  }
});
