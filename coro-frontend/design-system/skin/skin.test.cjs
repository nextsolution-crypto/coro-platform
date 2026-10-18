/* eslint-disable @typescript-eslint/no-require-imports */
// Couche de teinte Liquid Glass : feuille générée à jour, inerte hors modes skin/canvas, sans effet d'empilement,
// jamais chargée en Classique, feuilles de document et urgences préservées.
// Lancer : npm run test:skin
require('../test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');

const { build, SCOPE, NOT_PAPER, TARGETS } = require('../tools/build-skin.cjs');
const loader = require('./skin-loader.ts');

const ROOT = path.resolve(__dirname, '..', '..');
const css = build();
const root = postcss.parse(css);

test('feuille générée à jour pour les deux applications (carte → CSS → fichier hashé → SKIN_HREF)', () => {
  for (const t of TARGETS) {
    const pub = path.join(t.dir, 'public');
    const files = fs.readdirSync(pub).filter((n) => /^glass-skin\.[0-9a-f]{10}\.css$/.test(n));
    assert.equal(files.length, 1, `${t.name} : une seule feuille de teinte attendue`);
    // Normalisation des fins de ligne : un extrait Windows (autocrlf) convertit en CRLF, le contenu logique reste identique.
    assert.equal(fs.readFileSync(path.join(pub, files[0]), 'utf8').replace(/\r\n/g, '\n'), css, `${t.name} : feuille obsolète (lancer node design-system/tools/build-skin.cjs)`);
    const asset = fs.readFileSync(path.join(t.dir, 'design-system', 'skin', 'skin-asset.ts'), 'utf8');
    assert.ok(asset.includes(`'/${files[0]}'`), `${t.name} : SKIN_HREF désynchronisé`);
  }
});

test('chaque règle est scopée aux modes skin/canvas (ou aux feuilles de document) : aucun style global', () => {
  let rules = 0;
  root.walkRules((r) => {
    rules++;
    for (const sel of r.selectors) {
      const s = sel.trim();
      const ok = s.startsWith(SCOPE) || s.startsWith(':root[data-ui="glass"][data-cg-mode=') || s.startsWith(':root[data-ui="glass"][data-theme="dark"][data-cg-mode=') || s.startsWith(':root[data-ui="glass"] [data-cg-paper]') || s.startsWith(':root[data-ui="glass"] :is([data-cg-paper], [data-cg-emergency], [data-cg-keep])');
      assert.ok(ok, 'sélecteur non scopé : ' + s.slice(0, 120));
    }
  });
  assert.ok(rules > 40);
});

test('toute règle de teinte épargne les feuilles de document [data-cg-paper]', () => {
  let tinted = 0;
  root.walkRules((r) => {
    const onlyTokens = r.nodes.every((d) => d.type === 'decl' && d.prop.startsWith('--'));
    // body est la racine du document : il ne peut pas se trouver dans une feuille de document.
    if (!onlyTokens && !/ body$/.test(r.selector.trim()) && !r.selector.includes(NOT_PAPER) && !r.selector.includes('[data-cg-paper]') && !r.selector.includes('[data-cg-emergency]') && !r.selector.includes('[data-cg-keep]') && !/::|:focus-visible/.test(r.selector)) {
      assert.fail('règle sans exemption de document : ' + r.selector.slice(0, 100));
    }
    if (r.selector.includes(NOT_PAPER)) tinted++;
  });
  assert.ok(tinted > 30);
});

test('aucune propriété qui crée un contexte d’empilement ou piège les éléments fixes (même contrat que l’îlot Legacy)', () => {
  const forbidden = ['transform', 'filter', 'backdrop-filter', 'isolation', 'z-index', 'overflow', 'contain', 'will-change', 'perspective', 'position', 'mix-blend-mode', 'opacity'];
  root.walkDecls((d) => {
    // Exception précise : `opacity` sur ::placeholder agit sur le pseudo-élément du champ, jamais sur un ancêtre (aucun contexte d'empilement).
    if (d.prop === 'opacity' && d.parent.selector.trim().endsWith('::placeholder')) return;
    assert.ok(!forbidden.includes(d.prop), `propriété interdite « ${d.prop} » dans ${d.parent.selector.slice(0, 80)}`);
  });
});

