#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Balayage de couverture visuelle V2 (mandat 49) — OUTIL DE TEST UNIQUEMENT, jamais livré.
 *
 * Pour chaque route re-teintée du registre, dans un Chrome réel :
 *   - une navigation en Glass (bêta activée) ; mesures en Light ET Dark, à 320 / 390 / 768 / 1600 px (bascule à chaud du thème et de la largeur) ;
 *   - une navigation Legacy de référence (Light, 1600) pour la régression de contraste : un défaut déjà présent en Classique n'est pas compté ;
 *   - sondes : mode de rendu effectif, fuites de surfaces claires opaques en Dark, régressions de contraste (WCAG AA), débordement horizontal,
 *     erreurs JavaScript, présence d'un menu, contenu vide.
 *
 *   BENCH_BASE_URL=http://localhost:3049 BENCH_API_PORT=3059 node design-system/bench/skin-sweep.cjs --out DIR [--routes /a,/b] [--ids ids.json]
 *        [--role SUPER_ADMIN] [--themes LIGHT,DARK] [--viewports 320,390,768,1600] [--shots] [--real session.json]
 *
 * --ids : JSON { "/projects/[id]": "/projects/abc" } pour les routes dynamiques (sinon identifiant factice « x1 »).
 * --real : JSON { access, user } d'une session RÉELLE d'un backend de test (voir acceptation 41) ; sinon session factice du faux API.
 * --anon : visiteur sans session (routes publiques).
 * --sessions FILE --profile NOM : sessions réelles (bench/real-session.cjs login), rafraîchies avant chaque route ; ACC_API requis.
 * Codes de sortie : 0 = aucun défaut bloquant ; 1 = défauts (voir le résumé).
 */
const fs = require('node:fs');
const path = require('node:path');
require('../test-loader.cjs');
const { launch, openSession, sleep } = require('./cdp.cjs');
const { CONTRAST } = require('./probes.cjs');
// --app portal : balaye le portail client (registre et sessions du portail) ; par défaut l'application interne.
const APP = process.argv.includes('--app') ? process.argv[process.argv.indexOf('--app') + 1] : 'app';
const { ROUTE_REGISTRY } = APP === 'portal'
  ? require('../../../coro-client-portal/design-system/routes/route-registry.ts')
  : require('../routes/route-registry.ts');

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'; }
  return out;
}
const list = (v, d) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : d);

/** Sonde de couverture exécutée dans la page. */
const COVERAGE = String.raw`(() => {
  const root = document.documentElement;
  const dark = root.getAttribute('data-theme') === 'dark';
  const parse = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const ctx = cv.getContext('2d', { willReadFrequently: true });
    return (str) => { if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = str; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  })();
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const sel = (el) => { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''; return el.tagName.toLowerCase() + id + c; };
  const leaks = [];
  let surfaces = 0;
  for (const el of document.body.querySelectorAll('*')) {
    // Sont exclus des « fuites » : feuilles de document, urgences, écrans conçus pour le sombre, cartes, médias et contrôles désactivés (gris d'état).
    if (el.disabled || el.closest('nextjs-portal') || el.closest('[data-bench]') || el.closest('[data-cg-paper],[data-cg-emergency],[data-cg-keep]') || el.closest('.leaflet-container') || el.closest('canvas,svg,video,iframe,img')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 1500) continue;
    const bg = parse(cs.backgroundColor);
    if (bg.a < 0.5) continue;
    surfaces++;
    if (dark && bg.a >= 0.85 && lum(bg) > 0.45 && !/url\(/.test(cs.backgroundImage)) leaks.push({ sel: sel(el), bg: cs.backgroundColor, area: Math.round(r.width * r.height), text: (el.textContent || '').trim().slice(0, 30) });
  }
  const sw = document.scrollingElement ? document.scrollingElement.scrollWidth : 0;
  const main = document.querySelector('main');
  const textLen = (main || document.body).innerText.trim().length;
  const hasAside = !!document.querySelector('aside');
  return JSON.stringify({
    mode: root.getAttribute('data-cg-mode'), ui: root.getAttribute('data-ui'), theme: root.getAttribute('data-theme'), ready: root.hasAttribute('data-ui-ready'),
    path: location.pathname, overflowX: sw > innerWidth + 1, scrollWidth: sw, innerWidth,
    surfaces, leaks: leaks.sort((a, b) => b.area - a.area).slice(0, 12), leakCount: leaks.length, textLen, hasAside,
    skinSheet: !!document.getElementById('cg-skin-css'),
  });
})()`;

