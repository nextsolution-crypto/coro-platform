/* eslint-disable @typescript-eslint/no-require-imports */
// Contrat de la migration Liquid Glass de /profile/rendement (Phase 08A).
// Garantit statiquement : Legacy intact, pas de couleur en dur nouvelle, aucune logique métier dans la vue Glass,
// ouverture des mandats par des boutons natifs, registre en bêta (jamais ga). Le comportement réel est vérifié en navigateur
// par les scénarios rendement-* du banc.
require('../../../design-system/test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8').replace(/\r\n/g, '\n');
const view = fs.readFileSync(path.join(__dirname, 'RendementGlassView.tsx'), 'utf8').replace(/\r\n/g, '\n');
const viewCode = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const { ROUTE_REGISTRY } = require('../../../design-system/routes/route-registry.ts');

// Empreinte (SHA-256) de app/profile/rendement/page.tsx tel que commité avant la migration (20d9f09d), fins de ligne LF.
const LEGACY_PAGE_SHA256 = '1462244e51d9430d61832e8847e738f217df7d126c424d156cc34c41695db1d6';
const LEGACY_HEX_COUNT = 62;

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
  assert.equal(sha, LEGACY_PAGE_SHA256, 'le code Legacy de /profile/rendement a été modifié : mettre à jour cette empreinte est une décision de revue');
});

