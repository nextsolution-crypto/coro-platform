/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Inventaire canonique V2 des routes (application CORO ET portail client) — lecture seule.
 *
 * Usage :
 *   node design-system/tools/inventory-v2.cjs                 → résumé console (les deux applications)
 *   node design-system/tools/inventory-v2.cjs --write         → docs/design/liquid-glass/v2/route-matrix.{json,md}
 *   node design-system/tools/inventory-v2.cjs --app portal    → une seule application
 *
 * Une route = un fichier app/**\/page.tsx (ou page.dev.tsx). Le site vitrine (coro-website) est EXCLU par décision du Founder.
 * Les colonnes « heuristiques » (urgence, financier, permissions) servent à ordonner la validation : elles ne remplacent jamais
 * la décision d'un registre. Pour l'application, le registre (route-registry.ts) fait foi pour le statut Glass.
 */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const APPS = {
  app: { dir: path.join(REPO, 'coro-frontend'), shellFile: 'components/layout/AppLayout.tsx', label: 'Application CORO (coro-frontend)' },
  portal: { dir: path.join(REPO, 'coro-client-portal'), shellFile: 'app/components/PortalLayout.tsx', label: 'Portail client (coro-client-portal)' },
};
const EXTS = ['.tsx', '.ts', '.mjs', '.js', '.css'];
const TW_COLOR = /\b(?:bg|text|border|ring|from|to|via|divide|outline|fill|stroke)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/g;
const importRe = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

