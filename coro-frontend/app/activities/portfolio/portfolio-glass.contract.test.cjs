/* eslint-disable @typescript-eslint/no-require-imports */
// Contrat de la migration Liquid Glass de /activities/portfolio (Phase 07A).
// Garantit statiquement : Legacy intact, pas de couleur en dur nouvelle, aucune logique métier dans la vue Glass,
// registre en bêta (jamais ga). Le comportement réel est vérifié en navigateur par les scénarios portfolio-* du banc.
require('../../../design-system/test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8').replace(/\r\n/g, '\n');
const view = fs.readFileSync(path.join(__dirname, 'PortfolioGlassView.tsx'), 'utf8').replace(/\r\n/g, '\n');
const viewCode = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const { ROUTE_REGISTRY } = require('../../../design-system/routes/route-registry.ts');

// Empreinte (SHA-256) de app/activities/portfolio/page.tsx tel que commité avant la migration (738bba8a), fins de ligne LF.
const LEGACY_PAGE_SHA256 = '4e09193ae423dcfd61b1b14a406952730ccefb53b3f8b59350ad4b0f031ab119';
const LEGACY_HEX_COUNT = 94;

function withoutGlassBlocks(src) {
  const kept = []; let skipping = false;
  for (const line of src.split('\n')) {
    if (line.includes('GLASS:begin')) { skipping = true; continue; }
    if (line.includes('GLASS:end')) { skipping = false; continue; }
    if (!skipping) kept.push(line);
  }
  return kept.join('\n');
}

test('Legacy : hors blocs GLASS:begin/end, page.tsx est identique octet pour octet au code d’origine', () => {
  const sha = crypto.createHash('sha256').update(withoutGlassBlocks(page)).digest('hex');
  assert.equal(sha, LEGACY_PAGE_SHA256, 'le code Legacy de /activities/portfolio a été modifié : mettre à jour cette empreinte est une décision de revue');
});