test('la teinte ne touche jamais les jetons d’urgence ni la couleur de fond rouge pleine', () => {
  assert.ok(!/--cg-emergency/.test(css), 'jetons d’urgence non modifiables par la teinte');
  // Le fond #C0392B (boutons, pastilles, panique) et les verts/bleus/ambre pleins ne sont jamais remappés.
  const bgSelectors = [];
  root.walkRules((r) => { if (r.nodes.some((d) => d.prop === 'background-color')) bgSelectors.push(r.selector); });
  const all = bgSelectors.join('\n');
  for (const hex of ['C0392B', '27AE60', '2980B9', 'F39C12', '8E44AD', 'E74C3C']) {
    assert.ok(!new RegExp('background(-color)?:#' + hex, 'i').test(all), `fond plein #${hex} ne doit pas être remappé`);
  }
});

test('surfaces positionnées (menus, tiroirs, en-têtes collants) et contenu de couche fixe : opaques', () => {
  assert.ok(/--cg-panel-bg/.test(css));
  const rule = [];
  root.walkRules((r) => { if (r.nodes.some((d) => d.prop === 'background-color' && d.value.includes('--cg-panel-bg'))) rule.push(r.selector); });
  assert.equal(rule.length, 1);
  for (const needle of ['position:fixed', 'position: fixed', 'position:absolute', 'position:sticky', '.fixed']) assert.ok(rule[0].includes(needle), needle);
});

test('jetons de teinte définis en Light ET en Dark', () => {
  for (const token of ['--cg-skin-bg-surface', '--cg-skin-bg-fill1', '--cg-skin-bg-fill2', '--cg-skin-bg-navy', '--cg-skin-text-primary', '--cg-skin-border-default']) {
    assert.ok(new RegExp(token + ':').test(css), token);
  }
  assert.ok(/data-theme="dark"\]\[data-cg-mode="skin"\]/.test(css), 'surcharge Dark absente');
});

