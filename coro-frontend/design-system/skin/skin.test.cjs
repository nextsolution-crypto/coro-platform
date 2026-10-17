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
      const ok = s.startsWith(SCOPE) || s.startsWith(':root[data-ui="glass"][data-cg-mode=') || s.startsWith(':root[data-ui="glass"][data-theme="dark"][data-cg-mode=') || s.startsWith(':root[data-ui="glass"] [data-cg-paper]');
      assert.ok(ok, 'sélecteur non scopé : ' + s.slice(0, 120));
    }
  });
  assert.ok(rules > 40);
});

test('toute règle de teinte épargne les feuilles de document [data-cg-paper]', () => {
  let tinted = 0;
  root.walkRules((r) => {
    const onlyTokens = r.nodes.every((d) => d.type === 'decl' && d.prop.startsWith('--'));
    if (!onlyTokens && !r.selector.includes(NOT_PAPER) && !r.selector.includes('[data-cg-paper]') && !/::|:focus-visible/.test(r.selector)) {
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
  for (const token of ['--cg-skin-surface', '--cg-skin-fill-1', '--cg-skin-fill-2', '--cg-skin-navy']) {
    assert.ok(new RegExp(token + ':').test(css), token);
  }
  assert.ok(/data-theme="dark"\]\[data-cg-mode="skin"\]/.test(css), 'surcharge Dark absente');
});

test('feuille de document : toujours claire, quel que soit le thème', () => {
  assert.ok(/\[data-cg-paper\][^{]*\{[^}]*color-scheme:\s*light/.test(css));
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
    await pending;
    assert.equal(loader.syncSkinStylesheet(false, '/a.css'), null);
    assert.equal(nodes.size, 0, 'retirée en quittant une route re-teintée');
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

test('la teinte ne s’exécute que sous data-ui="glass" : aucune règle ne cible html sans cet attribut', () => {
  root.walkRules((r) => { for (const s of r.selectors) assert.ok(s.includes('data-ui="glass"'), s.slice(0, 100)); });
});
