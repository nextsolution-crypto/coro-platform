#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Non-régression CLASSIQUE (mandat 49) — OUTIL DE TEST UNIQUEMENT.
 *
 * Compare les styles calculés (≈ 50 propriétés de CHAQUE élément) du rendu Classique de deux builds : la RÉFÉRENCE (commit ad9f86e2, avant la
 * migration V2) et le build V2, avec les mêmes sessions réelles d'un backend de test jetable et les mêmes données. Attendu : 0 écart.
 *
 *   node design-system/bench/classic-compare.cjs --app app --a http://localhost:3043 --b http://localhost:3051 \
 *        --sessions F --profile NOM --ids F --out DIR [--routes /a,/b] [--viewports 1600,390] [--ignore width,height]
 *
 * Le build V2 est lancé AVEC le jeton de préproduction (pire cas) : la préférence Classique doit tout de même produire exactement le rendu de référence.
 */
const fs = require('node:fs');
const path = require('node:path');
require('../test-loader.cjs');
const { launch, openSession, sleep } = require('./cdp.cjs');
const { SNAPSHOT } = require('./probes.cjs');

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const APP = opt('--app', 'app');
const { ROUTE_REGISTRY } = APP === 'portal'
  ? require('../../../coro-client-portal/design-system/routes/route-registry.ts')
  : require('../routes/route-registry.ts');
const BASE_A = opt('--a'); const BASE_B = opt('--b');
const ids = opt('--ids') ? JSON.parse(fs.readFileSync(opt('--ids'), 'utf8')) : {};
const sessionsFile = opt('--sessions'); const profile = opt('--profile', 'FOUNDER');
const out = opt('--out'); fs.mkdirSync(out, { recursive: true });
const viewports = (opt('--viewports', '1600,390')).split(',').map(Number);
const ignore = new Set((opt('--ignore', '')).split(',').filter(Boolean));
const only = opt('--routes') ? opt('--routes').split(',') : null;
const sample = (p) => ids[p] || p.replace(/\[[^\]]+\]/g, 'x1');

async function liveReal() {
  const all = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  if (all[profile].portal) return { access: all[profile].token, user: all[profile].user, portal: true };
  const rs = require('./real-session.cjs');
  all[profile] = await rs.refresh(all[profile]);
  fs.writeFileSync(sessionsFile, JSON.stringify(all, null, 2));
  return { access: all[profile].token, user: all[profile].user };
}

async function snap(chrome, base, route, vp, real) {
  const s = await openSession(chrome.port, { ui: 'legacy', theme: 'LIGHT', viewport: vp, role: 'SUPER_ADMIN', real });
  try {
    await s.send('Page.navigate', { url: base + route }); await sleep(5500);
    const here = await s.eval('location.pathname');
    await s.freeze(); await sleep(600);
    const st = JSON.parse(await s.eval(`JSON.stringify({ui:document.documentElement.dataset.ui,mode:document.documentElement.getAttribute('data-cg-mode'),skin:!!document.getElementById('cg-skin-css')})`));
    return { data: JSON.parse(await s.eval(SNAPSHOT)), here, st, errors: s.consoleErrors.length };
  } finally { await s.close(); }
}

function compare(a, b) {
  const props = a.props; const ia = new Map(a.els.map((e) => [e.p, e])); const ib = new Map(b.els.map((e) => [e.p, e]));
  const missing = [...ia.keys()].filter((k) => !ib.has(k)); const extra = [...ib.keys()].filter((k) => !ia.has(k));
  const diffs = []; const byProp = {};
  for (const [p, ea] of ia) { const eb = ib.get(p); if (!eb) continue; props.forEach((name, i) => { if (ignore.has(name)) return; if (ea.v[i] !== eb.v[i]) { diffs.push({ p, prop: name, a: ea.v[i], b: eb.v[i], c: ea.c }); byProp[name] = (byProp[name] || 0) + 1; } }); }
  return { diffs, missing, extra, byProp, countA: a.count, countB: b.count };
}

(async () => {
  const rows = []; let total = 0;
  const chrome = await launch();
  try {
    for (const e of ROUTE_REGISTRY.filter((x) => !x.devOnly && (!only || only.includes(x.pattern)))) {
      const route = sample(e.pattern);
      for (const vp of viewports) {
        const real = await liveReal();
        const A = await snap(chrome, BASE_A, route, vp, real);
        const B = await snap(chrome, BASE_B, route, vp, real);
        const r = compare(A.data, B.data);
        const n = r.diffs.length + r.missing.length + r.extra.length; total += n;
        const row = { pattern: e.pattern, route, vp, pathA: A.here, pathB: B.here, v2Mode: B.st, elements: [r.countA, r.countB], diffs: r.diffs.length, missing: r.missing.length, extra: r.extra.length, byProp: r.byProp, sample: r.diffs.slice(0, 6) };
        rows.push(row);
        const classicOk = B.st.ui === 'legacy' && B.st.mode === null && !B.st.skin;
        console.log(`${n === 0 && classicOk ? 'IDENTIQUE' : 'ÉCART    '} ${route} @${vp} (${r.countA} → ${r.countB} éléments${A.here !== B.here ? ', redirections différentes ' + A.here + ' / ' + B.here : ''}${classicOk ? '' : ', V2 non Classique !'})${n ? ' : ' + JSON.stringify(r.byProp) : ''}`);
        fs.writeFileSync(path.join(out, 'classic-compare.json'), JSON.stringify(rows, null, 2));
      }
    }
  } finally { await chrome.close(); }
  console.log(total === 0 ? '\nRÉSULTAT : 0 écart de style calculé entre la référence et le Classique V2.' : `\nRÉSULTAT : ${total} écart(s) à examiner.`);
  process.exit(total === 0 ? 0 : 1);
})().catch((e) => { console.error(e.stack || e.message); process.exit(3); });