test('feuille de document : toujours claire, quel que soit le thème', () => {
  assert.ok(/\[data-cg-paper\][^{]*\{[^}]*color-scheme:\s*light/.test(css));
  assert.ok(/\[data-cg-emergency\][^{]*\{[^}]*color-scheme:\s*light/.test(css), 'les surfaces d’urgence gardent aussi leur rendu Classique');
  assert.ok(/\[data-cg-keep\][^{]*\{[^}]*color-scheme:\s*light/.test(css), 'les écrans conçus pour le sombre gardent leur rendu d’origine');
});

test('chargeur : la feuille n’est liée qu’en mode skin/canvas, retirée ensuite, jamais en Classique', async () => {
  assert.equal(loader.skinNeeded('legacy', 'skin'), false);
  assert.equal(loader.skinNeeded('glass', 'glass'), false);
  assert.equal(loader.skinNeeded('glass', 'island'), false);
  assert.equal(loader.skinNeeded('glass', 'skin'), true);
  assert.equal(loader.skinNeeded('glass', 'canvas'), true);
  const nodes = new Map();
  const makeLink = () => {
    const l = { id: '', rel: '', href: '', sheet: null, attrs: {}, listeners: {}, removed: false,
      getAttribute(k) { return k === 'href' ? this.href : null; },
      addEventListener(e, f) { this.listeners[e] = f; }, removeEventListener() {},
      remove() { this.removed = true; nodes.delete(this.id); } };
    return l;
  };
  global.document = {
    head: { appendChild(l) { nodes.set(l.id, l); } },
    createElement: () => makeLink(),
    getElementById: (id) => nodes.get(id) || null,
  };
  try {
    assert.equal(loader.syncSkinStylesheet(false, '/a.css'), null);
    assert.equal(nodes.size, 0, 'Classique : aucune feuille');
    const pending = loader.syncSkinStylesheet(true, '/a.css');
    assert.ok(pending instanceof Promise && nodes.size === 1);
    nodes.get(loader.SKIN_LINK_ID).listeners.load();
    assert.equal(await pending, true, 'feuille chargée');
    assert.equal(loader.syncSkinStylesheet(false, '/a.css'), null);
    assert.equal(nodes.size, 0, 'retirée en quittant une route re-teintée');
    // Échec (fichier absent, hors ligne) : la promesse vaut false → la page repasse en Classique.
    const failing = loader.syncSkinStylesheet(true, '/missing.css');
    nodes.get(loader.SKIN_LINK_ID).listeners.error();
    assert.equal(await failing, false, 'échec de chargement signalé');
    loader.syncSkinStylesheet(false, '/missing.css');
  } finally {
    delete global.document;
  }
});

test('Classique : la feuille n’est référencée par aucun CSS global ni layout ; seul le chargeur la connaît', () => {
  const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8');
  const globals = fs.readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8');
  assert.ok(!/glass-skin|skin\.css|skin-asset/.test(layout + globals));
  const users = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', 'public'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name) && fs.readFileSync(p, 'utf8').includes('skin-asset')) users.push(path.relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  walk(ROOT);
  assert.deepEqual(users.sort(), ['design-system/theme/ThemeProvider.tsx']);
});

test('noyau Glass partagé avec coro-client-portal synchronisé (jetons, thème, routes, chargeur) ; le site vitrine n’en fait pas partie', () => {
  const sync = require('../tools/sync-portal.cjs');
  assert.deepEqual(sync.diff(), [], 'lancer node design-system/tools/sync-portal.cjs');
  assert.ok(!fs.existsSync(path.join(ROOT, '..', 'coro-website', 'design-system')), 'coro-website ne reçoit aucun fichier Glass');
});

test('modules CSS : replis var(--cg-skin-*, #hex) à jour, toujours avec repli, et la valeur de repli est la couleur d’origine', () => {
  const tok = require('../tools/tokenize-css.cjs');
  assert.deepEqual(tok.status(), [], 'modules CSS non reconvertis (lancer node design-system/tools/tokenize-css.cjs)');
  const files = [...tok.TARGETS, ...tok.PARTIAL.map(([f]) => f)];
  let wrapped = 0;
  for (const rel of files) {
    const src = tok.read(rel);
    // Aucune utilisation d'un jeton de teinte sans repli : hors teinte, la couleur Legacy doit s'appliquer.
    assert.ok(!/var\(--cg-skin-[a-z0-9-]+\)/.test(src), `${rel} : var(--cg-skin-*) sans repli`);
    for (const m of src.matchAll(/var\(--cg-skin-(bg|text|border)-([a-z0-9]+),\s*(#[0-9A-Fa-f]{3,6})\)/g)) {
      wrapped++;
      assert.ok(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(m[3]), `${rel} : repli invalide ${m[3]}`);
    }
    // Les jetons génériques --cg-* (définis par tokens.css en Glass natif) ne sont jamais employés par un module CSS : seul --cg-skin-* l'est.
    assert.ok(!/var\(--cg-(?!skin-)/.test(src), `${rel} : jeton --cg-* non préfixé skin dans un module CSS`);
  }
  assert.ok(wrapped > 300, 'conversion attendue sur plusieurs centaines de couleurs : ' + wrapped);
});

test('la teinte ne s’exécute que sous data-ui="glass" : aucune règle ne cible html sans cet attribut', () => {
  root.walkRules((r) => { for (const s of r.selectors) assert.ok(s.includes('data-ui="glass"'), s.slice(0, 100)); });
});

test('zone .cg-skinzone : inactive en Classique et en îlot Legacy, aucune propriété d’empilement, employée par l’éditeur d’horaire', () => {
  const prim = fs.readFileSync(path.join(ROOT, 'design-system', 'primitives.css'), 'utf8');
  const rules = [...prim.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes('.cg-skinzone'));
  assert.ok(rules.length >= 10);
  for (const [, sel, body] of rules) {
    for (const part of sel.split(/,(?![^(]*\))/)) assert.ok(part.trim().startsWith(':root[data-ui="glass"]:not([data-cg-mode="island"]) .cg-skinzone'), 'zone non scopée : ' + part.trim().slice(0, 90));
    for (const forbidden of ['transform', 'filter', 'backdrop-filter', 'z-index', 'position', 'overflow', 'opacity']) assert.ok(!new RegExp('(^|[;\s])' + forbidden + '\s*:').test(body), forbidden);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'components', 'WorkScheduleEditorPanel.tsx'), 'utf8'), /<section className="cg-skinzone /);
});
