#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Vérifie, sur un serveur DÉJÀ lancé (build de production de test ou serveur de dev), quel moteur rend chacune des deux routes bêta natives
 * (/settings et /activities/portfolio), quelques routes re-teintées (dont les deux routes de rendement) et que la route de contrôle
 * la page des permissions de plateforme suit le gate Glass bêta depuis l'amendement Founder 27. OUTIL DE TEST UNIQUEMENT.
 *
 *   BENCH_BASE_URL=http://localhost:3031 node design-system/bench/beta-routes-check.cjs --expect-beta off|on
 *
 *  --expect-beta off : build SANS jeton valide → les deux routes bêta restent en îlot Legacy, même avec la préférence Glass ET la clé locale
 *                      de bêta posée (en production le stockage local ne compte jamais).
 *  --expect-beta on  : build avec NEXT_PUBLIC_GLASS_BETA=production-preview → les deux routes bêta sont rendues en Glass quand la préférence
 *                      de l'utilisateur est Glass, et restent en Legacy quand elle est Legacy.
 * Dans les deux cas : les routes « legacy-only » de contrôle restent Legacy, et /glass-kit répond 404.
 * Le faux API local (BENCH_API_PORT, défaut 3012) doit tourner et être celui de NEXT_PUBLIC_API_URL du build.
 */
const http = require('node:http');

// Écrans Glass NATIFS en bêta.
const BETA_ROUTES = ['/settings', '/activities/portfolio'];
// Écrans re-teintés (mandat 49, migration V2 : le contenu métier est inchangé, seule l'identité visuelle change). Le rendement en fait partie
// depuis la décision Founder de migration complète ; il n'est jamais rendu en Glass NATIF.
const SKIN_ROUTES = ['/projects', '/clients', '/profile/rendement', '/dashboard/rendement', '/admin/platform-permission-grants'];
// Aucune exception visuelle ne subsiste après l'amendement Founder 27.
const CONTROL_ROUTES = [];
/**
 * Moteur de rendu observé : 'skin' | 'canvas' si html[data-cg-mode] l'indique ; sinon le contenu de <main> est Glass natif si une carte
 * `.cg-glass` ou une primitive `.cgx-*` y figure ; sinon Legacy (îlot compris).
 */
const RENDERER_PROBE = `(()=>{const mode=document.documentElement.getAttribute('data-cg-mode');if(mode==='skin'||mode==='canvas')return mode;const m=document.querySelector('main');if(!m)return 'aucun-main';return m.querySelector('.cg-glass,[class*="cgx-"]')?'glass':'legacy'})()`;

/** Matrice attendue : { route, ui, expected }. Fonction pure (testée). */
function expectations(expectBeta) {
  const rows = [];
  for (const route of BETA_ROUTES) {
    rows.push({ route, ui: 'glass', expected: expectBeta === 'on' ? 'glass' : 'legacy' });
    rows.push({ route, ui: 'legacy', expected: 'legacy' });
  }
  for (const route of SKIN_ROUTES) {
    rows.push({ route, ui: 'glass', expected: expectBeta === 'on' ? 'skin' : 'legacy' });
    rows.push({ route, ui: 'legacy', expected: 'legacy' });
  }
  for (const route of CONTROL_ROUTES) rows.push({ route, ui: 'glass', expected: 'legacy' }, { route, ui: 'legacy', expected: 'legacy' });
  return rows;
}

function status(url) { return new Promise((resolve) => { http.get(url, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); }).on('error', () => resolve(0)); }); }

async function checkBetaRoutes({ base, expectBeta }) {
  process.env.BENCH_BASE_URL = base;
  const { launch, openSession, sleep } = require('./cdp.cjs');
  const results = [];
  const kit = await status(`${base}/glass-kit`);
  results.push({ label: '/glass-kit → 404', ok: kit === 404, detail: `HTTP ${kit}` });
  const chrome = await launch();
  try {
    for (const { route, ui, expected } of expectations(expectBeta)) {
      // beta:true pose la clé locale « coro-glass-beta » : en production elle doit être IGNORÉE.
      const session = await openSession(chrome.port, { ui, theme: 'LIGHT', viewport: 1600, beta: true });
      try {
        const how = await session.goto(route);
        const observed = how.startsWith('ECHEC') ? how : await session.eval(RENDERER_PROBE);
        results.push({ label: `${route} (préférence ${ui}) → ${expected}`, ok: observed === expected, detail: `observé : ${observed} (${how})` });
      } finally { await session.close(); await sleep(200); }
    }
  } finally { await chrome.close(); }
  return results;
}

module.exports = { BETA_ROUTES, SKIN_ROUTES, CONTROL_ROUTES, RENDERER_PROBE, expectations, checkBetaRoutes };

if (require.main === module) {
  const i = process.argv.indexOf('--expect-beta'); const expectBeta = i >= 0 ? process.argv[i + 1] : '';
  if (!['on', 'off'].includes(expectBeta)) { console.error('--expect-beta on|off requis'); process.exit(2); }
  const base = process.env.BENCH_BASE_URL || 'http://localhost:3010';
  checkBetaRoutes({ base, expectBeta }).then((results) => {
    for (const r of results) console.log(`  ${r.ok ? 'ok ' : 'KO '} ${r.label} — ${r.detail}`);
    const bad = results.filter((r) => !r.ok);
    console.log(`\nRÉSULTAT : ${results.length - bad.length}/${results.length} contrôles satisfaits`);
    process.exitCode = bad.length ? 1 : 0;
  }).catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });
}
