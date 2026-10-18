/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Générateur de la couche de teinte Liquid Glass (voir design-system/skin/skin-map.cjs).
 *
 *   node design-system/tools/build-skin.cjs            → écrit les fichiers pour coro-frontend ET coro-client-portal
 *   node design-system/tools/build-skin.cjs --check    → échoue si les fichiers committés ne correspondent pas à la carte
 *
 * Sorties (par application) :
 *   public/glass-skin.<hash>.css           feuille servie statiquement, injectée UNIQUEMENT en mode skin / canvas
 *   design-system/skin/skin-asset.ts       export const SKIN_HREF (chemin hashé)
 *
 * La feuille n'est jamais importée dans le CSS global : en Classique (et sur les routes non migrées) elle n'est pas chargée,
 * donc aucun coût de sélecteurs d'attributs et aucun risque d'effet de bord.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../skin/skin-map.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..');
const TARGETS = [
  { name: 'coro-frontend', dir: path.join(REPO, 'coro-frontend') },
  { name: 'coro-client-portal', dir: path.join(REPO, 'coro-client-portal') },
];

const SCOPE = ':root[data-ui="glass"]:is([data-cg-mode="skin"],[data-cg-mode="canvas"])';
// Zones préservées à l'identique du Classique : feuilles de document ([data-cg-paper]), surfaces d'urgence ([data-cg-emergency]) et écrans
// conçus d'origine pour le sombre — cartes, bornes ([data-cg-keep]) : leurs textes clairs ne doivent pas être réassignés à des surfaces claires.
const NOT_PAPER = ':not([data-cg-paper] *):not([data-cg-emergency] *):not([data-cg-emergency]):not([data-cg-keep] *):not([data-cg-keep])';

const rgb = (h) => `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
const forms = (h) => [`#${h}`, rgb(h)];
const q = (s) => `"${s}"`;

// Deux sérialisations seulement existent : HTML rendu par le serveur (React : « prop:#HEX », sans espace) et DOM construit côté
// client (navigateur : « prop: rgb(r, g, b) », avec espace). Les croisements (hex + espace, rgb sans espace) n'existent pas.
const ssr = (h) => `#${h}`;
const dom = (h) => rgb(h);
const bgSelectors = (h) => [
  `[style*=${q('background:' + ssr(h))} i]`, `[style*=${q('background-color:' + ssr(h))} i]`,
  `[style*=${q('background: ' + dom(h))} i]`, `[style*=${q('background-color: ' + dom(h))} i]`,
];
const textSelectors = (h) => [
  `[style^=${q('color:' + ssr(h))} i]`, `[style*=${q(';color:' + ssr(h))} i]`,
  `[style^=${q('color: ' + dom(h))} i]`, `[style*=${q('; color: ' + dom(h))} i]`,
];
const borderSelectors = (h) => [
  `[style*=${q('solid ' + ssr(h))} i]`, `[style*=${q('border-color:' + ssr(h))} i]`,
  `[style*=${q('solid ' + dom(h))} i]`, `[style*=${q('border-color: ' + dom(h))} i]`,
];

