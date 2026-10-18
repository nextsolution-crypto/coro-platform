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
// Écrans Glass NATIFS en bêta (réécrits pour le Glass). Les écrans re-teintés (`render: 'skin'`) ne figurent pas ici : voir plus bas.
const BETA_ALLOWLIST = ['/activities/portfolio', '/settings'];
// Routes qu'aucune migration V2 ne peut activer sans décision Founder distincte (exception de sécurité documentée).
const NEVER_MIGRATED = ['/admin/platform-permission-grants'];
const SENSITIVE_KINDS = ['emergency-content', 'documents', 'financial-legal', 'auth', 'permissions'];
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));

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

test('statuts : seules les routes validées sont ga ; la bêta native est figée ; la bêta re-teintée est explicite', () => {
  const ga = ROUTE_REGISTRY.filter((e) => e.status === 'ga').map((e) => e.pattern).sort();
  assert.deepEqual(ga, [...GA_ALLOWLIST].sort());
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta' && !e.render).map((e) => e.pattern).sort(), BETA_ALLOWLIST);
  for (const e of ROUTE_REGISTRY) assert.ok(['legacy-only', 'beta', 'ga'].includes(e.status));
  for (const e of ROUTE_REGISTRY) assert.ok(e.render === undefined || e.render === 'skin', `${e.pattern} : render inconnu`);
  // `render: 'skin'` n'a de sens qu'en bêta (jamais GA tant que la validation de version privée n'a pas eu lieu).
  for (const e of ROUTE_REGISTRY.filter((x) => x.render)) assert.equal(e.status, 'beta', `${e.pattern} : un écran re-teinté est bêta`);
});

test('routes sensibles : jamais ga ; bêta seulement re-teintée, avec tests de validation nommés et existants (décision Founder, mandat 49)', () => {
  for (const e of ROUTE_REGISTRY) {
    const kinds = (e.sensitivity || []).filter((s) => SENSITIVE_KINDS.includes(s));
    if (!kinds.length) continue;
    assert.notEqual(e.status, 'ga', `${e.pattern} est sensible : jamais ga`);
    if (e.status === 'legacy-only') continue;
    // Bêta : uniquement la migration V2 « skin » (le contenu métier n'est pas réécrit) et seulement si des tests la valident.
    assert.equal(e.render, 'skin', `${e.pattern} : une route sensible en bêta doit être re-teintée (render: 'skin'), pas réécrite`);
    assert.ok(Array.isArray(e.validation) && e.validation.length > 0, `${e.pattern} : liste « validation » obligatoire`);
    for (const script of e.validation) assert.ok(pkg.scripts[script], `${e.pattern} : script de validation inexistant « ${script} »`);
  }
});

test('exceptions de sécurité : aucune route à exception ni NEVER_MIGRATED n’est activée', () => {
  for (const p of NEVER_MIGRATED) {
    const e = byPattern.get(p);
    assert.ok(e, p); assert.equal(e.status, 'legacy-only', p); assert.equal(e.render, undefined, p);
  }
  for (const e of ROUTE_REGISTRY.filter((x) => x.exception)) assert.equal(e.status, 'legacy-only', e.pattern);
});

test('les écrans re-teintés sans shell sont des écrans plein écran connus (mode canvas) ; les routes à shell restent en mode skin', () => {
  const entries = [
    { pattern: '/s', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['none'] },
    { pattern: '/c', family: 'auth', shell: 'none', status: 'beta', render: 'skin', styling: ['none'] },
    { pattern: '/n', family: 'auth', shell: 'none', status: 'beta', styling: ['none'] },
  ];
  assert.equal(matcher.resolveRoute('/s', { entries }).mode, 'island');
  assert.equal(matcher.resolveRoute('/s', { entries, betaEnabled: true }).mode, 'skin');
  assert.equal(matcher.resolveRoute('/c', { entries }).mode, 'legacy');
  assert.equal(matcher.resolveRoute('/c', { entries, betaEnabled: false }).mode, 'legacy');
  assert.equal(matcher.resolveRoute('/c', { entries, betaEnabled: true }).mode, 'canvas');
  // Sans re-teinte, un écran sans shell reste Legacy même en bêta (rien à rendre en Glass natif).
  assert.equal(matcher.resolveRoute('/n', { entries, betaEnabled: true }).mode, 'legacy');
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
  for (const betaBuild of [false, true]) {
    for (const p of paths) {
      const attrs = {};
      const ctx = {
        window: { localStorage: { getItem: (k) => (k === 'coro-ui-generation' ? 'glass' : null) }, matchMedia: () => ({ matches: false }), location: { pathname: p }, setTimeout: () => 0 },
        document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
      };
      vm.runInNewContext(buildThemeInitScript(table, { betaBuild }), ctx);
      const expected = matcher.isShellRoute(p, { betaEnabled: betaBuild }) ? 'glass' : 'legacy';
      assert.equal(attrs['data-ui'], expected, `${p} (bêta ${betaBuild})`);
    }
  }
});

test('script anti-flash : la clé locale de bêta n’active les écrans plein écran qu’en développement, jamais en production', () => {
  const entries = [{ pattern: '/c', family: 'auth', shell: 'none', status: 'beta', render: 'skin', styling: ['none'] }];
  const table = matcher.shellTable({ entries });
  const run = (options, storage) => {
    const attrs = {};
    vm.runInNewContext(buildThemeInitScript(table, options), {
      window: { localStorage: { getItem: (k) => (k === 'coro-ui-generation' ? 'glass' : k === 'coro-glass-beta' ? storage : null) }, matchMedia: () => ({ matches: false }), location: { pathname: '/c' }, setTimeout: () => 0 },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    });
    return attrs['data-ui'];
  };
  assert.equal(run({ betaBuild: false, storageBeta: false }, 'on'), 'legacy', 'production : la clé locale ne doit rien activer');
  assert.equal(run({ betaBuild: false, storageBeta: true }, 'on'), 'glass', 'développement : clé locale active');
  assert.equal(run({ betaBuild: false, storageBeta: true }, null), 'legacy');
  assert.equal(run({ betaBuild: true, storageBeta: false }, null), 'glass', 'jeton de build');
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

test('exception de sécurité : /admin/platform-permission-grants reste legacy-only, documentée, jamais bêta ni GA', () => {
  const e = byPattern.get('/admin/platform-permission-grants');
  assert.ok(e, 'route absente du registre');
  assert.equal(e.status, 'legacy-only');
  assert.ok(e.sensitivity.includes('permissions'));
  assert.ok(typeof e.exception === 'string' && e.exception.length > 100, 'exception non documentée');
  for (const word of ['Founder', 'ORGANIZATION', 'GLOBAL', 'révocation', 'provenance', 'ADMIN clients', 'bêta ni GA']) assert.ok(e.exception.includes(word), 'exception : mot manquant « ' + word + ' »');
  assert.ok(!BETA_ALLOWLIST.includes(e.pattern) && !GA_ALLOWLIST.includes(e.pattern), 'une route sensible ne peut figurer dans aucune liste d’activation');
  // Toute route portant une exception doit rester legacy-only.
  for (const x of ROUTE_REGISTRY.filter((r) => r.exception)) assert.equal(x.status, 'legacy-only', x.pattern);
});
