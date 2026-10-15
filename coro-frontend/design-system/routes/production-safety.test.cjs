/* eslint-disable @typescript-eslint/no-require-imports */
// Sécurité production : route /glass-kit, outils de test, routes bêta. Voir aussi tools/production-check.cjs
// (build et serveur de production réels).
require('../test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const { ROUTE_REGISTRY } = require('./route-registry.ts');
const matcher = require('./route-matcher.ts');
const core = require('../theme/theme-core.ts');
const scanner = require('../tools/route-scanner.cjs');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ───────── Route /glass-kit absente d'un build de production ─────────
function loadNextConfig(nodeEnv) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    const file = path.join(ROOT, 'next.config.ts');
    delete require.cache[file];
    return require(file).default;
  } finally {
    process.env.NODE_ENV = previous;
    delete require.cache[path.join(ROOT, 'next.config.ts')];
  }
}

test('next.config : l’extension dev.tsx n’est reconnue qu’hors production', () => {
  const prod = loadNextConfig('production');
  const dev = loadNextConfig('development');
  assert.deepEqual(prod.pageExtensions, ['tsx', 'ts', 'jsx', 'js'], 'production : extensions par défaut uniquement');
  assert.ok(dev.pageExtensions.includes('dev.tsx'), 'développement : dev.tsx reconnu');
  assert.ok(!prod.pageExtensions.some((e) => e.startsWith('dev')), 'aucune extension de développement en production');
  assert.equal(prod.output, 'standalone', 'configuration de production inchangée');
});

test('seules les pages page.dev.tsx sont des routes d’outillage, et il n’y en a qu’une : /glass-kit', () => {
  const devPages = scanner.entryPoints().filter((p) => /\.dev\.(tsx|ts|jsx|js)$/.test(p)).map(rel);
  assert.deepEqual(devPages, ['app/glass-kit/page.dev.tsx']);
  const flagged = scanner.scanRoutes().filter((r) => r.devOnly).map((r) => r.pattern);
  assert.deepEqual(flagged, ['/glass-kit']);
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.devOnly).map((e) => e.pattern), ['/glass-kit']);
});

test('la page /glass-kit se protège elle-même (second niveau) et ne dépend que d’un garde NODE_ENV', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app', 'glass-kit', 'page.dev.tsx'), 'utf8');
  assert.match(src, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'app', 'glass-kit', 'page.tsx')), 'page.tsx ne doit pas exister (elle serait routée en production)');
});

test('en production, /glass-kit est une route inconnue : document Legacy, sans entrée de registre', () => {
  const r = matcher.resolveRoute('/glass-kit', { production: true });
  assert.equal(r.entry, null); assert.equal(r.mode, 'legacy');
  assert.equal(matcher.isShellRoute('/glass-kit', { production: true }), false);
  assert.equal(matcher.resolveRoute('/glass-kit').mode, 'glass', 'en développement : disponible');
  const table = matcher.shellTable({ production: true });
  assert.ok(!table.some(([source]) => new RegExp(source).test('/glass-kit')), 'absente de la table du script anti-flash en production');
});