function resolveImport(root, from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  const candidates = [base, ...EXTS.map((x) => base + x), ...EXTS.map((x) => path.join(base, 'index' + x))];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

function graph(root, entry, shellAbs) {
  const seen = new Map();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    seen.set(file, src);
    if (file === shellAbs) continue;
    if (!/\.(tsx|ts|mjs|js)$/.test(file)) continue;
    for (const m of src.matchAll(importRe)) {
      const r = resolveImport(root, file, m[1] || m[2] || m[3]);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

const count = (src, re) => (src.match(re) || []).length;
const EMERGENCY = /(incident|evacuat|évacuat|panic|panique|alarm|urgence|emergency|kiosk|presence|intervention|procedure|sentinelle|population|mandate)/i;
const FINANCIAL = /(rendement|financ|commercial|contract|price|tarif|invoice|facture|clause|proposal|catalog|metering|entitlement|cad\b)/i;
const PERMS = /(SUPER_ADMIN|PLATFORM_|requirePermission|usePlatformAuthority|isFounder|role\s*===|role\s*!==|\/admin\b|permission)/;
const DESTRUCTIVE = /(\bapi\.delete\(|\bapiDelete\(|method:\s*['"]DELETE['"]|window\.confirm\(|\bconfirm\(|Supprimer|Révoquer|Revoquer)/;
const MODAL = /(role=["']dialog["']|aria-modal|position:\s*['"]fixed['"]|\bfixed inset-0\b|<[A-Za-z]*Modal\b|ExportModal)/;
const FORM = /(<form\b|<input\b|<textarea\b|<select\b)/;
const TABLE = /(<table\b|<thead\b|role=["']table["'])/;
const RESPONSIVE = /(\b(?:sm|md|lg|xl):[a-z-]+|@media|useIsMobile|innerWidth|matchMedia)/g;

function routeOf(appDir, file) {
  const r = path.relative(path.join(appDir, 'app'), file).replace(/\\/g, '/').replace(/\/?page(\.dev)?\.tsx$/, '');
  return '/' + r;
}

/** Tests de contrat « voisins » : *.test.* dans le dossier de la route ou un ancêtre (hors racine app/). */
function nearbyTests(appDir, file) {
  const found = new Set();
  let dir = path.dirname(file);
  const appRoot = path.join(appDir, 'app');
  while (dir.startsWith(appRoot) && dir !== appRoot) {
    for (const e of fs.readdirSync(dir)) if (/\.test\.(c|m)?[jt]s$/.test(e)) found.add(path.relative(appDir, path.join(dir, e)).replace(/\\/g, '/'));
    dir = path.dirname(dir);
  }
  return [...found].sort();
}

function loadRegistry() {
  // Le registre est en TypeScript : lecture textuelle des littéraux (pattern, status, render, sensitivity, exception).
  const src = fs.readFileSync(path.join(APPS.app.dir, 'design-system/routes/route-registry.ts'), 'utf8');
  const out = new Map();
  const re = /\{\s*pattern:\s*'([^']+)'([\s\S]*?)\n?\s*\},?\s*(?=\n\s*(?:\{|\/\/|\];))/g;
  for (const m of src.matchAll(re)) {
    const body = m[2];
    const pick = (k) => (body.match(new RegExp(k + ":\\s*'([^']+)'")) || [])[1] || null;
    const list = (k) => ((body.match(new RegExp(k + ':\\s*\\[([^\\]]*)\\]')) || [])[1] || '').split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
    out.set(m[1], { status: pick('status'), render: pick('render'), shell: pick('shell'), family: pick('family'), sensitivity: list('sensitivity'), exception: /exception:/.test(body) });
  }
  return out;
}

function scan(key, registry) {
  const { dir, shellFile } = APPS[key];
  const shellAbs = path.join(dir, shellFile);
  const pages = walk(path.join(dir, 'app')).filter((p) => /[\\/]page(\.dev)?\.tsx$/.test(p));
  return pages.map((file) => {
    const g = graph(dir, file, shellAbs);
    let lines = 0, hex = 0, tw = 0, inline = 0, forms = 0, tables = 0, modals = 0, destructive = 0, responsive = 0;
    let cssModule = false, shell = false, emergencyHit = false, financialHit = false, permsHit = false;
    const deps = new Set();
    for (const [f, src] of g) {
      if (f === shellAbs) { shell = true; continue; }
      const r = path.relative(dir, f).replace(/\\/g, '/');
      if (r.startsWith('design-system/')) continue;
      if (/\.module\.css$/.test(f)) cssModule = true;
      if (!/\.(tsx|ts|css)$/.test(f)) continue;
      lines += src.split('\n').length;
      hex += count(src, /#[0-9A-Fa-f]{6}\b/g);
      tw += count(src, TW_COLOR);
      inline += count(src, /style=\{\{/g);
      if (FORM.test(src)) forms += count(src, /<form\b/g) || 1;
      if (TABLE.test(src)) tables += count(src, /<table\b/g) || 1;
      if (MODAL.test(src)) modals += 1;
      if (!/(^|\/)store\/|\/lib\/api\.ts$/.test(r) && DESTRUCTIVE.test(src)) destructive += 1;
      responsive += count(src, RESPONSIVE);
      if (PERMS.test(src)) permsHit = true;
      if (/\.(tsx|ts)$/.test(f)) {
        if (r.startsWith('components/') || r.startsWith('app/components/')) deps.add(r);
      }
    }
    const pattern = routeOf(dir, file);
    if (EMERGENCY.test(pattern)) emergencyHit = true;
    if (FINANCIAL.test(pattern)) financialHit = true;
    const styling = [];
    if (hex > 0) styling.push('inline-hex');
    if (tw > 0) styling.push('tailwind');
    if (cssModule) styling.push('css-module');
    if (styling.length === 0) styling.push('none');
    const reg = key === 'app' ? registry.get(pattern) || null : null;
    const sensitivity = new Set(reg ? reg.sensitivity : []);
    if (emergencyHit) sensitivity.add('emergency-content');
    if (financialHit) sensitivity.add('financial-legal');
    if (destructive) sensitivity.add('destructive');
    if (/\/(login|reset-password|forgot-password|magic)/.test(pattern)) sensitivity.add('auth');
    if (key === 'app' ? permsHit && /\/(admin|settings)/.test(pattern) : false) sensitivity.add('permissions');
    return {
      app: key,
      route: pattern,
      file: path.relative(dir, file).replace(/\\/g, '/'),
      dynamic: pattern.includes('['),
      devOnly: /page\.dev\.tsx$/.test(file),
      layout: shell ? (key === 'app' ? 'AppLayout' : 'PortalLayout') : 'aucun (plein écran)',
      styling,
      lines, hex, tailwindColors: tw, inlineStyles: inline,
      forms, tables, modalFiles: modals, destructiveFiles: destructive,
      responsiveHints: responsive,
      sharedComponents: [...deps].sort(),
      sensitivity: [...sensitivity].sort(),
      tests: nearbyTests(dir, file),
      registry: reg ? { status: reg.status, render: reg.render, exception: reg.exception } : null,
    };
  }).sort((a, b) => a.route.localeCompare(b.route));
}

function buildAll(only) {
  const registry = loadRegistry();
  const rows = [];
  for (const key of Object.keys(APPS)) if (!only || only === key) rows.push(...scan(key, registry));
  return rows;
}

function markdown(rows) {
  const out = [];
  out.push('# Matrice de couverture des routes — Liquid Glass V2', '');
  out.push('Générée par `npm run glass:inventory-v2 -- --write` (lecture seule du code). Le site vitrine `coro-website` est **exclu** (décision Founder).', '');
  for (const key of Object.keys(APPS)) {
    const list = rows.filter((r) => r.app === key);
    if (!list.length) continue;
    out.push(`## ${APPS[key].label} — ${list.length} routes`, '');
    out.push('| Route | Disposition | Style | Formulaires | Tables | Modales | Sensibilité | Statut Glass |', '|---|---|---|---:|---:|---:|---|---|');
    for (const r of list) {
      const st = r.registry ? `${r.registry.status}${r.registry.render ? '/' + r.registry.render : ''}` : (key === 'portal' ? 'non couvert (V1)' : 'absent du registre');
      out.push(`| \`${r.route}\` | ${r.layout} | ${r.styling.join('+')} | ${r.forms} | ${r.tables} | ${r.modalFiles} | ${r.sensitivity.join(', ') || '—'} | ${st} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

module.exports = { buildAll, APPS, REPO };

if (require.main === module) {
  const args = process.argv.slice(2);
  const only = args.includes('--app') ? args[args.indexOf('--app') + 1] : null;
  const rows = buildAll(only);
  for (const key of Object.keys(APPS)) {
    const list = rows.filter((r) => r.app === key);
    if (!list.length) continue;
    const dup = list.map((r) => r.route).filter((p, i, a) => a.indexOf(p) !== i);
    console.log(`${APPS[key].label} : ${list.length} routes (${list.filter((r) => !r.dynamic).length} statiques, ${list.filter((r) => r.dynamic).length} dynamiques), doublons ${dup.length}`);
  }
  if (args.includes('--write')) {
    const outDir = path.join(REPO, 'docs', 'design', 'liquid-glass', 'v2');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'route-matrix.json'), JSON.stringify(rows, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'route-matrix.md'), markdown(rows) + '\n');
    console.log('écrit :', path.join(outDir, 'route-matrix.{json,md}'));
  }
}
