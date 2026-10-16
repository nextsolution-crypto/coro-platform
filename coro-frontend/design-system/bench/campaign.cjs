#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Campagne de validation REPRODUCTIBLE du Lot 1 (Legacy / Glass Light / Glass Dark) — OUTIL DE TEST UNIQUEMENT.
 * Remplace les scripts jetables (run-*.sh) qui vivaient hors du dépôt : tout est ici, en Node pur (aucun bash, aucun PowerShell).
 *
 *   node design-system/bench/campaign.cjs plan                          # affiche le plan (aucune exécution)
 *   node design-system/bench/campaign.cjs scenarios [--pages p,q] [--modes legacy,island,glass-dark,glass-light]
 *   node design-system/bench/campaign.cjs capture  --out DIR            # styles calculés Legacy + île (à faire AVANT/APRÈS une modification)
 *   node design-system/bench/campaign.cjs compare  --a DIR_AVANT --b DIR_APRES
 *   node design-system/bench/campaign.cjs contrast --out DIR            # contrastes WCAG Legacy puis Glass Light/Dark, avec comparaison
 *   node design-system/bench/campaign.cjs shots    --out DIR            # captures d'écran Glass Light/Dark aux 4 largeurs
 *   node design-system/bench/campaign.cjs all      --out DIR [--baseline DIR_AVANT]
 *
 * Pré-requis : un serveur du frontend sur BENCH_BASE_URL (défaut http://localhost:3010) dont NEXT_PUBLIC_API_URL pointe vers le faux API
 * (défaut http://localhost:3012/api, port BENCH_API_PORT). Le faux API est démarré et arrêté PAR la campagne, état par état.
 *   - Serveur de dev  : NEXT_PUBLIC_API_URL=http://localhost:3012/api npx next dev -p 3010   (la bêta s'active par la clé locale du banc ;
 *                       note : `next dev` réécrit coro-frontend/AGENTS.md)
 *   - Build de test   : voir design-system/PREPROD.md (NEXT_PUBLIC_GLASS_BETA=production-preview ; le mode « island » n'existe plus alors :
 *                       passer --modes legacy,glass-dark,glass-light).
 * Protocole « avant/après » : exécuter `capture` sur la version de référence (autre worktree ou commit), puis sur la version candidate,
 * puis `compare`. Aucune permutation de fichiers n'est nécessaire.
 * Le rapport (campaign-report.json) ne contient ni identifiants, ni jetons, ni donnée réelle.
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const CLI = path.join(__dirname, 'cli.cjs');
const MOCK = path.join(__dirname, 'mock-api.cjs');
const BASE = process.env.BENCH_BASE_URL || 'http://localhost:3010';
const API_PORT = Number(process.env.BENCH_API_PORT || 3012);
const W4 = '320,390,768,1600';
const MODES_ALL = ['legacy', 'island', 'glass-dark', 'glass-light'];
const DATA_KINDS_RECORD = ['data', 'mobile390', 'mobile320', 'tablet768', 'keyboard'];
const GLASS_KEYBOARD = ['kbopen-enter', 'kbopen-space', 'kbopen-mobile390'];

/** Dépliage du premier conseiller de la vue équipe (script exécuté dans la page, voir cli.cjs --eval). */
const EXPAND_FIRST_USER = "(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.includes('Sophie Martin'));if(b)b.click()})()";

/** États du faux API communs aux pages de rendement et au portfolio. */
const stateSet = (dataEnv, errorEnv, extraDataKinds = []) => ({
  data: { env: dataEnv, kinds: [...DATA_KINDS_RECORD, ...extraDataKinds] },
  empty: { env: {}, kinds: ['empty'] },
  error: { env: errorEnv, kinds: ['error'] },
  loading: { env: { BENCH_DELAY_MS: '20000' }, kinds: ['loading'] },
});

/** Les quatre pages du Lot 1. `scenarioPrefix` + `-<type>-<mode>` = nom d'un scénario enregistré dans scenarios.cjs. */
const PAGES = {
  settings: {
    route: '/settings', beta: true,
    fixedScenarios: ['settings-legacy', 'settings-island-no-beta', 'settings-glass-beta', 'settings-glass-beta-light', 'settings-role-conseiller', 'settings-role-conseiller-legacy',
      'settings-keyboard', 'settings-keyboard-legacy', 'settings-responsive-320', 'settings-responsive-390', 'settings-responsive-768', 'settings-responsive-1600'],
    states: { data: { env: {}, kinds: [] } },
  },
  portfolio: { route: '/activities/portfolio', beta: true, scenarioPrefix: 'portfolio', states: stateSet({ BENCH_ACTIVITIES: '1' }, { BENCH_FAIL_CLIENTS: '1' }, ['kbopen-enter', 'kbopen-space', 'kbopen-mobile390']) },
  rendement: { route: '/profile/rendement', beta: true, scenarioPrefix: 'rendement', states: stateSet({ BENCH_RENDEMENT: '1' }, { BENCH_FAIL_RENDEMENT: '1' }, ['kbperiod', ...GLASS_KEYBOARD]) },
  equipe: { route: '/dashboard/rendement', beta: true, scenarioPrefix: 'rendement-equipe', expandEval: EXPAND_FIRST_USER, states: stateSet({ BENCH_RENDEMENT: '1' }, { BENCH_FAIL_RENDEMENT: '1' }, ['kbperiod', ...GLASS_KEYBOARD]) },
};
/** Pages voisines surveillées contre toute régression (leur rendu ne doit pas changer). */
const REGRESSION_ROUTES = { plain: ['/dashboard', '/profile'], beta: [] };

/** Plan de scénarios : [{ page, state, env, names }]. Fonction pure (testée contre la liste réelle des scénarios enregistrés). */
function buildPlan({ pages = Object.keys(PAGES), modes = MODES_ALL, registered } = {}) {
  const plan = [];
  for (const key of pages) {
    const page = PAGES[key]; if (!page) throw new Error(`page inconnue : ${key} (attendu : ${Object.keys(PAGES).join(', ')})`);
    for (const [state, def] of Object.entries(page.states)) {
      let names;
      if (page.fixedScenarios) names = page.fixedScenarios.filter(() => state === 'data');
      else names = def.kinds.flatMap((kind) => modes.map((mode) => `${page.scenarioPrefix}-${kind}-${mode}`));
      if (registered) {
        names = names.filter((n) => {
          if (registered.has(n)) return true;
          // Les scénarios clavier Glass (kbopen, kbperiod) n'existent que pour les modes Glass : leur absence en Legacy/île est normale.
          if (/-(kbopen|kbperiod)/.test(n)) return false;
          throw new Error(`scénario introuvable dans le registre : ${n}`);
        });
      }
      if (names.length) plan.push({ page: key, state, env: def.env, names });
    }
  }
  return plan;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (url) => new Promise((resolve) => { const req = http.get(url, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); }); req.on('error', () => resolve(0)); req.setTimeout(60000, () => { req.destroy(); resolve(0); }); });

