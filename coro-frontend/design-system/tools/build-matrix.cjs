/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Matrice de couverture V2 (mandat 49) : inventaire + registre + balayage visuel + preuves fonctionnelles.
 *
 *   node design-system/tools/build-matrix.cjs --sweep-app A.json[,B.json] --sweep-portal C.json[,D.json] --validation validation-results.json --out docs/design/liquid-glass/v2
 *
 * Sorties : coverage-matrix.json et coverage-matrix.md (une ligne par route, deux applications). Règles de statut :
 *  - MIGRÉE        : route active (bêta re-teintée ou native), balayage visuel sans défaut ET tous les scripts de validation passés ;
 *  - MIGRÉE (À REVOIR) : route active, tests passés, mais balayage avec défauts signalés (voir colonne Visuel) ;
 *  - EXCLUE        : exception de sécurité documentée (reste Legacy) ;
 *  - NON VALIDÉE   : balayage ou test manquant ou en échec. Aucune route non testée n'est déclarée validée.
 * Les pourcentages de couverture comptent les routes ACTIVES (rendues en Glass avec le jeton de préproduction) ; les routes exclues
 * (exception de sécurité) comptent au dénominateur.
 */
const fs = require('node:fs');
const path = require('node:path');
require('../test-loader.cjs');
const { buildAll, REPO } = require('./inventory-v2.cjs');
const { ROUTE_REGISTRY } = require('../routes/route-registry.ts');
const PORTAL_REGISTRY = require('../../../coro-client-portal/design-system/routes/route-registry.ts').ROUTE_REGISTRY;

const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const list = (v) => (v ? v.split(',').filter(Boolean) : []);
const loadSweeps = (files) => {
  const byRoute = new Map();
  for (const f of files) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const prev = byRoute.get(r.pattern);
    // Plusieurs balayages (profils) : on garde le meilleur résultat accessible (sans défaut > défauts > inaccessible).
    const rank = (x) => (x.status === 'ok' ? 0 : x.status === 'defauts' ? 1 : 2);
    if (!prev || rank(r) < rank(prev)) byRoute.set(r.pattern, { ...r, profile: path.basename(path.dirname(f)) });
  }
  return byRoute;
};
const sweepApp = loadSweeps(list(opt('--sweep-app')));
const sweepPortal = loadSweeps(list(opt('--sweep-portal')));
const validation = opt('--validation') ? JSON.parse(fs.readFileSync(opt('--validation'), 'utf8')).results : [];
const vstate = (app, script) => { const r = validation.find((x) => x.app === app && x.script === script); return r ? (r.exit === 0 ? 'PASS' : 'FAIL') : 'ABSENT'; };

const rows = buildAll().map((row) => {
  const registry = (row.app === 'app' ? ROUTE_REGISTRY : PORTAL_REGISTRY).find((e) => e.pattern === row.route);
  const sweep = (row.app === 'app' ? sweepApp : sweepPortal).get(row.route);
  const scripts = registry && registry.validation ? [...registry.validation] : [];
  const tests = scripts.map((s) => ({ script: s, result: vstate(row.app, s) }));
  const testsOk = tests.every((t) => t.result === 'PASS');
  let status;
  if (!registry) status = 'NON VALIDÉE';
  else if (registry.exception) status = 'EXCLUE';
  else if (registry.status === 'legacy-only') status = 'EXCLUE';
  else if (registry.devOnly) status = 'OUTIL DE DÉVELOPPEMENT';
  else if (registry.status === 'ga') status = 'GA (pilote)';
  else if (!sweep || sweep.status === 'inaccessible') status = 'NON VALIDÉE';
  else if (!testsOk) status = 'NON VALIDÉE';
  else status = sweep.status === 'ok' ? 'MIGRÉE' : 'MIGRÉE (À REVOIR)';
  const render = registry ? (registry.render === 'skin' ? (registry.shell === 'app' ? 'skin + shell Glass' : 'skin (plein écran)') : registry.status === 'legacy-only' ? 'Legacy' : 'Glass natif') : 'Legacy';
  return {
    app: row.app, route: row.route, layout: row.layout, style: row.styling, components: row.sharedComponents.length,
    forms: row.forms, tables: row.tables, modals: row.modalFiles, destructive: row.destructiveFiles, responsive: row.responsiveHints,
    sensitivity: row.sensitivity, registryStatus: registry ? registry.status : null, render, tests, status,
    exception: registry && registry.exception ? true : false,
    visual: sweep ? { status: sweep.status, profile: sweep.profile, issues: sweep.issues.slice(0, 6), measures: sweep.measures.length } : null,
    localTests: row.tests,
  };
});

const pct = (app) => {
  const list = rows.filter((r) => r.app === app && r.status !== 'OUTIL DE DÉVELOPPEMENT');
  const active = list.filter((r) => ['MIGRÉE', 'MIGRÉE (À REVOIR)', 'GA (pilote)'].includes(r.status));
  const validated = list.filter((r) => ['MIGRÉE', 'GA (pilote)'].includes(r.status));
  return { total: list.length, active: active.length, validated: validated.length, activePct: Math.round((1000 * active.length) / list.length) / 10, validatedPct: Math.round((1000 * validated.length) / list.length) / 10 };
};
const summary = { app: pct('app'), portal: pct('portal') };

const outDir = opt('--out') || path.join(REPO, 'docs', 'design', 'liquid-glass', 'v2');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'coverage-matrix.json'), JSON.stringify({ summary, rows }, null, 2) + '\n');

const md = [];
md.push('# Matrice de couverture Liquid Glass V2 — acceptation page par page', '');
md.push('Générée par `design-system/tools/build-matrix.cjs` à partir de l’inventaire des pages, du registre de routes, du balayage visuel réel (Chrome, Light/Dark, 320/390/768/1600 px, sessions d’un backend de test jetable) et de l’exécution de tous les scripts de test. Le site vitrine `coro-website` est **exclu**.', '');
md.push('| | Routes | Actives en Glass (préproduction) | Validées sans réserve | Couverture visuelle |', '|---|---:|---:|---:|---:|');
md.push(`| Application CORO | ${summary.app.total} | ${summary.app.active} | ${summary.app.validated} | **${summary.app.activePct} %** |`);
md.push(`| Portail client | ${summary.portal.total} | ${summary.portal.active} | ${summary.portal.validated} | **${summary.portal.activePct} %** |`, '');
for (const app of ['app', 'portal']) {
  md.push(`## ${app === 'app' ? 'Application CORO' : 'Portail client'}`, '');
  md.push('| Route | Rendu | Style | Formulaires | Tables | Modales | Sensibilité | Visuel (L/D × 4 largeurs) | Tests de validation | Statut |', '|---|---|---|---:|---:|---:|---|---|---|---|');
  for (const r of rows.filter((x) => x.app === app)) {
    const vis = r.visual ? (r.visual.status === 'ok' ? 'OK' : r.visual.status === 'defauts' ? `RÉSERVES (${r.visual.issues.length})` : 'INACCESSIBLE') : '—';
    const tests = r.tests.length ? r.tests.map((t) => `${t.script}: ${t.result}`).join('<br>') : (r.localTests.length ? 'tests locaux' : '—');
    md.push(`| \`${r.route}\` | ${r.render} | ${r.style.join('+')} | ${r.forms} | ${r.tables} | ${r.modals} | ${r.sensitivity.join(', ') || '—'} | ${vis} | ${tests} | **${r.status}** |`);
  }
  md.push('');
}
fs.writeFileSync(path.join(outDir, 'coverage-matrix.md'), md.join('\n') + '\n');
console.log(JSON.stringify(summary));
