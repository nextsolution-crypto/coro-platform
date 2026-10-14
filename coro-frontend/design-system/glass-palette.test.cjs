/* eslint-disable @typescript-eslint/no-require-imports */
// Tests Phase 04 : la palette de transition ne doit RIEN changer en Legacy et ne référencer
// que des tokens existants. Lancer : npm run test:design-system
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(out, filename);
};

const { createPalette, GLASS_PALETTE_MAPS } = require('./glass-palette.ts');
const frontend = path.join(__dirname, '..');
const tokensCss = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8');

const allHex = Object.values(GLASS_PALETTE_MAPS).flatMap((m) => Object.keys(m));

test('Legacy : la palette renvoie chaque couleur telle quelle (identité stricte)', () => {
  const p = createPalette(false);
  assert.equal(p.glass, false);
  for (const hex of [...allHex, '#123456', 'transparent', 'rgba(0,0,0,0.1)']) {
    assert.equal(p.text(hex), hex);
    assert.equal(p.bg(hex), hex);
    assert.equal(p.line(hex), hex);
    assert.equal(p.panel(hex), hex);
  }
});

test('Glass : les couleurs connues deviennent des tokens, les inconnues restent inchangées', () => {
  const p = createPalette(true);
  assert.equal(p.glass, true);
  assert.equal(p.text('#2c3e50'), 'var(--cg-text-primary)');
  assert.equal(p.bg('#FFFFFF'), 'var(--cg-glass-bg)');
  assert.equal(p.line('#DEE2E6'), 'var(--cg-border-default)');
  assert.equal(p.text('#123456'), '#123456');
  assert.equal(p.bg('transparent'), 'transparent');
});

test('Glass : chaque token référencé existe dans tokens.css', () => {
  const used = new Set();
  for (const map of Object.values(GLASS_PALETTE_MAPS)) for (const v of Object.values(map)) used.add(v.match(/--cg-[\w-]+/)[0]);
  for (const name of used) assert.ok(new RegExp(`${name}\\s*:`).test(tokensCss), `token manquant : ${name}`);
});

