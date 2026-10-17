/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Codemod « replis var() » pour les modules CSS (qui échappent aux sélecteurs d'attributs de la couche de teinte).
 *
 *   node design-system/tools/tokenize-css.cjs           réécrit les fichiers listés
 *   node design-system/tools/tokenize-css.cjs --check   échoue si un fichier n'est pas à jour (utilisé par les tests)
 *
 * Une couleur hex Legacy dans une déclaration de fond, texte ou bordure devient  var(--cg-skin-<rôle>, #HEXORIGINAL).
 *  - Les jetons --cg-skin-* n'existent QUE lorsque la feuille de teinte est chargée (modes skin/canvas) : en Classique, comme en îlot Legacy,
 *    le repli reproduit exactement la couleur d'origine (le rendu Legacy est inchangé, vérifié au banc par snapshot/compare).
 *  - Idempotent : les déclarations déjà converties sont reconstruites depuis leur repli, puis reconverties (donc recalculées si la carte change).
 *  - Les dégradés, ombres, rgba() et couleurs saturées pleines (boutons, pastilles) ne sont pas touchés.
 */
const fs = require('node:fs');
const path = require('node:path');
const M = require('../skin/skin-map.cjs');
const { extendedMaps } = require('./build-skin.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..');
const TARGETS = [
  'coro-frontend/app/planning/planning.module.css',
  'coro-client-portal/app/population/components/PopulationPublicShell.module.css',
  'coro-client-portal/app/sentinelle/[buildingId]/corrective-actions/action.module.css',
  'coro-client-portal/app/sentinelle/[buildingId]/population/evidence/evidence.module.css',
  'coro-client-portal/app/sentinelle/[buildingId]/population/population.module.css',
  'coro-client-portal/app/sentinelle/[buildingId]/population/reviews/[reviewId]/review.module.css',
];
/** Portion d'un fichier global à convertir (portail : bloc .authReset de globals.css) : [fichier, marqueur de début]. */
const PARTIAL = [['coro-client-portal/app/globals.css', '.authReset {']];

const X = extendedMaps();
const lookup = (maps) => { const m = new Map(); for (const [role, hexes] of Object.entries(maps)) for (const h of hexes) m.set(h, role); return m; };
const BG = lookup(X.bg), TX = lookup(X.tx), BD = lookup(X.bd);
const normHex = (h) => { h = h.replace('#', '').toUpperCase(); return h.length === 3 ? h.split('').map((c) => c + c).join('') : h; };

const wrap = (kind, role, original) => `var(--cg-skin-${kind}-${role}, ${original})`;
const HEX = /#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
const DECL = new RegExp(String.raw`([{;]\s*)([a-zA-Z-]+)(\s*:\s*)([^;{}]*?)(\s*!important)?(\s*)(?=[;}])`, 'g');
const UNWRAP = /var\(--cg-skin-(?:bg|text|border)-[a-z0-9]+,\s*(#[0-9A-Fa-f]{3,6})\)/g;

function convertValue(prop, value) {
  const p = prop.toLowerCase();
  let kind = null, table = null;
  if (p === 'background' || p === 'background-color') { kind = 'bg'; table = BG; }
  else if (p === 'color' || p === 'fill' || p === 'stroke') { kind = 'text'; table = TX; }
  else if (p === 'border' || /^border-(top|right|bottom|left)$/.test(p) || /^border(-(top|right|bottom|left))?-color$/.test(p) || p === 'outline' || p === 'outline-color') { kind = 'border'; table = BD; }
  if (!kind) return value;
  // Valeurs composées (dégradés, images) : jamais touchées.
  if (/gradient|url\(/i.test(value)) return value;
  return value.replace(HEX, (hex) => {
    const role = table.get(normHex(hex));
    return role ? wrap(kind, role, hex) : hex;
  });
}

function convert(css) {
  css = css.replace(UNWRAP, '$1'); // recalcul à partir des replis
  // Déclarations de n'importe quelle forme (une par ligne ou plusieurs sur une ligne) : précédées de « { » ou « ; », suivies de « ; » ou « } ».
  return css.replace(DECL, (all, lead, prop, sep, value, important, tail) => {
    const next = convertValue(prop, value);
    return next === value ? all : lead + prop + sep + next + (important || '') + tail;
  });
}

function convertPartial(css, marker) {
  const i = css.indexOf(marker);
  if (i < 0) throw new Error('marqueur introuvable : ' + marker);
  return css.slice(0, i) + convert(css.slice(i));
}

const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8').replace(/\r\n/g, '\n');

function status() {
  const stale = [];
  for (const rel of TARGETS) if (read(rel) !== convert(read(rel))) stale.push(rel);
  for (const [rel, marker] of PARTIAL) if (read(rel) !== convertPartial(read(rel), marker)) stale.push(rel);
  return stale;
}

module.exports = { convert, convertPartial, status, TARGETS, PARTIAL, REPO, read };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const stale = status();
    if (stale.length) { console.error('modules CSS à reconvertir :\n' + stale.join('\n')); process.exit(1); }
    console.log('modules CSS à jour');
  } else {
    let changed = 0;
    for (const rel of TARGETS) { const a = read(rel), b = convert(a); if (a !== b) { fs.writeFileSync(path.join(REPO, rel), b); changed++; } }
    for (const [rel, marker] of PARTIAL) { const a = read(rel), b = convertPartial(a, marker); if (a !== b) { fs.writeFileSync(path.join(REPO, rel), b); changed++; } }
    console.log(changed + ' fichier(s) converti(s)');
  }
}