async function startMock(env) {
  const child = spawn(process.execPath, [MOCK], { env: { ...process.env, BENCH_API_PORT: String(API_PORT), ...env }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { if ((await get(`http://localhost:${API_PORT}/api/clients`)) === 200) return child; await sleep(250); }
  child.kill(); throw new Error(`le faux API n'a pas démarré sur le port ${API_PORT} (port occupé ?)`);
}
async function stopMock(child) { if (child) { child.kill(); await sleep(400); } }
async function withMock(env, fn) { const child = await startMock(env); try { return await fn(); } finally { await stopMock(child); } }

function cli(args, { quiet = false } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { env: { ...process.env, BENCH_BASE_URL: BASE }, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (!quiet) process.stdout.write(r.stdout || '');
  if (r.stderr && r.status) process.stderr.write(r.stderr);
  return { status: r.status, out: r.stdout || '' };
}
const warm = async (route) => { await get(BASE + route); await sleep(2500); };
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d);

async function requireServer() {
  const status = await get(`${BASE}/login`);
  if (status !== 200) { console.error(`ERREUR : aucun serveur frontend sur ${BASE} (HTTP ${status}). Voir l'en-tête de ce fichier ou design-system/PREPROD.md.`); process.exit(2); }
}
const report = { steps: [] };
function finish(outDir, failed) {
  if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'campaign-report.json'), JSON.stringify({ date: new Date().toISOString(), base: BASE, apiPort: API_PORT, ...report }, null, 2)); }
  console.log(`\nCAMPAGNE : ${failed ? 'ÉCHEC' : 'RÉUSSIE'} (${report.steps.length} étape(s))`); process.exitCode = failed ? 1 : 0;
}

async function runScenarios({ pages, modes }) {
  const registered = new Set((() => { require('../test-loader.cjs'); return require('./scenarios.cjs').map((s) => s.name); })());
  let failed = false;
  for (const group of buildPlan({ pages, modes, registered })) {
    console.log(`\n== ${group.page} / ${group.state} — ${group.names.length} scénario(s)`);
    await withMock(group.env, async () => {
      const r = cli(['scenarios', '--only', group.names.join(',')], { quiet: true });
      const lines = r.out.split('\n');
      const ok = lines.filter((l) => l.startsWith('✓')).length; const ko = lines.filter((l) => l.startsWith('✗')).length;
      const checks = lines.filter((l) => l.startsWith('    ok')).length; const bad = lines.filter((l) => l.startsWith('    KO'));
      console.log(`   ${ok} scénario(s) réussi(s), ${ko} échoué(s), ${checks} vérification(s) ok, ${bad.length} KO`);
      bad.slice(0, 8).forEach((l) => console.log('   ' + l.trim().slice(0, 200)));
      report.steps.push({ step: 'scenarios', page: group.page, state: group.state, ok, ko, checks });
      if (ko || r.status !== 0 || ok === 0) failed = true;
    });
  }
  return failed;
}