test('page.tsx : aucune couleur en dur ajoutée', () => {
  assert.equal((page.match(/#[0-9A-Fa-f]{6}\b/g) || []).length, LEGACY_HEX_COUNT);
});

test('page.tsx : la vue Glass n’est rendue que si Glass est actif ET la route rendue en Glass (jamais en îlot)', () => {
  assert.match(page, /if \(ui === 'glass' && routeMode === 'glass'\) \{/);
  assert.match(page, /<PortfolioGlassView/);
  const begins = page.split('\n').filter((l) => l.includes('GLASS:begin')).length;
  assert.equal(begins, page.split('\n').filter((l) => l.includes('GLASS:end')).length, 'blocs équilibrés');
  assert.equal(begins, 3, 'trois points d’insertion seulement : imports, hook, retour conditionnel');
});

test('page.tsx : le chargement, les filtres et le téléchargement .ics restent ceux du Legacy (une seule implémentation)', () => {
  const legacy = withoutGlassBlocks(page);
  for (const needle of ['api.get(\'/clients\')', 'api.get(\'/projects?limit=200\')', '/projects/${project.id}/activities', 'const handleDownloadIcs', '/activities/${activityId}/ics']) {
    assert.ok(legacy.includes(needle), 'élément métier attendu dans la page : ' + needle);
  }
  assert.ok(!/\bapi\b|\bfetch\(/.test(viewCode), 'la vue ne charge rien');
});

test('vue Glass : aucune couleur en dur (tokens --cg-* uniquement)', () => {
  assert.deepEqual(view.match(/#[0-9A-Fa-f]{3,8}\b/g) || [], []);
  assert.deepEqual(view.match(/\b(rgb|rgba|hsl|oklch)\(/g) || [], []);
  const colors = [...viewCode.matchAll(/(?:color|backgroundColor):\s*'([^']+)'/g)].map((m) => m[1]);
  for (const c of colors) assert.ok(/^var\(--cg-[a-z-]+\)$/.test(c), 'valeur de couleur hors token : ' + c);
});

test('vue Glass : aucune logique métier (ni API, ni authentification, ni rôle, ni stockage, ni navigation propre)', () => {
  for (const forbidden of [/\buseAuthStore\b/, /\bapi\./, /\bfetch\(/, /\baxios\b/, /\.role\b/, /\buser\b/, /\bADMIN\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\buseRouter\b/, /router\.push/, /\buseEffect\b/, /\bsetData\b/]) {
    assert.ok(!forbidden.test(viewCode), 'élément interdit dans la vue : ' + forbidden);
  }
});

test('vue Glass : primitives du Design System et accessibilité de structure', () => {
  assert.match(view, /from '@\/design-system\/kit'/);
  for (const name of ['PageHeader', 'GlassTable', 'StatusBadge', 'GlassButton']) assert.ok(view.includes(name), name);
  assert.match(view, /<PageHeader eyebrow="Vue globale" title="Portefeuille des activités" \/>/);
  assert.match(view, /role="progressbar"/);
  assert.match(view, /role="status"/);
  assert.match(view, /Télécharger \$\{row\.label\} au format calendrier/);
});

test('vue Glass (Phase 07B) : ouverture du projet au clavier par un bouton natif, sans rôle ARIA ni tabindex artificiels', () => {
  // Un seul point d'ouverture clavier, utilisé par le tableau ET par les cartes mobiles.
  assert.equal((viewCode.match(/openButton\(row, (true|false)\)/g) || []).length, 2);
  assert.match(viewCode, /<GlassButton[\s\S]{0,120}variant="ghost"[\s\S]{0,200}Ouvrir le projet de \$\{row\.clientName\} : \$\{row\.label\}/);
  assert.match(viewCode, /e\.stopPropagation\(\); props\.onOpen\(row\.projectId\)/, 'le bouton ne laisse pas le clic remonter à la ligne (pas de double ouverture)');
  assert.match(viewCode, /e\.stopPropagation\(\); props\.onDownloadIcs\(row\.id, row\.label\)/, 'le .ics reste une action distincte');
  assert.ok(!/role="(button|link|row|cell|gridcell)"/.test(viewCode), 'aucun rôle ARIA artificiel sur des éléments natifs');
  assert.ok(!/tabIndex/i.test(viewCode), 'aucun tabindex : les boutons natifs suffisent');
  assert.ok(!/onKeyDown|onKeyUp|onKeyPress/.test(viewCode), 'aucun gestionnaire clavier manuel : Entrée et Espace restent natifs');
  assert.match(viewCode, /focusable=\{false\}/, 'chaque ligne contient un bouton focalisable : le conteneur défilant n’est plus un arrêt de tabulation');
  // Le clic souris sur la ligne ou la carte reste un confort (sans rôle).
  assert.match(viewCode, /<tr key=\{row\.id\}[^>]*onClick=\{\(\) => props\.onOpen\(row\.projectId\)\}/);
  assert.match(viewCode, /<div onClick=\{\(\) => props\.onOpen\(row\.projectId\)\}[^>]*cg-glass cg-lift/);
});

test('vue Glass : libellés Legacy conservés (statistiques, filtres, en-têtes, états)', () => {
  for (const text of ['Total activités', 'Terminées', 'À faire', 'Reportées', 'Progression globale', 'Tous les clients', 'Tous les statuts', 'Tous les types',
    'Aucune activité trouvée', 'Chargement du portefeuille...', 'Date à définir', 'Présentiel', 'Teams', 'Télécharger .ics']) {
    assert.ok(view.includes(text), 'libellé manquant : ' + text);
  }
  for (const col of ['Client', 'Bâtiment', 'Activité', 'Mode', 'Date prévue', 'Statut']) assert.ok(view.includes(`'${col}'`), 'en-tête manquant : ' + col);
});

test('registre : /activities/portfolio est en bêta native (jamais ga) ; les autres routes de travail ne sont ni natives ni ga (au plus re-teintées)', () => {
  const byPattern = new Map(ROUTE_REGISTRY.map((e) => [e.pattern, e]));
  assert.equal(byPattern.get('/activities/portfolio').status, 'beta');
  assert.equal(byPattern.get('/activities/portfolio').render, undefined, 'écran Glass natif');
  for (const p of ['/projects', '/projects/[id]/activities', '/timelog', '/planning', '/notifications']) {
    const e = byPattern.get(p);
    assert.notEqual(e.status, 'ga', p);
    assert.ok(e.status === 'legacy-only' || e.render === 'skin', `${p} : jamais Glass natif`);
  }
});
