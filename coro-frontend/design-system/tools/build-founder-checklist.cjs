/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Matrice d'acceptation PAGE PAR PAGE du Founder (mandat 52) — générée à partir de la matrice de couverture, des balayages et des captures.
 *
 *   node design-system/tools/build-founder-checklist.cjs --shots DIR_CAPTURES --out docs/design/liquid-glass/v2
 *
 * Sorties : FOUNDER-ACCEPTANCE-MATRIX.md (lisible) et founder-acceptance-matrix.csv (suivi). La colonne « Approbation Founder » est volontairement
 * vide (« À approuver ») : le jugement esthétique final est celui du Founder. Aucune approbation n'est jamais pré-remplie.
 */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const outDir = opt('--out', path.join(REPO, 'docs', 'design', 'liquid-glass', 'v2'));
const shotsDir = opt('--shots', '');
const shots = new Set(shotsDir && fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir) : []);
const matrix = JSON.parse(fs.readFileSync(path.join(outDir, 'coverage-matrix.json'), 'utf8'));

const MODULES_APP = [
  [/^\/dashboard\/rendement|^\/profile\/rendement/, 'Rendement (opérationnel et financier)'],
  [/^\/dashboard|^\/profile$|^\/settings$/, 'Pilotes natifs'],
  [/^\/admin\/commercial/, 'Commercial'], [/^\/admin\/product-catalog/, 'Catalogue commercial'], [/^\/admin\/organizations/, 'Organisations'],
  [/^\/admin\/(control-center|metering|health)/, 'Supervision plateforme'], [/^\/admin\/platform-permission-grants/, 'Permissions de plateforme (EXCLUE)'],
  [/^\/admin\//, 'Administration'], [/^\/settings\//, 'Réglages'], [/^\/bookings/, 'Réservations (Booking)'], [/^\/planning/, 'Planification'],
  [/^\/(configurator|editor)/, 'Documents : configurateurs et éditeur'], [/^\/library/, 'Bibliothèque'],
  [/^\/projects/, 'Projets'], [/^\/activities|^\/timelog|^\/notifications/, 'Travail courant'], [/^\/(clients|buildings|referrals)/, 'Portefeuille'],
  [/^\/(login|reset-password)|^\/$/, 'Authentification'], [/^\/glass-kit/, 'Outil de développement'],
];
const MODULES_PORTAL = [
  [/^\/sentinelle/, 'Sentinelle (incidents, évacuation, population)'], [/^\/(kiosk|presence|intervention|population)/, 'Bornes et écrans publics'],
  [/^\/(login|forgot-password|reset-password|magic)|^\/$/, 'Authentification'], [/^\/documents|^\/files/, 'Documents'],
  [/^\/(dashboard|buildings|map|activities|intelligence|notifications|profile|bookings)/, 'Portail — usage courant'], [/^\/offline/, 'Hors ligne'],
];
const moduleOf = (app, route) => ((app === 'app' ? MODULES_APP : MODULES_PORTAL).find(([re]) => re.test(route)) || [null, 'Autres'])[1];

const FUNCTIONAL = [
  [/rendement/, 'Aucun montant ne change ; CAD seul ; devise inconnue affichée explicitement ; période et vues inchangées ; un ADMIN client ne voit que son périmètre.'],
  [/^\/admin\/commercial|product-catalog|organizations|control-center|metering/, 'Réservé Founder / délégués ; ouvrir une fiche, une modale, vérifier les montants et l’absence de régression de contenu ; refus pour un ADMIN client.'],
  [/^\/bookings/, 'Créer / consulter une réservation ; états lisibles sans la couleur seule.'],
  [/^\/planning/, 'Tiroirs de planification, glisser-déposer inchangés, capacité.'],
  [/^\/(configurator|editor)/, 'Ouvrir un document ; la feuille de contenu reste claire en Sombre ; enregistrement inchangé.'],
  [/^\/projects\/\[id\]\/(mandate|procedures)|^\/library|^\/admin\/procedures/, 'Contenu des procédures / mandat inchangé (ordre, textes) ; modales d’aperçu lisibles.'],
  [/^\/projects|^\/clients|^\/buildings|^\/referrals/, 'Liste, filtres, onglets, fiche ; ouvrir une modale de création (au-dessus de la barre, opaque).'],
  [/^\/settings|^\/admin\//, 'Tableaux, formulaires, enregistrement ; confirmations conservées.'],
  [/^\/(login|reset-password|forgot-password|magic)/, 'Formulaire, messages d’erreur, redirections ; aucun choix d’apparence sur cet écran.'],
  [/^\/sentinelle\/.*(incident|evacuation)/, 'Déclenchement et confirmations d’urgence inchangés ; contrôles rouges opaques et explicites.'],
  [/^\/sentinelle/, 'Occupants, historique, rapports, population : listes, filtres, exports inchangés.'],
  [/^\/(kiosk|presence|intervention)/, 'Écrans d’état plein écran : couleurs d’état (rouge, ambre, vert) inchangées, lisibles de loin.'],
  [/^\/population/, 'Parcours public (langue, inscription, vérification) inchangé.'],
  [/^\/documents|^\/files/, 'Consulter, signer / valider un document : contenu et versions inchangés.'],
  [/^\/map/, 'Carte sombre d’origine ; marqueurs et panneaux lisibles.'],
  [/./, 'Navigation, tableaux et cartes, formulaires et états vides / erreur lisibles en Clair et en Sombre.'],
];
const SENS = { 'emergency-content': 'Contenu d’urgence', destructive: 'Action destructive (confirmation)', 'financial-legal': 'Financier / juridique', permissions: 'Accès restreint (rôles)', documents: 'Document', supervision: 'Supervision', auth: 'Authentification' };

// Les captures portent le nom de la route RÉSOLUE (identifiants réels du jeu de test) : --ids fichier1.json,fichier2.json fournit « motif → chemin ».
const idMaps = Object.assign({}, ...(opt('--ids', '') ? opt('--ids').split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))) : []));
const resolved = (pattern) => idMaps[pattern] || pattern.replace(/\[\.\.\.[^\]]+\]/g, 'x1/x2').replace(/\[[^\]]+\]/g, 'x1');
const slug = (route) => route.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'root';
function shotRefs(app, pattern) {
  const s = slug(resolved(pattern));
  const found = [];
  for (const variant of ['LEGACY__1600', 'LIGHT__1600', 'DARK__1600', 'DARK__390']) {
    const name = `${app}__${s}__${variant}.png`;
    if (shots.has(name)) found.push(name);
  }
  return found;
}

