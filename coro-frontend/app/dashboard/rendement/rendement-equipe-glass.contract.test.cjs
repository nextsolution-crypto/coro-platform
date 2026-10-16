/* eslint-disable @typescript-eslint/no-require-imports */
// Contrat de la migration Liquid Glass de /dashboard/rendement — rendement de l'équipe (Phase 09A).
// Garantit statiquement : Legacy intact, pas de couleur en dur nouvelle, aucune logique métier ni calcul financier dans la vue,
// aucune fuite (stockage, URL, réseau), boutons natifs pour le clavier, valeurs indisponibles neutres, registre en bêta (jamais ga).
// Le comportement réel est vérifié en navigateur par les scénarios rendement-equipe-* du banc.
require('../../../design-system/test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8').replace(/\r\n/g, '\n');
const view = fs.readFileSync(path.join(__dirname, 'RendementEquipeGlassView.tsx'), 'utf8').replace(/\r\n/g, '\n');
const viewCode = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const { ROUTE_REGISTRY } = require('../../../design-system/routes/route-registry.ts');

// Empreinte (SHA-256) de app/dashboard/rendement/page.tsx tel que commité avant la migration (bad470c1), fins de ligne LF.
const LEGACY_PAGE_SHA256 = '6a68168d741652e9a8a878b477c020ba60b1e4fa2983b02a62e7d52e5a1bc8bc';
const LEGACY_HEX_COUNT = 56;

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
  assert.equal(sha, LEGACY_PAGE_SHA256, 'le code Legacy de /dashboard/rendement a été modifié : mettre à jour cette empreinte est une décision de revue');
});