const sample = (pattern, ids) => ids[pattern] || pattern.replace(/\[\.\.\.[^\]]+\]/g, 'x1/x2').replace(/\[[^\]]+\]/g, 'x1');
const key = (i) => `${i.sel}|${i.text}`;

async function measure(session, theme, vp, shotFile) {
  await session.eval(`document.documentElement.setAttribute('data-theme','${theme === 'DARK' ? 'dark' : 'light'}')`);
  await session.send('Emulation.setDeviceMetricsOverride', require('./cdp.cjs').VIEWPORTS[vp]);
  await sleep(450);
  const cov = JSON.parse(await session.eval(COVERAGE));
  const con = JSON.parse(await session.eval(CONTRAST));
  if (shotFile) await session.screenshot(shotFile);
  return { cov, con };
}

async function main() {
  const o = args(process.argv.slice(2));
  if (!o.out) throw new Error('--out requis');
  const outDir = o.out; fs.mkdirSync(outDir, { recursive: true });
  const ids = o.ids ? JSON.parse(fs.readFileSync(o.ids, 'utf8')) : {};
  // Session réelle d'un backend de test jetable : --sessions FILE (+ --profile NOM). Rafraîchie avant chaque route (jeton d'accès de 15 minutes).
  const sessionsFile = o.sessions || null; const profile = o.profile || 'FOUNDER';
  const liveReal = async () => {
    if (!sessionsFile) return o.real ? JSON.parse(fs.readFileSync(o.real, 'utf8')) : undefined;
    const rs = require('./real-session.cjs');
    const all = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    if (all[profile].portal) return { access: all[profile].token, user: all[profile].user, portal: true };
    all[profile] = await rs.refresh(all[profile]);
    fs.writeFileSync(sessionsFile, JSON.stringify(all, null, 2));
    return { access: all[profile].token, user: all[profile].user };
  };
  const themes = list(o.themes, ['LIGHT', 'DARK']);
  const viewports = list(o.viewports, ['320', '390', '768', '1600']).map(Number);
  const role = o.role || 'SUPER_ADMIN';
  const entries = ROUTE_REGISTRY.filter((e) => e.render === 'skin' && (!o.routes || list(o.routes).some((r) => e.pattern === r || sample(e.pattern, ids) === r)));
  const only = o.routes ? list(o.routes) : null;
  const rows = [];
  const chrome = await launch();
  try {
    for (const e of entries) {
      const route = sample(e.pattern, ids);
      if (only && !only.includes(e.pattern) && !only.includes(route)) continue;
      const row = { pattern: e.pattern, route, status: 'ok', issues: [], measures: [] };
      const real = await liveReal();
      // Référence Legacy (Light, 1600) : contraste déjà défaillant en Classique.
      let baseline = new Set();
      try {
        const legacy = await openSession(chrome.port, { ui: 'legacy', theme: 'LIGHT', viewport: 1600, role, real, anon: o.anon === 'true' });
        try {
          const how = await legacy.goto(route);
          if (!how.startsWith('ECHEC')) {
            await legacy.freeze();
            const con0 = JSON.parse(await legacy.eval(CONTRAST));
            baseline = new Set(con0.items.map(key));
            row.legacyExceptions = legacy.consoleErrors.length;
            // Captures Classiques « avant » (dossier d'acceptation) : 1600 puis 390 px.
            if (o.shots) {
              const base = path.join(outDir, 'shots', `${route.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '_') || 'root'}__LEGACY`);
              await legacy.screenshot(`${base}__1600.png`);
              await legacy.send('Emulation.setDeviceMetricsOverride', require('./cdp.cjs').VIEWPORTS[390]); await sleep(500);
              await legacy.screenshot(`${base}__390.png`);
            }
          }
        } finally { await legacy.close(); }
      } catch (err) { row.issues.push('référence Legacy : ' + err.message); }
      const session = await openSession(chrome.port, { ui: 'glass', theme: 'LIGHT', viewport: viewports[0], beta: true, role, real, anon: o.anon === 'true' });
      try {
        const how = await session.goto(route);
        row.how = how;
        if (how.startsWith('ECHEC')) { row.status = 'inaccessible'; row.issues.push(`inaccessible (${how}) — redirection ou erreur`); rows.push(row); continue; }
        await session.freeze();
        await sleep(600);
        for (const theme of themes) for (const vp of viewports) {
          const shot = o.shots ? path.join(outDir, 'shots', `${route.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '_') || 'root'}__${theme}__${vp}.png`) : null;
          const { cov, con } = await measure(session, theme, vp, shot);
          const regress = con.items.filter((i) => !baseline.has(key(i)));
          const m = { theme, vp, mode: cov.mode, overflowX: cov.overflowX, leakCount: cov.leakCount, leaks: cov.leaks.slice(0, 5), contrastTotal: con.total, contrastFail: con.failures, contrastRegress: regress.length, regressItems: regress.slice(0, 8), textLen: cov.textLen };
          row.measures.push(m);
          if (!['skin', 'canvas'].includes(cov.mode)) row.issues.push(`${theme}/${vp} : mode « ${cov.mode} » (attendu skin|canvas)`);
          if (cov.overflowX) row.issues.push(`${theme}/${vp} : débordement horizontal (${cov.scrollWidth} > ${cov.innerWidth})`);
          if (theme === 'DARK' && cov.leakCount) row.issues.push(`${theme}/${vp} : ${cov.leakCount} surface(s) claire(s) opaque(s) en Dark (ex. ${cov.leaks[0].sel})`);
          if (regress.length) row.issues.push(`${theme}/${vp} : ${regress.length} régression(s) de contraste (ex. « ${regress[0].text} » ${regress[0].ratio}:1)`);
          if (!cov.skinSheet) row.issues.push(`${theme}/${vp} : feuille de teinte absente`);
        }
        // Exceptions : seules celles qui s'ajoutent à la référence Classique comptent (un 404 déjà présent en Classique n'est pas une régression).
        const extra = session.consoleErrors.length - (row.legacyExceptions || 0);
        if (extra > 0) row.issues.push(`${extra} exception(s) JavaScript de plus qu'en Classique : ${session.consoleErrors[0].slice(0, 120)}`);
        row.exceptions = { glass: session.consoleErrors.length, legacy: row.legacyExceptions ?? null };
      } finally { await session.close(); }
      row.status = row.issues.length ? 'defauts' : 'ok';
      rows.push(row);
      console.log(`${row.status === 'ok' ? 'ok ' : 'KO '} ${route}${row.issues.length ? ' — ' + row.issues.slice(0, 3).join(' | ') : ''}`);
      fs.writeFileSync(path.join(outDir, 'sweep.json'), JSON.stringify(rows, null, 2));
    }
  } finally { await chrome.close(); }
  const bad = rows.filter((r) => r.status !== 'ok');
  fs.writeFileSync(path.join(outDir, 'sweep.json'), JSON.stringify(rows, null, 2));
  console.log(`\nBALAYAGE : ${rows.length} routes, ${rows.length - bad.length} sans défaut, ${bad.length} avec défauts`);
  process.exitCode = bad.length ? 1 : 0;
}

module.exports = { COVERAGE, sample };
if (require.main === module) main().catch((e) => { console.error('ERREUR :', e.stack || e.message); process.exit(3); });