// Garde-fou Legacy : aucune couleur d'origine ne doit avoir disparu des écrans migrés.
const hexCount = (src) => {
  const counts = {};
  for (const m of src.matchAll(/#[0-9A-Fa-f]{6}\b/g)) counts[m[0].toUpperCase()] = (counts[m[0].toUpperCase()] || 0) + 1;
  return counts;
};
for (const rel of ['components/layout/AppLayout.tsx', 'app/dashboard/page.tsx', 'app/profile/page.tsx']) {
  test(`Legacy : ${rel} conserve toutes ses couleurs d'origine (comparaison avec HEAD)`, () => {
    const head = execSync(`git show HEAD:coro-frontend/${rel}`, { cwd: frontend, encoding: 'utf8', maxBuffer: 1 << 24 });
    const now = fs.readFileSync(path.join(frontend, rel), 'utf8');
    const before = hexCount(head);
    const after = hexCount(now);
    for (const [hex, n] of Object.entries(before)) {
      assert.ok((after[hex] || 0) >= n, `${rel} : ${hex} ${n} → ${after[hex] || 0}`);
    }
  });
  test(`Legacy : ${rel} n'utilise les classes cg-* que sous condition glass`, () => {
    const now = fs.readFileSync(path.join(frontend, rel), 'utf8');
    for (const line of now.split('\n')) {
      if (!/cg-(glass|panel|canvas|input|chrome|lift|cta|btn|pill-solid)/.test(line)) continue;
      assert.ok(/glass|gc\b/.test(line), `${rel} : classe cg-* non conditionnelle : ${line.trim()}`);
    }
  });
}

// ───────── Phase 04B ─────────
test('panneaux flottants : opacité 94–99 % en Light et en Dark, flou conservé', () => {
  const alphas = [...tokensCss.matchAll(/--cg-panel-bg:\s*rgba\([^)]*,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
  assert.equal(alphas.length, 2, 'un --cg-panel-bg Light et un Dark');
  for (const a of alphas) assert.ok(a >= 0.94 && a <= 0.99, 'opacité hors plage : ' + a);
  const primitives = fs.readFileSync(path.join(__dirname, 'primitives.css'), 'utf8');
  const panel = primitives.match(/\.cg-panel \{[^}]*\}/)[0];
  assert.ok(panel.includes('var(--cg-panel-bg)') && panel.includes('backdrop-filter'));
  assert.equal(createPalette(true).panel('#FFFFFF'), 'var(--cg-panel-bg)');
});

test('anti-flash : page masquée en Glass seulement, révélée par ThemeProvider ou par le repli du script', () => {
  const m = tokensCss.match(/:root\[data-ui="glass"\]:not\(\[data-ui-ready\]\) body \{[^}]*\}/);
  assert.ok(m && m[0].includes('visibility: hidden'), 'règle de masquage absente');
  const provider = fs.readFileSync(path.join(__dirname, 'theme', 'ThemeProvider.tsx'), 'utf8');
  assert.ok(provider.includes("'data-ui-ready'") && provider.includes('snapshot.ui === getSnapshot().ui'));
  const core = fs.readFileSync(path.join(__dirname, 'theme', 'theme-core.ts'), 'utf8');
  assert.ok(core.includes("u==='glass'") && core.includes('data-ui-ready') && core.includes('2000'), 'repli 2 s absent du script');
});

// ───────── Phase 04D : icônes Lucide et tiroir mobile ─────────
const layoutSrc = fs.readFileSync(path.join(frontend, 'components/layout/AppLayout.tsx'), 'utf8');
const iconsSrc = fs.readFileSync(path.join(__dirname, 'glass-icons.tsx'), 'utf8');

test('icônes : chaque route de navigation a une icône Lucide Glass', () => {
  const navPaths = [...layoutSrc.slice(0, layoutSrc.indexOf('export default function AppLayout')).matchAll(/path: '(\/[^']*)'/g)].map((m) => m[1]);
  assert.ok(navPaths.length > 40, 'routes de navigation introuvables');
  const mapped = new Set([...iconsSrc.matchAll(/^\s+'(\/[^']*)':/gm)].map((m) => m[1]));
  const missing = [...new Set(navPaths)].filter((r) => !mapped.has(r));
  assert.deepEqual(missing, []);
});

test('Legacy : les emojis de navigation, routes et libellés sont identiques à HEAD', () => {
  const head = execSync('git show HEAD:coro-frontend/components/layout/AppLayout.tsx', { cwd: frontend, encoding: 'utf8', maxBuffer: 1 << 24 });
  const cut = (src) => src.slice(0, src.indexOf('export default function AppLayout'));
  const items = (src) => [...cut(src).matchAll(/\{ label: '([^']*)',\s*path: '([^']*)',\s*icon: '([^']*)'/g)].map((m) => m.slice(1).join('|'));
  assert.ok(items(head).length > 40);
  assert.deepEqual(items(layoutSrc), items(head));
});

test('icônes : Lucide n’est rendu qu’en Glass, les emojis restent la branche Legacy', () => {
  assert.ok(layoutSrc.includes("glass ? <GlassNavIcon path={item.path} /> : <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>"));
  assert.ok(layoutSrc.includes("glass ? <GlassIcon name=\"bell\" size={20} /> : <span style={{ fontSize: '18px' }}>🔔</span>"));
  assert.ok(layoutSrc.includes("(sidebarOpen ? '×' : '☰')") && layoutSrc.includes("'🔍'") && layoutSrc.includes(": '▼'"));
  assert.ok(!/<(User|Timer|BarChart3)\b/.test(layoutSrc.replace(/glass \? <span[^]*?item\.text<\/span> : item\.label/, '')), 'icône Lucide hors branche Glass');
});

test('tiroir : attributs ARIA, inert et focus uniquement en Glass', () => {
  assert.ok(/\{\.\.\.\(glass \? \{\s*id: 'coro-sidebar'/.test(layoutSrc));
  assert.ok(layoutSrc.includes("aria-controls={glass ? 'coro-sidebar' : undefined}"));
  assert.ok(layoutSrc.includes("inert={drawerOpen ? true : undefined}"));
  assert.ok(layoutSrc.includes("const drawerMode = glass && !isDesktop;"));
  assert.ok(layoutSrc.includes("e.key === 'Escape'") && layoutSrc.includes('toggleRef.current?.focus()'));
  assert.ok(layoutSrc.includes("html.style.overflow = 'hidden'"));
  assert.ok(layoutSrc.includes("tabIndex={glass ? -1 : undefined}") && layoutSrc.includes("aria-hidden={glass ? true : undefined}"));
});

test('cibles tactiles : 44 px sur mobile en Glass, sans effet sur desktop ni Legacy', () => {
  assert.equal((layoutSrc.match(/min-h-\[44px\]/g) || []).length >= 3, true);
  for (const m of layoutSrc.matchAll(/\$\{glass \? '([^']*min-h-\[44px\][^']*)'/g)) assert.ok(/lg:min-h-0/.test(m[1]), 'min-h sans reset lg : ' + m[1]);
});