async function runCapture(outDir, { pages, withGlass = false }) {
  let failed = false;
  for (const key of pages) {
    const page = PAGES[key];
    for (const [state, def] of Object.entries(page.states)) {
      const dir = path.join(outDir, key, state);
      await withMock(def.env, async () => {
        await warm(page.route);
        const run = (extra) => { const r = cli(['snapshot', '--routes', page.route, '--out', dir, ...extra], { quiet: true }); if (r.status) failed = true; return r; };
        run(['--ui', 'legacy', '--theme', 'SYSTEM', '--viewports', state === 'data' || state === 'empty' ? W4 : '390,1600']);
        run(['--ui', 'glass', '--theme', 'DARK', '--viewports', '390,1600']);
        if (state === 'data') run(['--ui', 'glass', '--theme', 'LIGHT', '--viewports', '390,1600']);
        if (state === 'data' && page.expandEval) {
          const dirX = path.join(outDir, key, 'expanded');
          const r = cli(['snapshot', '--routes', page.route, '--ui', 'legacy', '--theme', 'SYSTEM', '--viewports', W4, '--eval', page.expandEval, '--out', dirX], { quiet: true }); if (r.status) failed = true;
          const r2 = cli(['snapshot', '--routes', page.route, '--ui', 'glass', '--theme', 'DARK', '--viewports', '390,1600', '--eval', page.expandEval, '--out', dirX], { quiet: true }); if (r2.status) failed = true;
        }
        if (withGlass) { run(['--ui', 'glass', '--theme', 'DARK', '--viewports', W4, '--beta', 'true']); run(['--ui', 'glass', '--theme', 'LIGHT', '--viewports', W4, '--beta', 'true']); }
        console.log(`   capturé : ${key}/${state}`);
        report.steps.push({ step: 'capture', page: key, state });
      });
    }
  }
  // Régressions : pages voisines, états par défaut (--skip-regression pour un essai rapide)
  if (!process.argv.includes('--skip-regression')) await withMock({ BENCH_RENDEMENT: '1', BENCH_ACTIVITIES: '1' }, async () => {
    for (const route of [...REGRESSION_ROUTES.plain, ...Object.values(PAGES).map((p) => p.route)]) {
      const dir = path.join(outDir, 'regression');
      const beta = Object.values(PAGES).some((p) => p.route === route);
      const r1 = cli(['snapshot', '--routes', route, '--ui', 'legacy', '--theme', 'SYSTEM', '--viewports', '1600,390', '--out', dir], { quiet: true });
      const r2 = cli(['snapshot', '--routes', route, '--ui', 'glass', '--theme', 'LIGHT', '--viewports', '1600,390', ...(beta ? ['--beta', 'true'] : []), '--out', dir], { quiet: true });
      if (r1.status || r2.status) failed = true;
    }
    report.steps.push({ step: 'capture', page: 'regression' });
  });
  return failed;
}

function runCompare(a, b) {
  let failed = false; let total = 0; let identical = 0;
  const walk = (rel) => {
    const da = path.join(a, rel); const db = path.join(b, rel);
    if (!fs.existsSync(da) || !fs.existsSync(db)) return;
    // Seules les captures de styles (route__mode__largeur.json) sont comparées : le rapport de campagne n'en est pas une.
    const files = fs.readdirSync(da).filter((f) => f.endsWith('.json') && f !== 'campaign-report.json' && fs.existsSync(path.join(db, f)));
    if (files.length) {
      const tmpA = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cg-a-')); const tmpB = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cg-b-'));
      files.forEach((f) => { fs.copyFileSync(path.join(da, f), path.join(tmpA, f)); fs.copyFileSync(path.join(db, f), path.join(tmpB, f)); });
      const r = cli(['compare', '--a', tmpA, '--b', tmpB], { quiet: true });
      const same = (r.out.match(/^IDENTIQUE/gm) || []).length; total += files.length; identical += same;
      console.log(`   ${rel || '.'} : ${same}/${files.length} identique(s) ${r.status ? '— ÉCART' : ''}`);
      if (r.status) { failed = true; (r.out.split('\n').filter((l) => l.startsWith('ÉCART') || l.startsWith('   -')).slice(0, 8)).forEach((l) => console.log('     ' + l.slice(0, 180))); }
      fs.rmSync(tmpA, { recursive: true, force: true }); fs.rmSync(tmpB, { recursive: true, force: true });
    }
    for (const e of fs.readdirSync(da, { withFileTypes: true })) if (e.isDirectory()) walk(path.join(rel, e.name));
  };
  walk('');
  console.log(`\n   TOTAL : ${identical}/${total} capture(s) identique(s)`);
  report.steps.push({ step: 'compare', total, identical });
  return failed || total === 0;
}