const esc = (cls) => cls.replace(/[:/.[\]#%]/g, (c) => '\\' + c);
const twBg = (names) => names.map((n) => `.bg-${esc(n)}`);
const twText = (names) => names.map((n) => `.text-${esc(n)}`);
const twBorder = (names) => names.map((n) => `.border-${esc(n)}`);
// Valeurs arbitraires Tailwind (text-[#6C757D], bg-[#F8F9FA], border-[#CED4DA]) : sélecteurs d'attribut sur la classe.
const twArbitrary = (prefix, hexes) => hexes.map((h) => `[class*=${q(prefix + '-[#' + h + ']')} i]`);
// Variantes avec opacité (bg-white/70, bg-emerald-50/40) : même rôle que la classe pleine ; jamais pour les voiles sombres (bg-black/30, bg-slate-950/50).
const twBgOpacity = (names) => names.filter((n) => !/^(black|slate-900|slate-950|gray-800|gray-900|slate-800)$/.test(n)).map((n) => `[class*=${q('bg-' + n + '/')}]`);
const twDivide = (names) => names.map((n) => `.divide-${esc(n)} > :not(:last-child)`);

const accentBorderGuard = M.ACCENT_BORDERS.flatMap((h) => [`:not([style*=${q('solid ' + ssr(h))} i])`, `:not([style*=${q('solid ' + dom(h))} i])`]).join('');

/** Fonds d'origine très sombres (luminance < 0,08), détectés dans le code (hex) + classes Tailwind sombres : panneaux, bornes, cartes. */
function darkPanelSelectors() {
  const hexes = sourceHexes().filter((h) => hsl(h).lum < 0.08 && h !== '000000');
  const bg = hexes.flatMap(bgSelectors);
  const tw = ['slate-900', 'slate-950', 'gray-800', 'gray-900', 'black', 'slate-800'].map((n) => `.bg-${esc(n)}`);
  return [...new Set([...bg, ...tw])];
}

/** Fonds blancs translucides (alpha ≥ 0,7) posés en ligne : surfaces de contenu (pastilles sur photo, voiles). Les voiles faibles (< 0,7) restent. */
function whiteAlphaSelectors() {
  const alphas = new Set();
  for (const root of SCAN_ROOTS) for (const f of walkSources(root)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.[0-9]+)\s*\)/g)) if (Number(m[1]) >= 0.7) alphas.add(m[1]);
  }
  const sel = [];
  for (const a of [...alphas].sort()) {
    const n = String(Number(a)); // forme normalisée par le navigateur (0.92 → 0.92 ; .9 → 0.9)
    for (const prop of ['background', 'background-color']) {
      sel.push(`[style*=${q(prop + ':rgba(255,255,255,' + a + ')')} i]`, `[style*=${q(prop + ': rgba(255, 255, 255, ' + n + ')')} i]`);
    }
  }
  return sel;
}

const rule = (selectors, decl, extraSuffix = '') => {
  const list = [...new Set(selectors)];
  if (!list.length) return '';
  return `${SCOPE} :is(\n  ${list.join(',\n  ')}\n)${NOT_PAPER}${extraSuffix} {\n  ${decl}\n}\n`;
};

const POSITIONED = ['[style*="position:fixed" i]', '[style*="position: fixed" i]', '[style*="position:absolute" i]', '[style*="position: absolute" i]', '[style*="position:sticky" i]', '[style*="position: sticky" i]', '.fixed', '.absolute', '.sticky'];
const FIXED_ANCESTORS = ['[style*="position:fixed" i]', '[style*="position: fixed" i]', '.fixed'];

// ───────── Classement automatique des couleurs hex non listées dans la carte ─────────
const SCAN_ROOTS = [
  path.join(REPO, 'coro-frontend', 'app'), path.join(REPO, 'coro-frontend', 'components'), path.join(REPO, 'coro-frontend', 'lib'),
  path.join(REPO, 'coro-client-portal', 'app'),
];
function walkSources(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'public'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSources(p, out);
    else if (/\.(tsx|ts|css)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}
function sourceHexes() {
  const found = new Set();
  for (const root of SCAN_ROOTS) for (const f of walkSources(root)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/#([0-9A-Fa-f]{6})\b/g)) found.add(m[1].toUpperCase());
  }
  return [...found].sort();
}
function hsl(h) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6; else if (max === g) hue = (b - r) / d + 2; else hue = (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const lin = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return { h: hue, s, l, chroma: d, lum: 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] };
}
/** Famille de teinte : danger | warning | success | info | purple | neutral. */
function family(c) {
  if (c.chroma < 0.075) return 'neutral';
  if (c.h >= 345 || c.h < 18) return 'danger';
  if (c.h < 72) return 'warning';
  if (c.h < 170) return 'success';
  if (c.h < 255) return 'info';
  return 'purple';
}
const mappedSet = (g) => new Set(Object.values(g).flat());
/** Étend la carte avec les couleurs du code non listées : fonds clairs → rôle de teinte ; textes sombres → rôle lisible ; bordures claires. */
function extendedMaps() {
  const bg = JSON.parse(JSON.stringify(M.BG_HEX)); const tx = JSON.parse(JSON.stringify(M.TEXT_HEX)); const bd = JSON.parse(JSON.stringify(M.BORDER_HEX));
  const mb = mappedSet(M.BG_HEX), mt = mappedSet(M.TEXT_HEX), mbd = mappedSet(M.BORDER_HEX);
  for (const h of sourceHexes()) {
    const c = hsl(h); const fam = family(c);
    // Fond : clair → surface teintée ; très sombre → marine Glass (lisible en Dark). Les teintes franches (boutons) restent.
    if (!mb.has(h)) {
      if (c.lum > 0.62 && h !== 'FFFFFF') {
        const role = fam === 'neutral' ? (c.lum > 0.86 ? 'fill1' : 'fill2') : fam;
        (bg[role] = bg[role] || []).push(h);
      } else if (c.lum < 0.04 && fam === 'neutral' && h !== '000000') (bg.navy = bg.navy || []).push(h);
    }
    // Texte : sombre → rôle lisible sur verre ; les clairs (texte sur fond coloré) restent.
    if (!mt.has(h) && c.lum < 0.32 && h !== '000000') {
      const role = fam === 'neutral' ? (c.lum < 0.05 ? 'primary' : c.lum < 0.17 ? 'secondary' : 'muted') : fam === 'danger' ? 'accent' : fam;
      (tx[role] = tx[role] || []).push(h);
    }
    // Bordure : claire → neutre ou teintée.
    if (!mbd.has(h) && c.lum > 0.45 && h !== 'FFFFFF') {
      const role = fam === 'neutral' ? 'default' : fam;
      (bd[role] = bd[role] || []).push(h);
    }
  }
  return { bg, tx, bd };
}

function tokens() {
  const NL = String.fromCharCode(10);
  const light = Object.entries(M.ALIAS_DEFS).map(([k, v]) => `  --cg-skin-${k}: ${v};`).join(NL);
  const dark = Object.entries(M.ALIAS_DARK).map(([k, v]) => `  --cg-skin-${k}: ${v};`).join(NL);
  return `/* Jetons alias de la couche de teinte (le reste vient de tokens.css). Inexistants hors modes skin/canvas. */
:root[data-ui="glass"][data-cg-mode="skin"],
:root[data-ui="glass"][data-cg-mode="canvas"] {
${light}
}
:root[data-ui="glass"][data-theme="dark"][data-cg-mode="skin"],
:root[data-ui="glass"][data-theme="dark"][data-cg-mode="canvas"] {
${dark}
}
`;
}

