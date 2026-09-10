const fs   = require('fs');
const path = require('path');

const BASE   = path.resolve(__dirname);
const OUTPUT = path.join(BASE, 'coro-features-scan-frontend.txt');
const lines  = [];

const log = (s) => { lines.push(s); console.log(s); };

function walk(dir, ext, depth = 0) {
  if (!fs.existsSync(dir) || depth > 12) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'build'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, ext, depth + 1));
    else if (e.name.endsWith(ext)) out.push(full);
  }
  return out;
}

// ── Détection automatique du dossier app Next.js ─────────────────────────────
const candidates = [
  path.join(BASE, 'coro-frontend', 'app'),
  path.join(BASE, 'coro-frontend', 'src', 'app'),
  path.join(BASE, 'frontend', 'app'),
  path.join(BASE, 'frontend', 'src', 'app'),
];
const appDir = candidates.find(fs.existsSync) || null;

log('══════════════════════════════════════════');
log('  ROUTES FRONTEND (pages Next.js)');
log('══════════════════════════════════════════');
log(`  Dossier app détecté : ${appDir || '⚠ AUCUN'}`);

if (appDir) {
  walk(appDir, 'page.tsx')
    .map(f => f.replace(appDir, '').replace(/\\/g, '/').replace('/page.tsx', '') || '/')
    .sort()
    .forEach(r => log(`  ${r || '/'}`));

  log('\n══════════════════════════════════════════');
  log('  LAYOUTS ET COMPOSANTS SPÉCIAUX');
  log('══════════════════════════════════════════');
  walk(appDir, 'layout.tsx')
    .map(f => f.replace(appDir, '').replace(/\\/g, '/'))
    .sort()
    .forEach(r => log(`  ${r}`));
}

// ── Composants ────────────────────────────────────────────────────────────────
log('\n══════════════════════════════════════════');
log('  COMPOSANTS FRONTEND');
log('══════════════════════════════════════════');

const compCandidates = [
  path.join(BASE, 'coro-frontend', 'components'),
  path.join(BASE, 'coro-frontend', 'src', 'components'),
];
const compDir = compCandidates.find(fs.existsSync) || null;
log(`  Dossier composants : ${compDir || '⚠ AUCUN'}`);

if (compDir) {
  walk(compDir, '.tsx')
    .map(f => f.replace(compDir, '').replace(/\\/g, '/'))
    .sort()
    .forEach(c => log(`  ${c}`));
}

// ── Stores Zustand ────────────────────────────────────────────────────────────
log('\n══════════════════════════════════════════');
log('  STORES ZUSTAND');
log('══════════════════════════════════════════');

const storeCandidates = [
  path.join(BASE, 'coro-frontend', 'stores'),
  path.join(BASE, 'coro-frontend', 'src', 'stores'),
  path.join(BASE, 'coro-frontend', 'lib', 'stores'),
];
const storeDir = storeCandidates.find(fs.existsSync) || null;
log(`  Dossier stores : ${storeDir || '⚠ AUCUN'}`);

if (storeDir) {
  fs.readdirSync(storeDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    .sort()
    .forEach(f => log(`  ${f}`));
}

// ── Structure générale frontend ───────────────────────────────────────────────
log('\n══════════════════════════════════════════');
log('  STRUCTURE RACINE FRONTEND');
log('══════════════════════════════════════════');

const feDir = [
  path.join(BASE, 'coro-frontend'),
  path.join(BASE, 'frontend'),
].find(fs.existsSync);

if (feDir) {
  log(`  Racine : ${feDir}`);
  fs.readdirSync(feDir, { withFileTypes: true })
    .filter(e => !['node_modules', '.next', '.git'].includes(e.name))
    .forEach(e => log(`  ${e.isDirectory() ? '[DIR]' : '[FIL]'} ${e.name}`));
}

log('\n══════════════════════════════════════════');
log(`  Scan terminé : ${new Date().toLocaleString('fr-CA')}`);

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`\n✅ Fichier généré : ${OUTPUT}`);