async function runContrast(outDir, { pages }) {
  let failed = false;
  for (const key of pages) {
    const page = PAGES[key];
    for (const [state, def] of Object.entries(page.states)) {
      if (!['data', 'empty'].includes(state)) continue;
      await withMock(def.env, async () => {
        await warm(page.route);
        const variants = state === 'data' && page.expandEval ? [['', null], ['-expanded', page.expandEval]] : [['', null]];
        for (const [suffix, evalJs] of variants) {
          const base = path.join(outDir, key, `${state}${suffix}`); const ev = evalJs ? ['--eval', evalJs] : [];
          cli(['contrast', '--routes', page.route, '--ui', 'legacy', '--theme', 'SYSTEM', '--viewports', W4, ...ev, '--out', path.join(base, 'legacy')], { quiet: true });
          for (const theme of ['DARK', 'LIGHT']) {
            cli(['contrast', '--routes', page.route, '--ui', 'glass', '--theme', theme, '--viewports', W4, '--beta', 'true', ...ev, '--out', path.join(base, theme.toLowerCase())], { quiet: true });
            const r = cli(['contrast-compare', '--a', path.join(base, 'legacy'), '--b', path.join(base, theme.toLowerCase())], { quiet: true });
            const verdict = (r.out.match(/RÉSULTAT : (.*)/) || [])[1] || 'indéterminé';
            console.log(`   ${key}/${state}${suffix} ${theme} : ${verdict}`);
            if (r.status) failed = true;
          }
        }
        report.steps.push({ step: 'contrast', page: key, state });
      });
    }
  }
  return failed;
}

async function runShots(outDir, { pages }) {
  for (const key of pages) {
    const page = PAGES[key];
    for (const [state, def] of Object.entries(page.states)) {
      await withMock(def.env, async () => {
        await warm(page.route);
        for (const theme of ['DARK', 'LIGHT']) cli(['shots', '--routes', page.route, '--ui', 'glass', '--theme', theme, '--viewports', W4, '--beta', 'true', '--out', path.join(outDir, key, state, theme.toLowerCase())], { quiet: true });
        console.log(`   captures : ${key}/${state}`);
        report.steps.push({ step: 'shots', page: key, state });
      });
    }
  }
  return false;
}

async function main() {
  const [cmd] = process.argv.slice(2);
  const pages = list(arg('--pages'), Object.keys(PAGES)); const modes = list(arg('--modes'), MODES_ALL); const out = arg('--out');
  if (cmd === 'plan') {
    const registered = new Set((() => { require('../test-loader.cjs'); return require('./scenarios.cjs').map((s) => s.name); })());
    for (const g of buildPlan({ pages, modes, registered })) console.log(`${g.page.padEnd(10)} ${g.state.padEnd(8)} env=${JSON.stringify(g.env)} → ${g.names.length} scénario(s)`);
    return;
  }
  if (cmd === 'compare') { const a = arg('--a'); const b = arg('--b'); if (!a || !b) { console.error('--a et --b requis'); process.exit(2); } await requireServer().catch(() => {}); return finish(null, runCompare(a, b)); }
  await requireServer();
  let failed = false;
  if (cmd === 'scenarios') failed = await runScenarios({ pages, modes });
  else if (cmd === 'capture') { if (!out) throw new Error('--out requis'); failed = await runCapture(out, { pages }); }
  else if (cmd === 'contrast') { if (!out) throw new Error('--out requis'); failed = await runContrast(out, { pages }); }
  else if (cmd === 'shots') { if (!out) throw new Error('--out requis'); failed = await runShots(out, { pages }); }
  else if (cmd === 'all') {
    if (!out) throw new Error('--out requis');
    failed = await runScenarios({ pages, modes });
    failed = (await runCapture(path.join(out, 'capture'), { pages })) || failed;
    if (arg('--baseline')) failed = runCompare(arg('--baseline'), path.join(out, 'capture')) || failed;
    failed = (await runContrast(path.join(out, 'contrast'), { pages })) || failed;
  } else { console.error('Commande : plan | scenarios | capture | compare | contrast | shots | all'); process.exit(2); }
  finish(out, failed);
}

module.exports = { PAGES, buildPlan, MODES_ALL, EXPAND_FIRST_USER };
if (require.main === module) main().catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });
