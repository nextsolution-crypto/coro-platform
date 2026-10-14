/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Matrice d'inventaire canonique des routes (scanner du code × registre).
 *   node design-system/tools/inventory-report.cjs            → tableau Markdown sur la sortie standard
 *   node design-system/tools/inventory-report.cjs --write    → met à jour design-system/ROUTES.md
 */
require('../test-loader.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { scanRoutes } = require('./route-scanner.cjs');
const { ROUTE_REGISTRY } = require('../routes/route-registry.ts');

const rows = scanRoutes();
const reg = new Map(ROUTE_REGISTRY.map((e) => [e.pattern, e]));
const order = ['pilot', 'work', 'portfolio', 'compliance', 'admin', 'super-admin', 'auth', 'dev'];
const labels = { pilot: 'Pilote migré', work: 'Projets, mandats, activités', portfolio: 'Clients, bâtiments, cartes', compliance: 'Conformité et éditeurs', admin: 'Administration, paramètres, blog', 'super-admin': 'Super Admin (commercial, catalogue, supervision)', auth: 'Authentification et accueil', dev: 'Outillage de développement' };

const joined = rows.map((r) => ({ ...r, ...reg.get(r.pattern) }));
const out = [];
out.push('# Inventaire canonique des routes — coro-frontend', '');
out.push('> Généré par `npm run glass:inventory -- --write` (scanner d’imports × registre). Ne pas éditer à la main : les statuts se changent dans `routes/route-registry.ts`.', '');
const statics = joined.filter((r) => !r.dynamic).length;
out.push(`**${joined.length} routes** (${statics} statiques, ${joined.length - statics} dynamiques) — une page \`page.tsx\` = une route, aucun double comptage. ` +
  `Avec shell Glass : ${joined.filter((r) => r.shell === 'app').length} ; plein écran : ${joined.filter((r) => r.shell === 'none').length}. ` +
  `Statuts : ${['ga', 'beta', 'legacy-only'].map((s) => `${s} ${joined.filter((r) => r.status === s).length}`).join(' · ')}.`, '');
for (const f of order) {
  const g = joined.filter((r) => r.family === f);
  if (!g.length) continue;
  const t = g.reduce((a, r) => ({ lines: a.lines + r.lines, hex: a.hex + r.hex, tw: a.tw + r.tw }), { lines: 0, hex: 0, tw: 0 });
  out.push(`## ${labels[f]} — ${g.length} route(s), ${t.lines} lignes, ${t.hex} couleurs hex, ${t.tw} classes couleur Tailwind`, '');
  out.push('| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |', '|---|---|---|---|---:|---:|---:|---|---|---|');
  for (const r of g) {
    out.push(`| \`${r.pattern}\` | ${r.dynamic ? 'dynamique' : 'statique'} | ${r.shell} | ${r.styling.join(' + ')} | ${r.lines} | ${r.hex} | ${r.tw} | ${(r.sensitivity || []).join(', ') || '—'} | ${r.status}${r.devOnly ? ' (dev)' : ''} | ${r.deps.length ? r.deps.map((d) => d.replace(/^components\//, '')).join(', ') : '—'} |`);
  }
  out.push('');
}
const text = out.join('\n');
if (process.argv.includes('--write')) { fs.writeFileSync(path.join(__dirname, '..', 'ROUTES.md'), text); console.log('ROUTES.md mis à jour (' + joined.length + ' routes)'); } else console.log(text);
