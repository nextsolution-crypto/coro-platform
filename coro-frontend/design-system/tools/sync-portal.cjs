/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Synchronise le noyau Liquid Glass partagé de coro-frontend vers coro-client-portal.
 *
 *   node design-system/tools/sync-portal.cjs           copie les fichiers (LF)
 *   node design-system/tools/sync-portal.cjs --check   échoue si le portail diffère (utilisé par les tests des deux applications)
 *
 * Source de vérité : coro-frontend/design-system. Fichiers PARTAGÉS (copie identique octet à octet, fins de ligne normalisées) :
 * jetons, primitives CSS, logique de thème, résolution de routes et chargeur de la couche de teinte. Les fichiers propres au portail
 * (registre de routes, composants) ne sont pas copiés. coro-website n'est jamais concerné.
 */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(REPO, 'coro-frontend', 'design-system');
const DST = path.join(REPO, 'coro-client-portal', 'design-system');

const SHARED = [
  'test-loader.cjs',
  'tokens.css',
  'primitives.css',
  'theme/theme-core.ts',
  'theme/theme-store.ts',
  'theme/ThemeProvider.tsx',
  'theme/ThemeInitScript.tsx',
  'routes/route-matcher.ts',
  'skin/skin-loader.ts',
  // Kit de primitives (identique dans les deux applications).
  'kit/index.ts', 'kit/kit.css', 'kit/GlassTable.tsx', 'kit/GlassModal.tsx', 'kit/GlassField.tsx', 'kit/StatusBadge.tsx', 'kit/PageHeader.tsx',
  'kit/GlassButton.tsx', 'kit/GlassCard.tsx', 'kit/GlassPanel.tsx', 'kit/StatCard.tsx', 'kit/StateViews.tsx', 'kit/FilterBar.tsx', 'kit/DataCards.tsx',
  'kit/PeriodSelector.tsx',
];

const lf = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function diff() {
  const out = [];
  for (const rel of SHARED) {
    const s = path.join(SRC, rel); const d = path.join(DST, rel);
    if (!fs.existsSync(d)) out.push(`${rel} : absent du portail`);
    else if (lf(s) !== lf(d)) out.push(`${rel} : diffère du noyau partagé`);
  }
  return out;
}

function sync() {
  for (const rel of SHARED) {
    const d = path.join(DST, rel);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.writeFileSync(d, lf(path.join(SRC, rel)));
  }
}

module.exports = { SHARED, diff, sync };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const d = diff();
    if (d.length) { console.error(d.join('\n')); process.exit(1); }
    console.log('noyau partagé synchronisé (' + SHARED.length + ' fichiers)');
  } else {
    sync();
    console.log('synchronisé : ' + SHARED.length + ' fichiers vers coro-client-portal/design-system');
  }
}