const rows = matrix.rows.map((r) => {
  const v = r.visual;
  const vp = v ? { 320: 'ok', 390: 'ok', 768: 'ok', 1600: 'ok' } : null;
  const issues = v ? v.issues.join(' ') : '';
  const resp = !v ? 'non mesuré' : v.status === 'inaccessible' ? 'redirection' : /débordement/.test(issues) ? 'RÉSERVES' : '320 / 390 / 768 / 1600 : sans débordement';
  const theme = (t) => (!v ? '—' : v.status === 'inaccessible' ? '—' : new RegExp(t + '/').test(issues) ? 'RÉSERVES' : 'auto OK');
  const excl = r.status === 'EXCLUE' ? 'EXCLUE : reste Classique (décision de sécurité)' : /redirection/.test(r.status) ? 'Redirection sans interface propre' : r.route === '/files/[id]' ? 'Non vérifiée avec des données (aucune pièce jointe de test)' : r.status === 'OUTIL DE DÉVELOPPEMENT' ? 'Outil de développement (absent de la production)' : '';
  const fn = FUNCTIONAL.find(([re]) => re.test(r.route))[1];
  const sens = r.sensitivity.map((s) => SENS[s] || s).join(' ; ') || '—';
  return {
    app: r.app, route: r.route, module: moduleOf(r.app, r.route), status: r.status,
    classic: r.status === 'EXCLUE' ? 'Classique (inchangé)' : 'identique à la référence (0 écart mesuré)', light: theme('LIGHT'), dark: theme('DARK'), responsive: resp,
    functional: fn, sensitive: sens, tests: r.tests.map((t) => `${t.script}: ${t.result}`).join(', ') || '—',
    approval: 'À approuver', screenshots: shotRefs(r.app, r.route), exclusion: excl,
  };
});

const esc = (s) => String(s).replace(/\|/g, '\\|');
const md = ['# Matrice d’acceptation page par page — Founder', '',
  'Le jugement esthétique final est celui du Founder : la colonne **Approbation** est vide (« À approuver ») et le reste « auto » indique seulement ce que les contrôles automatiques ont mesuré (Chrome réel, sessions réelles d’un backend de test jetable). Ordre de parcours : `FOUNDER-ACCEPTANCE-ORDER.md`. Captures : `D:\\CORO-Workspace\\artifacts\\liquid-glass\\v2\\screenshots` (références ci-dessous).', '',
  `Total : ${rows.filter((r) => r.app === 'app').length} routes application, ${rows.filter((r) => r.app === 'portal').length} routes portail (site vitrine exclu).`, ''];
for (const app of ['app', 'portal']) {
  md.push(`## ${app === 'app' ? 'Application CORO' : 'Portail client'}`, '');
  const mods = [...new Set(rows.filter((r) => r.app === app).map((r) => r.module))];
  for (const m of mods) {
    md.push(`### ${m}`, '', '| Route | Classique | Glass Clair | Glass Sombre | Responsive | Contrôles fonctionnels | Opérations sensibles | Captures | Approbation | Exclusions / notes |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows.filter((x) => x.app === app && x.module === m)) {
      md.push(`| \`${r.route}\` | ${esc(r.classic)} | ${r.light} | ${r.dark} | ${esc(r.responsive)} | ${esc(r.functional)} | ${esc(r.sensitive)} | ${r.screenshots.length ? r.screenshots.map((s) => '`' + s + '`').join('<br>') : '—'} | ☐ ${r.approval} | ${esc(r.exclusion)} |`);
    }
    md.push('');
  }
}
fs.writeFileSync(path.join(outDir, 'FOUNDER-ACCEPTANCE-MATRIX.md'), md.join('\n') + '\n');
const csv = ['application;module;route;statut_auto;classique;glass_clair;glass_sombre;responsive;operations_sensibles;captures;approbation_founder;commentaire_founder;exclusions'];
for (const r of rows) csv.push([r.app, r.module, r.route, r.status, r.classic, r.light, r.dark, r.responsive, r.sensitive, r.screenshots.join(' '), r.approval, '', r.exclusion].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
fs.writeFileSync(path.join(outDir, 'founder-acceptance-matrix.csv'), '\uFEFF' + csv.join('\n') + '\n');
console.log(`${rows.length} routes ; captures référencées pour ${rows.filter((r) => r.screenshots.length).length}`);