// ───────── Outils de test jamais chargés par la production ─────────
const FORBIDDEN = [/^design-system\/bench\//, /^design-system\/tools\//, /^design-system\/dev\//, /^design-system\/test-loader/, /\.test\.(cjs|mjs|js|ts|tsx)$/, /mock-api/];

test('aucun point d’entrée de production n’atteint le banc, le faux API, les outils, le terrain d’essai ou un test', () => {
  const entries = scanner.entryPoints().filter((p) => !/\.dev\.(tsx|ts|jsx|js)$/.test(p));
  assert.ok(entries.length >= 80, 'points d’entrée trouvés : ' + entries.length);
  const leaks = [];
  for (const entry of entries) {
    for (const file of scanner.reachableFiles(entry)) if (FORBIDDEN.some((re) => re.test(file))) leaks.push(`${rel(entry)} → ${file}`);
  }
  assert.deepEqual(leaks, []);
});

test('seul le point d’entrée de développement atteint le terrain d’essai', () => {
  const reach = scanner.reachableFiles(path.join(ROOT, 'app', 'glass-kit', 'page.dev.tsx'));
  assert.ok(reach.includes('design-system/dev/GlassKitPlayground.tsx'));
  assert.ok(!reach.some((f) => /bench|mock-api|tools\//.test(f)), 'le terrain d’essai ne charge ni banc ni faux API');
});

test('scripts npm : build, start et dev ne mentionnent ni banc ni faux API ; ceux du banc sont des scripts glass:*', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  for (const name of ['build', 'start', 'dev']) assert.ok(!/bench|mock|glass/i.test(scripts[name]), `${name} : ${scripts[name]}`);
  for (const [name, cmd] of Object.entries(scripts)) if (/bench|mock-api/.test(cmd)) assert.ok(name.startsWith('glass:') || name === 'test:design-system', name);
});

test('le faux API et le banc sont signalés comme outils de test non destinés à la production', () => {
  const mock = fs.readFileSync(path.join(ROOT, 'design-system', 'bench', 'mock-api.cjs'), 'utf8');
  assert.match(mock, /OUTIL DE TEST UNIQUEMENT/);
  assert.match(fs.readFileSync(path.join(ROOT, 'design-system', 'bench', 'README.md'), 'utf8'), /Outil de développement/);
});

// ───────── Routes bêta : désactivées par défaut en production, aucune activation accidentelle ─────────
test('bêta : développement → clé locale « on » ou NEXT_PUBLIC_GLASS_BETA=1', () => {
  assert.equal(core.resolveBetaEnabled({ production: false, envValue: undefined, storageValue: null }), false, 'désactivée par défaut');
  assert.equal(core.resolveBetaEnabled({ production: false, storageValue: 'on' }), true);
  assert.equal(core.resolveBetaEnabled({ production: false, envValue: '1' }), true);
  assert.equal(core.resolveBetaEnabled({ production: false, storageValue: 'oui' }), false);
});

test('bêta : production → désactivée par défaut ; ni le stockage local, ni « 1 », ni « true » ne l’activent', () => {
  assert.equal(core.resolveBetaEnabled({ production: true }), false);
  for (const accidental of ['1', 'true', 'on', 'yes', 'TRUE', 'production', ' production-preview', 'production-preview ', '']) {
    assert.equal(core.resolveBetaEnabled({ production: true, envValue: accidental }), false, `valeur accidentelle « ${accidental} »`);
  }
  assert.equal(core.resolveBetaEnabled({ production: true, storageValue: 'on' }), false, 'le stockage local d’un utilisateur ne compte jamais');
  assert.equal(core.resolveBetaEnabled({ production: true, envValue: 'production-preview', storageValue: null }), true, 'seul le jeton exact, volontaire, active');
  assert.equal(core.GLASS_BETA_PRODUCTION_TOKEN, 'production-preview');
});

test('bêta de bout en bout (store en production) : route bêta en îlot Legacy tant que le jeton exact est absent', () => {
  const storeFile = path.join(__dirname, '..', 'theme', 'theme-store.ts');
  const betaEntry = { pattern: '/zz-beta', family: 'work', shell: 'app', status: 'beta', styling: ['none'] };
  const results = {};
  const saved = { env: process.env.NODE_ENV, flag: process.env.NEXT_PUBLIC_GLASS_BETA, win: global.window };
  try {
    for (const [label, envFlag] of [['aucun drapeau', undefined], ['drapeau 1', '1'], ['jeton exact', 'production-preview']]) {
      process.env.NODE_ENV = 'production';
      if (envFlag === undefined) delete process.env.NEXT_PUBLIC_GLASS_BETA; else process.env.NEXT_PUBLIC_GLASS_BETA = envFlag;
      global.window = { localStorage: { getItem: (k) => (k === 'coro-glass-beta' ? 'on' : null) } }; // l'utilisateur a posé la clé locale
      delete require.cache[storeFile];
      const store = require(storeFile);
      const mode = matcher.resolveRoute('/zz-beta', { entries: [betaEntry], production: true, betaEnabled: store.isBetaEnabled() }).mode;
      results[label] = mode;
    }
  } finally {
    process.env.NODE_ENV = saved.env;
    if (saved.flag === undefined) delete process.env.NEXT_PUBLIC_GLASS_BETA; else process.env.NEXT_PUBLIC_GLASS_BETA = saved.flag;
    global.window = saved.win;
    delete require.cache[storeFile];
  }
  assert.deepEqual(results, { 'aucun drapeau': 'island', 'drapeau 1': 'island', 'jeton exact': 'glass' });
});

test('/settings (seule route bêta) : îlot Legacy en production par défaut, Glass seulement avec activation explicite', () => {
  const prod = { production: true };
  assert.equal(matcher.resolveRoute('/settings', prod).mode, 'island', 'production, sans activation');
  assert.equal(matcher.resolveRoute('/settings', { ...prod, betaEnabled: core.resolveBetaEnabled({ production: true, envValue: '1', storageValue: 'on' }) }).mode, 'island', 'production, activation accidentelle (1 + stockage local)');
  assert.equal(matcher.resolveRoute('/settings', { ...prod, betaEnabled: core.resolveBetaEnabled({ production: true, envValue: 'production-preview' }) }).mode, 'glass', 'production, jeton exact');
  assert.equal(matcher.resolveRoute('/settings', { betaEnabled: core.resolveBetaEnabled({ production: false, storageValue: 'on' }) }).mode, 'glass', 'développement, clé locale');
  assert.equal(matcher.resolveRoute('/settings').mode, 'island', 'développement, sans activation');
  // /activities/portfolio : même règle (bêta, île par défaut, Glass seulement avec activation explicite).
  assert.equal(matcher.resolveRoute('/activities/portfolio', prod).mode, 'island');
  assert.equal(matcher.resolveRoute('/activities/portfolio', { ...prod, betaEnabled: core.resolveBetaEnabled({ production: true, envValue: 'true', storageValue: 'on' }) }).mode, 'island', 'activation accidentelle');
  assert.equal(matcher.resolveRoute('/activities/portfolio', { ...prod, betaEnabled: core.resolveBetaEnabled({ production: true, envValue: 'production-preview' }) }).mode, 'glass');
  // Ses sous-pages ne sont PAS migrées : elles restent en îlot, bêta activée ou non.
  for (const sub of ['/settings/users', '/settings/organization', '/settings/task-templates', '/settings/profile']) {
    const r = matcher.resolveRoute(sub, { betaEnabled: true });
    assert.notEqual(r.mode, 'glass', sub);
  }
});

test('registre : aucune route bêta ni ga en dehors des listes validées ; routes inconnues restent Legacy', () => {
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta').map((e) => e.pattern).sort(), ['/activities/portfolio', '/settings']);
  for (const p of ['/nouveau-lot', '/projects/1/inconnu', '/admin/zzz']) assert.equal(matcher.resolveRoute(p, { production: true, betaEnabled: true }).mode, 'legacy', p);
});