test('page.tsx : aucune couleur en dur ajoutée', () => {
  assert.equal((page.match(/#[0-9A-Fa-f]{6}\b/g) || []).length, LEGACY_HEX_COUNT);
});

test('page.tsx : la vue Glass n’est rendue que si Glass est actif ET la route rendue en Glass (jamais en îlot), après le garde utilisateur', () => {
  assert.match(page, /if \(ui === 'glass' && routeMode === 'glass'\) \{/);
  assert.match(page, /<RendementEquipeGlassView/);
  const begins = page.split('\n').filter((l) => l.includes('GLASS:begin')).length;
  assert.equal(begins, page.split('\n').filter((l) => l.includes('GLASS:end')).length, 'blocs équilibrés');
  assert.equal(begins, 3, 'trois points d’insertion seulement : imports, hook, retour conditionnel');
  assert.ok(page.indexOf('if (!user) return null;') < page.indexOf("if (ui === 'glass'"), 'le garde « utilisateur absent » reste appliqué avant la vue Glass');
});

test('page.tsx : période, chargement de /rendement, dépliage et ouverture d’un mandat restent ceux du Legacy (une seule implémentation)', () => {
  const legacy = withoutGlassBlocks(page);
  for (const needle of ["api.get('/rendement', { params })", 'if (filterUser) params.userId = filterUser;', 'setData(res.data);', 'const getDateRange',
    'setExpandedUser(expandedUser === conseiller.userId ? null : conseiller.userId)', "router.push(`/projects/${mandat.projectId}/mandate`)", "{ id: 'custom', label: 'Personnalisé' }"]) {
    assert.ok(legacy.includes(needle), 'élément métier attendu dans la page : ' + needle);
  }
  assert.match(page, /onToggleUser=\{userId => setExpandedUser\(expandedUser === userId \? null : userId\)\}/, 'même règle de dépliage (un seul conseiller à la fois)');
  assert.match(page, /onOpen=\{projectId => router\.push\(`\/projects\/\$\{projectId\}\/mandate`\)\}/, 'même destination en Glass');
  assert.match(page, /data=\{data\}/, 'la vue reçoit la réponse du backend telle quelle');
  assert.ok(!/\bapi\b|\bfetch\(/.test(viewCode), 'la vue ne charge rien');
});

test('vue Glass : aucune couleur en dur (tokens --cg-* uniquement)', () => {
  assert.deepEqual(view.match(/#[0-9A-Fa-f]{3,8}\b/g) || [], []);
  assert.deepEqual(view.match(/\b(rgb|rgba|hsl|oklch)\(/g) || [], []);
  const colors = [...viewCode.matchAll(/(?:color|backgroundColor):\s*'([^']+)'/g)].map((m) => m[1]);
  for (const c of colors) assert.ok(/^var\(--cg-[a-z-]+\)$/.test(c), 'valeur de couleur hors token : ' + c);
  assert.match(viewCode, /const NEUTRAL = 'var\(--cg-text-secondary\)';/);
});

test('vue Glass : aucune logique métier ni calcul financier (ni API, ni rôle, ni période, ni agrégat)', () => {
  for (const forbidden of [/\buseAuthStore\b/, /\bapi\./, /\bfetch\(/, /\baxios\b/, /\.role\b/, /\buser\b/, /\bADMIN\b/, /\buseRouter\b/, /router\.push/, /\buseEffect\b/, /\buseState\b/,
    /\bnew Date\b/, /\bgetDateRange\b/, /\bsetData\b/, /\.reduce\(/, /\bMath\./, /\.sort\(/, /\.filter\(/, /\bfilterUser\b/]) {
    assert.ok(!forbidden.test(viewCode), 'élément interdit dans la vue : ' + forbidden);
  }
  // Aucun opérateur arithmétique appliqué aux champs financiers (les formats .toFixed et le tiret sont des affichages).
  assert.ok(!/\b(margePct|marge|montantVendu|coutReel|heures|heuresBudgetees|heuresTotal|revenusTotal|mandatsCount|mandatsDeficitaires)\s*[-+*/]\s*[\w(]/.test(viewCode), 'aucun calcul financier dans la vue');
});

test('vue Glass : confidentialité — aucun stockage, aucune URL, aucun appel réseau, aucune journalisation, aucun lien', () => {
  for (const forbidden of [/\blocalStorage\b/, /\bsessionStorage\b/, /\bindexedDB\b/, /\bdocument\.cookie\b/, /\bURLSearchParams\b/, /\blocation\b/, /\bhistory\b/, /\bwindow\b/, /\bconsole\b/, /\bnavigator\b/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/, /\bhref=/]) {
    assert.ok(!forbidden.test(viewCode), 'interdit dans la vue : ' + forbidden);
  }
  const imports = [...view.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['@/design-system/kit', 'lucide-react', 'react', 'react'], 'imports de la vue : React, icônes et kit seulement');
});

test('vue Glass : primitives du Design System, structure et libellés Legacy conservés', () => {
  assert.match(view, /from '@\/design-system\/kit'/);
  for (const name of ['PageHeader', 'GlassTable', 'GlassButton', 'GlassField', 'StatusBadge']) assert.ok(view.includes(name), name);
  assert.match(view, /<PageHeader eyebrow="Administration" title="Rendement & Rentabilité" \/>/);
  assert.match(view, /role="status"/);
  for (const text of ['Heures équipe', 'Revenus équipe', 'Mandats déficitaires', 'Aucune heure saisie pour cette période', 'Chargement...', 'Du', 'Au',
    'Heures', 'Revenus', 'Budget', 'Montant vendu', 'Coût réel', 'Marge', 'déficitaire', 'mandat']) {
    assert.ok(view.includes(text), 'libellé manquant : ' + text);
  }
  for (const col of ['Client', 'Mandat']) assert.ok(view.includes(`'${col}'`), 'en-tête manquant : ' + col);
  // Formatage d'affichage identique au Legacy.
  for (const fmt of ['value.toFixed(1)}h', 'value.toFixed(0)} $', '`${m.heuresBudgetees}h`', 'm.marge.toFixed(0)} $ (${m.margePct}%)', "n > 1 ? 's' : ''"]) assert.ok(view.includes(fmt), 'format manquant : ' + fmt);
  assert.match(viewCode, /\{!?data\.conseillers\.length === 0 \?|data\.conseillers\.length === 0 \?/);
});

test('vue Glass : une erreur de chargement n’affiche rien sous les contrôles (comme le Legacy), sans message inventé', () => {
  assert.match(viewCode, /let body: ReactNode = null;/);
  assert.match(viewCode, /\} else if \(data\) \{/);
});

test('vue Glass : période = boutons natifs à bascule (aria-pressed) dans un fieldset nommé, champs de date étiquetés', () => {
  assert.match(viewCode, /<fieldset[\s\S]*<legend className="sr-only">Période<\/legend>/);
  assert.match(viewCode, /aria-pressed=\{props\.viewMode === m\.id\}/);
  assert.match(viewCode, /<GlassField label="Du">/);
  assert.match(viewCode, /<GlassField label="Au">/);
  assert.match(viewCode, /type="date"/);
});

test('vue Glass : dépliage et ouverture au clavier par des boutons natifs, sans rôle ARIA ni tabindex artificiels', () => {
  assert.match(viewCode, /aria-expanded=\{open\}/);
  assert.match(viewCode, /aria-controls=\{open \? `\$\{uid\}-\$\{c\.userId\}` : undefined\}/);
  assert.match(viewCode, /onClick=\{\(\) => props\.onToggleUser\(c\.userId\)\}/);
  assert.equal((viewCode.match(/\{openButton\(m, c\.userName\)\}/g) || []).length, 2, 'un seul point d’ouverture, utilisé par le tableau ET les cartes');
  assert.match(viewCode, /Ouvrir le mandat \$\{m\.projectName\} de \$\{m\.clientName\} \(\$\{who\}\)/);
  assert.match(viewCode, /e\.stopPropagation\(\); props\.onOpen\(m\.projectId\)/, 'pas de double ouverture par remontée du clic');
  assert.ok(!/role="(button|link|row|cell|gridcell|region|tab|tablist|accordion)"/.test(viewCode), 'aucun rôle ARIA artificiel sur des éléments natifs');
  assert.ok(!/tabIndex/i.test(viewCode) && !/onKeyDown|onKeyUp|onKeyPress/.test(viewCode), 'ni tabindex ni gestionnaire clavier manuel');
  assert.match(viewCode, /focusable=\{false\}/);
  assert.match(viewCode, /<tr key=\{m\.projectId\}[^>]*onClick=\{\(\) => props\.onOpen\(m\.projectId\)\}/);
  assert.match(viewCode, /<div onClick=\{\(\) => props\.onOpen\(m\.projectId\)\}[^>]*cg-glass cg-lift/);
});

test('vue Glass : valeurs financières indisponibles (« — ») toujours en teinte neutre ; marge selon le signe sinon', () => {
  assert.ok(viewCode.includes("const marginToken = (m: EquipeMandat) => (m.montantVendu <= 0 ? NEUTRAL : m.marge >= 0 ? 'var(--cg-success-fg)' : 'var(--cg-danger-fg)');"));
  assert.ok(viewCode.includes("const marginText = (m: EquipeMandat) => (m.montantVendu > 0 ? `${m.marge.toFixed(0)} $ (${m.margePct}%)` : '—');"), 'même condition et même format que le Legacy');
  assert.ok(viewCode.includes("token: teamStats.revenusTotal > 0 ? 'var(--cg-success-fg)' : NEUTRAL"), 'revenus d’équipe indisponibles : neutre');
  assert.ok(viewCode.includes("color: c.revenusTotal > 0 ? 'var(--cg-success-fg)' : NEUTRAL"), 'revenus du conseiller indisponibles : neutre');
  const legacy = withoutGlassBlocks(page);
  assert.ok(legacy.includes("color: mandat.marge >= 0 ? '#27AE60' : '#C0392B'"), 'le Legacy est inchangé');
});

test('registre : /dashboard/rendement est en bêta (jamais ga) ; /dashboard reste ga, /profile/rendement bêta, aucune autre promotion', () => {
  assert.equal(ROUTE_REGISTRY.find((e) => e.pattern === '/dashboard/rendement').status, 'beta');
  assert.equal(ROUTE_REGISTRY.find((e) => e.pattern === '/dashboard').status, 'ga');
  assert.deepEqual(ROUTE_REGISTRY.filter((e) => e.status === 'beta').map((e) => e.pattern).sort(), ['/activities/portfolio', '/dashboard/rendement', '/profile/rendement', '/settings']);
});