function build() {
  const out = [];
  out.push('/* GÉNÉRÉ par design-system/tools/build-skin.cjs — NE PAS ÉDITER. Source : design-system/skin/skin-map.cjs. */');
  out.push(tokens());

  const X = extendedMaps();
  // Fonds
  for (const [role, hexes] of Object.entries(X.bg)) {
    const sel = [...hexes.flatMap(bgSelectors), ...twBg(M.TW_BG[role] || []), ...twBgOpacity(M.TW_BG[role] || []), ...twArbitrary('bg', hexes)];
    out.push(rule(sel, `background-color: ${M.BG_ROLES[role]} !important;`));
  }
  // Fonds blancs translucides en ligne (≥ 0,7) : même rôle que le blanc plein.
  out.push(rule(whiteAlphaSelectors(), `background-color: ${M.BG_ROLES.surface} !important;`));
  // Textes. Les gris (primaire, secondaire, atténué) sont des textes pensés pour une surface CLAIRE : posés sur un panneau sombre d'origine
  // (marine, noir de carte ou de borne), ils ne sont pas réassignés (sinon gris foncé sur fond sombre).
  const darkPanels = darkPanelSelectors();
  // Rôles de texte : union des couleurs hex ET des classes Tailwind (le rôle « danger » n'existe que côté Tailwind).
  const textRoles = [...new Set([...Object.keys(X.tx), ...Object.keys(M.TW_TEXT)])];
  for (const role of textRoles) {
    const hexes = X.tx[role] || [];
    const sel = [...hexes.flatMap(textSelectors), ...twText(M.TW_TEXT[role] || []), ...twArbitrary('text', hexes)];
    const onLightOnly = ['primary', 'secondary', 'muted'].includes(role);
    // L'élément lui-même (fond sombre + texte gris sur le même nœud) et ses descendants sont exclus.
    out.push(rule(sel, `color: ${M.TEXT_ROLES[role]} !important;`, onLightOnly ? `:not(:is(${darkPanels.join(', ')})):not(:is(${darkPanels.join(', ')}) *)` : ''));
  }
  // Bordures : les neutres épargnent un élément qui porte un liséré d'état coloré.
  for (const [role, hexes] of Object.entries(X.bd)) {
    const neutral = role === 'subtle' || role === 'default';
    const sel = [...hexes.flatMap(borderSelectors), ...twBorder(M.TW_BORDER[role] || []), ...twArbitrary('border', hexes)];
    out.push(rule(sel, `border-color: ${M.BORDER_ROLES[role]} !important;`, neutral ? accentBorderGuard : ''));
  }
  out.push(rule(twDivide(M.TW_BORDER.default), `border-color: ${M.BORDER_ROLES.default} !important;`));
  out.push(rule(twDivide(M.TW_BORDER.subtle), `border-color: ${M.BORDER_ROLES.subtle} !important;`));

  // Survol Tailwind (fond) → recouvrement de survol Glass.
  out.push(rule(M.TW_HOVER_BG.map((n) => `.hover\\:bg-${esc(n)}:hover`), 'background-color: var(--cg-hover-overlay) !important;'));

  // Pictogrammes SVG à couleur en attribut (props `color` de Lucide, graphiques).
  const strokeSel = Object.entries(X.tx).flatMap(([role, hexes]) => hexes.map((h) => ({ role, h })));
  for (const [role, value] of Object.entries(M.TEXT_ROLES)) {
    const list = strokeSel.filter((x) => x.role === role).flatMap((x) => [`svg[stroke=${q('#' + x.h)} i]`, `svg [stroke=${q('#' + x.h)} i]`]);
    out.push(rule(list, `stroke: ${value} !important;`));
    const fills = strokeSel.filter((x) => x.role === role).flatMap((x) => [`svg[fill=${q('#' + x.h)} i]`, `svg [fill=${q('#' + x.h)} i]`]);
    out.push(rule(fills, `fill: ${value} !important;`));
  }

  // Surfaces positionnées (menus, tiroirs, en-têtes collants) et contenu de couche fixe : OPAQUES, jamais translucides.
  const surfaceSel = [...M.BG_HEX.surface.flatMap(bgSelectors), ...twBg(M.TW_BG.surface)];
  const opaqueSelf = POSITIONED.flatMap((pos) => surfaceSel.map((s) => (pos.startsWith('.') ? `${s}${pos}` : `${s}${pos}`)));
  const opaqueInFixed = FIXED_ANCESTORS.flatMap((anc) => surfaceSel.map((s) => `${anc} ${s}`));
  // `.cg-chrome` (barre en verre dense, avec flou) reste translucide : c'est une surface de chrome, pas un menu flottant.
  out.push(rule([...opaqueSelf, ...opaqueInFixed], 'background-color: var(--cg-panel-bg) !important;', ':not(.cg-chrome)'));

  // Finition « verre » des cartes : reflet interne, arête, élévation douce. Jamais sur les champs ni les boutons.
  const radii = ['6px', '8px', '10px', '12px'];
  const cardSel = M.BG_HEX.surface.flatMap(bgSelectors).flatMap((s) =>
    radii.flatMap((r) => [`${s}[style*=${q('border-radius:' + r)} i]`, `${s}[style*=${q('border-radius: ' + r)} i]`]));
  const twCardSel = ['.rounded', '.rounded-md', '.rounded-lg', '.rounded-xl', '.rounded-2xl'].map((r) => `.bg-white${r}`);
  const notControl = ':not(input):not(select):not(textarea):not(button):not(a)';
  out.push(rule([...cardSel, ...twCardSel], 'background-image: var(--cg-sheen); border-radius: var(--cg-radius-lg) !important; box-shadow: inset 0 1px 0 var(--cg-glass-highlight), var(--cg-shadow-1);', notControl + ':not([style*="box-shadow"])'));

  // Enveloppes de page pleine hauteur : transparentes pour laisser voir le canevas Glass.
  const pageWrap = [
    ...X.bg.fill1.flatMap(bgSelectors).flatMap((s) => [`${s}[style*="min-height:100vh" i]`, `${s}[style*="min-height: 100vh" i]`, `${s}[style*="min-height:100dvh" i]`, `${s}[style*="min-height: 100dvh" i]`]),
    ...M.TW_BG.fill1.flatMap((n) => [`.min-h-screen.bg-${esc(n)}`, `.min-h-dvh.bg-${esc(n)}`]),
  ];
  out.push(rule(pageWrap, 'background-color: transparent !important; background-image: none;'));

  // Couleur de texte par défaut du document (le portail la pose en dur sur body).
  out.push(`${SCOPE} body { color: var(--cg-text-primary); }`);
  // Champs : curseur, sélection, texte d'aide.
  out.push(`${SCOPE} ::placeholder { color: var(--cg-text-muted); opacity: 1; }`);
  out.push(`${SCOPE} ::selection { background: var(--cg-accent-soft); }`);
  out.push(`${SCOPE} ::-webkit-scrollbar-track { background: transparent; }`);
  out.push(`${SCOPE} ::-webkit-scrollbar-thumb { background: var(--cg-border-default); }`);
  out.push(`${SCOPE} ::-webkit-scrollbar-thumb:hover { background: var(--cg-border-strong); }`);
  out.push(`${SCOPE} :focus-visible { outline: var(--cg-focus-width) solid var(--cg-focus-ring); outline-offset: var(--cg-focus-offset); }`);

  // Feuille de document : toujours claire, quel que soit le thème (aperçus, PDF).
  out.push(`:root[data-ui="glass"] :is([data-cg-paper], [data-cg-emergency], [data-cg-keep]) {
  color-scheme: light;
  --text-primary: #2C3E50;
  --text-secondary: #6C757D;
  --text-muted: #ADB5BD;
  --foreground: #2C3E50;
  color: #2C3E50;
}
`);
  return out.join('\n');
}

