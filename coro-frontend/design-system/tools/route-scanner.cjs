/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Inventaire canonique des routes de coro-frontend (lecture seule).
 *
 * - Une route = un fichier app/**\/page.tsx (aucun double comptage : un fichier, une route).
 * - `shell` : la page atteint-elle components/layout/AppLayout.tsx par son graphe d'imports ?
 * - `styling` : pipelines de style atteints (hex inline, classes couleur Tailwind, module CSS).
 * - `deps` : composants partagés (components/**) atteints.
 *
 * Utilisé par les tests (cohérence registre ↔ code) et par `npm run glass:inventory`.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'app');
const SHELL_FILE = path.join(ROOT, 'components', 'layout', 'AppLayout.tsx');
const EXTS = ['.tsx', '.ts', '.mjs', '.js', '.css'];
const TW_COLOR = /(?<![\w-])\b(?:bg|text|border|ring|from|to|via|divide|outline|fill|stroke)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/g;

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null; // paquet npm : hors périmètre
  const candidates = [base, ...EXTS.map((x) => base + x), ...EXTS.map((x) => path.join(base, 'index' + x))];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

const importRe = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function graph(entry) {
  const seen = new Map(); const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    const src = fs.readFileSync(file, 'utf8'); seen.set(file, src);
    if (file === SHELL_FILE) continue; // le shell est mesuré à part
    if (!/\.(tsx|ts|mjs|js)$/.test(file)) continue;
    for (const m of src.matchAll(importRe)) {
      const r = resolveImport(file, m[1] || m[2] || m[3]);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

function routeOf(file) {
  const r = rel(file).replace(/^app\//, '').replace(/\/?page(\.dev)?\.tsx$/, '');
  return '/' + r;
}

function scanRoutes() {
  // `page.dev.tsx` : route d'outillage, reconnue par Next.js hors production seulement (voir next.config.ts).
  const pages = walk(APP).filter((p) => /[\\/]page(\.dev)?\.tsx$/.test(p));
  return pages.map((file) => {
    const g = graph(file);
    let lines = 0, hex = 0, tw = 0, inline = 0, destructive = false; const deps = new Set(); let cssModule = false; let shell = false;
    for (const [f, src] of g) {
      if (f === SHELL_FILE) { shell = true; continue; }
      if (/\.module\.css$/.test(f)) cssModule = true;
      if (!/\.(tsx|ts|css)$/.test(f)) continue;
      // Le code du design system n'est pas du code d'écran : il ne compte ni en lignes, ni en couleurs, ni en dépendances.
      if (rel(f).startsWith('design-system/')) continue;
      if (/\bapi\.delete\(/.test(src)) destructive = true;
      lines += src.split('\n').length;
      hex += (src.match(/#[0-9A-Fa-f]{6}\b/g) || []).length;
      tw += (src.match(TW_COLOR) || []).length;
      inline += (src.match(/style=\{\{/g) || []).length;
      const r = rel(f);
      if (r.startsWith('components/') && r !== 'components/layout/AuthProvider.tsx') deps.add(r);
    }
    const styling = [];
    if (hex > 0) styling.push('inline-hex');
    if (tw > 0) styling.push('tailwind');
    if (cssModule) styling.push('css-module');
    if (styling.length === 0) styling.push('none');
    const pattern = routeOf(file);
    return { pattern, file: rel(file), devOnly: /page\.dev\.tsx$/.test(file), dynamic: pattern.includes('['), shell: shell ? 'app' : 'none', styling, lines, hex, tw, inline, destructive, deps: [...deps].sort() };
  }).sort((a, b) => a.pattern.localeCompare(b.pattern));
}

/** Fichiers atteints (chemins relatifs à coro-frontend) depuis un point d'entrée du routage, shell et design system compris. */
function reachableFiles(entryAbs) {
  return [...graph(entryAbs).keys()].map(rel);
}

/** Fichiers à convention Next.js de app/ (pages, layouts, états, routes, métadonnées) = points d'entrée potentiels d'un build. */
const SPECIAL = /^(page|layout|template|loading|error|global-error|not-found|global-not-found|default|route|manifest|sitemap|robots|icon|apple-icon|opengraph-image|twitter-image)(\.dev)?\.(tsx|ts|jsx|js)$/;
function entryPoints() {
  return walk(APP).filter((p) => SPECIAL.test(path.basename(p)));
}

module.exports = { scanRoutes, reachableFiles, entryPoints, ROOT };

if (require.main === module) {
  const rows = scanRoutes();
  const dup = rows.map((r) => r.pattern).filter((p, i, a) => a.indexOf(p) !== i);
  console.log(`${rows.length} routes canoniques (${rows.filter((r) => !r.dynamic).length} statiques, ${rows.filter((r) => r.dynamic).length} dynamiques) — doublons : ${dup.length}`);
  for (const r of rows) console.log(r.pattern.padEnd(64), r.shell.padEnd(5), r.styling.join('+').padEnd(26), String(r.lines).padStart(6), 'l', 'hex', String(r.hex).padStart(4), 'tw', String(r.tw).padStart(4), r.deps.length ? '(' + r.deps.length + ' composants)' : '');
}