test('page.tsx : aucune couleur en dur ajoutée', () => {
  assert.equal((page.match(/#[0-9A-Fa-f]{6}\b/g) || []).length, LEGACY_HEX_COUNT);
});

test('page.tsx : la vue Glass n’est rendue que si Glass est actif ET la route rendue en Glass (jamais en îlot), après le garde utilisateur', () => {
  assert.match(page, /if \(ui === 'glass' && routeMode === 'glass'\) \{/);
  assert.match(page, /<RendementGlassView/);
  const begins = page.split('\n').filter((l) => l.includes('GLASS:begin')).length;
  assert.equal(begins, page.split('\n').filter((l) => l.includes('GLASS:end')).length, 'blocs équilibrés');
  assert.equal(begins, 3, 'trois points d’insertion seulement : imports, hook, retour conditionnel');
  assert.ok(page.indexOf('if (!user) return null;') < page.indexOf("if (ui === 'glass'"), 'le garde « utilisateur absent » reste appliqué avant la vue Glass');
});

test('page.tsx : période, chargement de /rendement et ouverture d’un mandat restent ceux du Legacy (une seule implémentation)', () => {
  const legacy = withoutGlassBlocks(page);
  for (const needle of ["api.get('/rendement'", 'userId: user.id', 'res.data?.conseillers?.[0]', 'const getDateRange', "router.push(`/projects/${mandat.projectId}/mandate`)", "{ id: 'custom', label: 'Personnalisé' }"]) {
    assert.ok(legacy.includes(needle), 'élément métier attendu dans la page : ' + needle);
  }
  assert.match(page, /onOpen=\{projectId => router\.push\(`\/projects\/\$\{projectId\}\/mandate`\)\}/, 'même destination en Glass');
  assert.ok(!/\bapi\b|\bfetch\(/.test(viewCode), 'la vue ne charge rien');
});

test('vue Glass : aucune couleur en dur (tokens --cg-* uniquement)', () => {
  assert.deepEqual(view.match(/#[0-9A-Fa-f]{3,8}\b/g) || [], []);
  assert.deepEqual(view.match(/\b(rgb|rgba|hsl|oklch)\(/g) || [], []);
  const colors = [...viewCode.matchAll(/(?:color|backgroundColor):\s*'([^']+)'/g)].map((m) => m[1]);
  for (const c of colors) assert.ok(/^var\(--cg-[a-z-]+\)$/.test(c), 'valeur de couleur hors token : ' + c);
  const tokens = [...viewCode.matchAll(/'var\((--cg-[a-z-]+)\)'/g)].map((m) => m[1]);
  assert.ok(tokens.length >= 10);
});

test('vue Glass : aucune logique métier (ni API, ni authentification, ni rôle, ni stockage, ni navigation propre, ni calcul de période)', () => {
  for (const forbidden of [/\buseAuthStore\b/, /\bapi\./, /\bfetch\(/, /\baxios\b/, /\.role\b/, /\buser\b/, /\bADMIN\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\buseRouter\b/, /router\.push/, /\buseEffect\b/, /\buseState\b/, /\bnew Date\b/, /\bgetDateRange\b/, /\bsetData\b/]) {
    assert.ok(!forbidden.test(viewCode), 'élément interdit dans la vue : ' + forbidden);
  }
});

test('vue Glass : primitives du Design System, structure et libellés Legacy conservés', () => {
  assert.match(view, /from '@\/design-system\/kit'/);
  for (const name of ['PageHeader', 'GlassTable', 'GlassButton', 'GlassField']) assert.ok(view.includes(name), name);
  assert.match(view, /<PageHeader eyebrow="Mon profil" title="Mon rendement" \/>/);
  assert.match(view, /role="status"/);
  for (const text of ['Heures saisies', 'Revenus générés', 'Mandats actifs', 'Détail par mandat', 'Aucune heure saisie pour cette période', 'Chargement...',
    'Du', 'Au', 'Heures', 'Montant vendu', 'Coût réel', 'Marge', 'Voir le mandat']) {
    assert.ok(view.includes(text), 'libellé manquant : ' + text);
  }
  for (const col of ['Client', 'Mandat']) assert.ok(view.includes(`'${col}'`), 'en-tête manquant : ' + col);
  // Formatage d'affichage identique au Legacy.
  assert.ok(view.includes('value.toFixed(1)}h') && view.includes('value.toFixed(0)} $') && view.includes('m.marge.toFixed(0)} $ (${m.margePct}%)'));
});

test('vue Glass (Phase 08B) : marge indisponible (montant vendu à zéro) = tiret neutre, formules et formats inchangés', () => {
  assert.ok(viewCode.includes("const marginToken = (m: RendementMandat) => (m.montantVendu <= 0 ? 'var(--cg-text-secondary)' : m.marge >= 0 ? 'var(--cg-success-fg)' : 'var(--cg-danger-fg)');"), 'tiret neutre quand le montant vendu est à zéro');
  assert.ok(viewCode.includes("const marginText = (m: RendementMandat) => (m.montantVendu > 0 ? `${m.marge.toFixed(0)} $ (${m.margePct}%)` : '—');"), 'même condition et même format que le Legacy');
  const legacy = withoutGlassBlocks(page);
  assert.ok(legacy.includes("color: mandat.marge >= 0 ? '#27AE60' : '#C0392B'"), 'le Legacy colore toujours selon le signe de la marge (non modifié)');
  assert.ok(legacy.includes('{mandat.montantVendu > 0') && legacy.includes('`${mandat.marge.toFixed(0)} $ (${mandat.margePct}%)`'), 'condition et format Legacy inchangés');
  // Aucun calcul financier dans la vue : pas d'opérateur arithmétique appliqué aux champs financiers (le tiret « — » et les formats sont des affichages).
  assert.ok(!/\b(margePct|marge|montantVendu|coutReel|heures|heuresTotal|revenusTotal)\s*[-+*/]\s*[\w(]/.test(viewCode), 'aucun calcul financier dans la vue');
});

test('vue Glass : confidentialité — aucun stockage, aucune URL, aucun appel, aucun effet, aucune journalisation', () => {
  for (const forbidden of [/localStorage/, /sessionStorage/, /indexedDB/, /document.cookie/, /URLSearchParams/, /location/, /history/, /window/, /console/, /navigator/, /fetch/, /XMLHttpRequest/, /sendBeacon/, /useEffect/]) assert.ok(!forbidden.test(viewCode), 'interdit dans la vue : ' + forbidden);
  const imports = [...view.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['@/design-system/kit', 'lucide-react', 'react'], 'imports de la vue : React, icônes et kit seulement');
  const hrefs = viewCode.match(/href=/g) || [];
  assert.equal(hrefs.length, 0, 'aucun lien : la navigation passe par onOpen');
});

test('vue Glass : période = boutons natifs à bascule (aria-pressed) dans un fieldset nommé, champs de date étiquetés', () => {
  assert.match(viewCode, /<fieldset[\s\S]*<legend className="sr-only">Période<\/legend>/);
  assert.match(viewCode, /aria-pressed=\{props\.viewMode === m\.id\}/);
  assert.match(viewCode, /<GlassField label="Du">/);
  assert.match(viewCode, /<GlassField label="Au">/);
  assert.match(viewCode, /type="date"/);
});

test('vue Glass : ouverture d’un mandat au clavier par un bouton natif, sans rôle ARIA ni tabindex artificiels', () => {
  assert.equal((viewCode.match(/\{openButton\(m\)\}/g) || []).length, 2, 'un seul point d’ouverture, utilisé par le tableau ET les cartes');
  assert.match(viewCode, /<GlassButton[\s\S]{0,60}variant="ghost"[\s\S]{0,120}Ouvrir le mandat \$\{m\.projectName\} de \$\{m\.clientName\}/);
  assert.match(viewCode, /e\.stopPropagation\(\); props\.onOpen\(m\.projectId\)/, 'pas de double ouverture par remontée du clic');
  assert.ok(!/role="(button|link|row|cell|gridcell)"/.test(viewCode), 'aucun rôle ARIA artificiel sur des éléments natifs');
  assert.ok(!/tabIndex/i.test(viewCode) && !/onKeyDown|onKeyUp|onKeyPress/.test(viewCode), 'ni tabindex ni gestionnaire clavier manuel');
  assert.match(viewCode, /focusable=\{false\}/);
  assert.match(viewCode, /<tr key=\{m\.projectId\}[^>]*onClick=\{\(\) => props\.onOpen\(m\.projectId\)\}/);
  assert.match(viewCode, /<div onClick=\{\(\) => props\.onOpen\(m\.projectId\)\}[^>]*cg-glass cg-lift/);
  assert.match(viewCode, /<p aria-hidden="true"[^>]*>\s*Voir le mandat →/, 'l’indication visuelle n’est pas lue deux fois');
});

test('registre : /profile/rendement est en bêta (jamais ga) ; /profile reste ga, les autres routes de travail legacy-only', () => {
  const entry = ROUTE_REGISTRY.find((e) => e.pattern === '/profile/rendement');
  assert.equal(entry.status, 'beta');
  assert.equal(ROUTE_REGISTRY.find((e) => e.pattern === '/profile').status, 'ga');
  assert.equal(ROUTE_REGISTRY.find((e) => e.pattern === '/dashboard/rendement').status, 'legacy-only', 'le rendement du tableau de bord n’est pas migré');
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta').map((e) => e.pattern).sort(), ['/activities/portfolio', '/profile/rendement', '/settings']);
});