function filesFor(target, css) {
  const hash = crypto.createHash('sha1').update(css).digest('hex').slice(0, 10);
  const cssName = `glass-skin.${hash}.css`;
  const asset = `/* GÉNÉRÉ par design-system/tools/build-skin.cjs — NE PAS ÉDITER. */\nexport const SKIN_HREF = '/${cssName}';\n`;
  return { cssName, css, assetPath: path.join(target.dir, 'design-system', 'skin', 'skin-asset.ts'), asset };
}

function main() {
  const check = process.argv.includes('--check');
  const css = build();
  let bad = 0;
  for (const t of TARGETS) {
    const f = filesFor(t, css);
    const pub = path.join(t.dir, 'public');
    const cssPath = path.join(pub, f.cssName);
    const existing = fs.existsSync(pub) ? fs.readdirSync(pub).filter((n) => /^glass-skin\.[0-9a-f]{10}\.css$/.test(n)) : [];
    if (check) {
      const lf = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
      const okCss = fs.existsSync(cssPath) && lf(cssPath) === css && existing.length === 1;
      const okAsset = fs.existsSync(f.assetPath) && lf(f.assetPath) === f.asset;
      if (!okCss || !okAsset) { console.error(`${t.name} : couche de teinte obsolète — lancer « node design-system/tools/build-skin.cjs »`); bad++; }
      continue;
    }
    fs.mkdirSync(pub, { recursive: true });
    fs.mkdirSync(path.dirname(f.assetPath), { recursive: true });
    for (const old of existing) if (old !== f.cssName) fs.unlinkSync(path.join(pub, old));
    fs.writeFileSync(cssPath, css);
    fs.writeFileSync(f.assetPath, f.asset);
    console.log(`${t.name} : ${f.cssName} (${(css.length / 1024).toFixed(1)} Ko)`);
  }
  if (bad) process.exit(1);
}

module.exports = { build, extendedMaps, SCOPE, NOT_PAPER, TARGETS };
if (require.main === module) main();
