#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Banc de validation Liquid Glass.
 *
 *   node design-system/bench/cli.cjs snapshot --routes /dashboard,/projects --ui legacy --theme SYSTEM --viewports 1600,390 --out DIR
 *   node design-system/bench/cli.cjs compare  --a DIR_AVANT --b DIR_APRES [--ignore width,height]
 *   node design-system/bench/cli.cjs contrast --routes /dashboard --ui glass --theme DARK --viewports 1600,320
 *   node design-system/bench/cli.cjs contrast-compare --a DIR_CONTRASTE_LEGACY --b DIR_CONTRASTE_GLASS
 *   node design-system/bench/cli.cjs shots    --routes /dashboard --ui glass --theme LIGHT --viewports 320,390,768,1600 --out DIR
 *   node design-system/bench/cli.cjs scenarios [--only drawer]
 *
 * Pré-requis : serveur de dev du frontend (BENCH_BASE_URL) et faux API (node design-system/bench/mock-api.cjs).
 * Limites : voir design-system/bench/README.md.
 */
const fs = require('node:fs');
const path = require('node:path');
const { launch, openSession, sleep } = require('./cdp.cjs');
const { SNAPSHOT, CONTRAST } = require('./probes.cjs');

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'; out[k] = v; } else out._.push(argv[i]);
  }
  return out;
}
const list = (v, d) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : d);
const slug = (route) => (route === '/' ? 'root' : route.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '_'));
const fileName = (route, ui, theme, vp, ext = 'json') => `${slug(route)}__${ui}-${theme}__${vp}.${ext}`;

/** Exécute `fn(session, ctx)` pour chaque combinaison route × viewport, dans un seul Chrome. */
async function forEachView({ routes, ui, theme, viewports }, fn) {
  const chrome = await launch();
  try {
    for (const vp of viewports) {
      for (const route of routes) {
        const session = await openSession(chrome.port, { ui, theme, viewport: Number(vp) });
        try {
          const how = await session.goto(route);
          if (how.startsWith('ECHEC')) { console.log(`  ! ${route} @${vp} : inaccessible (${how})`); continue; }
          await session.freeze(); await sleep(600);
          await fn(session, { route, vp, how });
        } finally { await session.close(); }
      }
    }
  } finally { await chrome.close(); }
}

async function cmdSnapshot(o) {
  const cfg = { routes: list(o.routes, ['/dashboard']), ui: o.ui || 'legacy', theme: o.theme || 'SYSTEM', viewports: list(o.viewports, ['1600']) };
  const dir = o.out; if (!dir) throw new Error('--out requis');
  fs.mkdirSync(dir, { recursive: true });
  await forEachView(cfg, async (s, { route, vp, how }) => {
    const data = await s.eval(SNAPSHOT);
    fs.writeFileSync(path.join(dir, fileName(route, cfg.ui, cfg.theme, vp)), data);
    console.log(`  ✓ ${route} @${vp} (${how}) : ${JSON.parse(data).count} éléments, ${s.consoleErrors.length} exception(s) page`);
  });
}

function compareSnapshots(a, b, ignore) {
  const props = a.props; const skip = new Set(ignore);
  const ia = new Map(a.els.map((e) => [e.p, e])); const ib = new Map(b.els.map((e) => [e.p, e]));
  const missing = [...ia.keys()].filter((k) => !ib.has(k)); const extra = [...ib.keys()].filter((k) => !ia.has(k));
  const diffs = []; const byProp = {};
  for (const [p, ea] of ia) {
    const eb = ib.get(p); if (!eb) continue;
    props.forEach((name, i) => { if (skip.has(name)) return; if (ea.v[i] !== eb.v[i]) { diffs.push({ p, prop: name, a: ea.v[i], b: eb.v[i], c: ea.c }); byProp[name] = (byProp[name] || 0) + 1; } });
  }
  return { elementsA: a.count, elementsB: b.count, missing, extra, diffs, byProp };
}

function cmdCompare(o) {
  if (!o.a || !o.b) throw new Error('--a et --b requis');
  const ignore = list(o.ignore, []);
  const files = fs.readdirSync(o.a).filter((f) => f.endsWith('.json') && fs.existsSync(path.join(o.b, f)));
  if (!files.length) { console.log('Aucun fichier commun à comparer.'); process.exitCode = 2; return; }
  let total = 0;
  for (const f of files) {
    const r = compareSnapshots(JSON.parse(fs.readFileSync(path.join(o.a, f))), JSON.parse(fs.readFileSync(path.join(o.b, f))), ignore);
    const n = r.diffs.length + r.missing.length + r.extra.length; total += n;
    console.log(`${n === 0 ? 'IDENTIQUE' : 'ÉCART    '}  ${f}  (${r.elementsA} → ${r.elementsB} éléments, ${r.diffs.length} styles, ${r.missing.length} manquants, ${r.extra.length} en plus)`);
    if (n) {
      console.log('   propriétés :', JSON.stringify(r.byProp));
      for (const d of r.diffs.slice(0, 8)) console.log(`   - ${d.p} [${d.prop}] « ${d.a} » → « ${d.b} »`);
      for (const k of r.missing.slice(0, 3)) console.log('   - manquant :', k);
      for (const k of r.extra.slice(0, 3)) console.log('   - en plus :', k);
    }
  }
  console.log(total === 0 ? '\nRÉSULTAT : 0 écart de style calculé.' : `\nRÉSULTAT : ${total} écart(s).`);
  process.exitCode = total === 0 ? 0 : 1;
}

async function cmdContrast(o) {
  const cfg = { routes: list(o.routes, ['/dashboard']), ui: o.ui || 'glass', theme: o.theme || 'DARK', viewports: list(o.viewports, ['1600']) };
  let failures = 0;
  await forEachView(cfg, async (s, { route, vp }) => {
    const r = JSON.parse(await s.eval(CONTRAST)); failures += r.failures;
    console.log(`  ${r.failures === 0 ? '✓' : '✗'} ${route} @${vp} ${cfg.ui}/${cfg.theme} : ${r.total} textes, ${r.failures} sous le seuil AA, ${r.approxBackgrounds} sur fond dégradé/image (approximatif)`);
    for (const it of r.items.slice(0, 6)) console.log(`      ${it.ratio}:1 (min ${it.need}) ${it.sel} « ${it.text} » ${it.fg} sur ${it.bg}${it.approx ? ' ~' : ''}`);
    if (o.out) { fs.mkdirSync(o.out, { recursive: true }); fs.writeFileSync(path.join(o.out, fileName(route, cfg.ui, cfg.theme, vp)), JSON.stringify(r, null, 1)); }
  });
  process.exitCode = failures === 0 ? 0 : 1;
}

/**
 * Compare les échecs de contraste d'un état de référence (Legacy) à ceux d'un état migré/îlot (Glass).
 * Un texte déjà sous le seuil en Legacy n'est PAS une régression ; un texte qui passe sous le seuil en Glass l'est.
 */
function cmdContrastCompare(o) {
  if (!o.a || !o.b) throw new Error('--a (référence Legacy) et --b (Glass) requis');
  const key = (it) => it.sel + '|' + it.text;
  let regressions = 0;
  for (const f of fs.readdirSync(o.b).filter((x) => x.endsWith('.json'))) {
    const twin = f.replace(/__[a-z]+-[A-Z]+__/, (m) => m.replace(/-[A-Z]+__/, '-SYSTEM__').replace(/^__[a-z]+/, '__legacy'));
    const fa = path.join(o.a, twin);
    if (!fs.existsSync(fa)) { console.log('  ? pas de référence pour', f, '(attendu', twin + ')'); continue; }
    const A = JSON.parse(fs.readFileSync(fa)); const B = JSON.parse(fs.readFileSync(path.join(o.b, f)));
    const known = new Set(A.items.map(key));
    const fresh = B.items.filter((it) => !known.has(key(it)));
    regressions += fresh.length;
    console.log(`  ${fresh.length === 0 ? '✓' : '✗'} ${f} : Legacy ${A.failures} échec(s), Glass ${B.failures}, nouveaux ${fresh.length}`);
    for (const it of fresh.slice(0, 8)) console.log(`      ${it.ratio}:1 (min ${it.need}) ${it.sel} « ${it.text} » ${it.fg} sur ${it.bg}${it.approx ? ' ~' : ''}`);
  }
  console.log(regressions === 0
    ? '\nRÉSULTAT : aucun nouveau défaut de contraste par rapport au Legacy.'
    : `\nRÉSULTAT : ${regressions} nouveau(x) défaut(s) de contraste.`);
  process.exitCode = regressions === 0 ? 0 : 1;
}

async function cmdShots(o) {
  const cfg = { routes: list(o.routes, ['/dashboard']), ui: o.ui || 'glass', theme: o.theme || 'LIGHT', viewports: list(o.viewports, ['320', '390', '768', '1600']) };
  if (!o.out) throw new Error('--out requis');
  await forEachView(cfg, async (s, { route, vp }) => {
    const file = path.join(o.out, fileName(route, cfg.ui, cfg.theme, vp, 'png'));
    await s.screenshot(file); console.log('  ✓', file);
  });
}

async function cmdScenarios(o) {
  const scenarios = require('./scenarios.cjs');
  const only = o.only ? list(o.only) : null;
  const chrome = await launch(); let failed = 0;
  try {
    for (const sc of scenarios) {
      if (only && !only.includes(sc.name)) continue;
      const session = await openSession(chrome.port, { ui: sc.ui, theme: sc.theme, viewport: sc.viewport });
      const checks = [];
      const check = (label, ok, detail = '') => { checks.push({ label, ok: !!ok, detail }); };
      try { const how = await session.goto(sc.route); if (how.startsWith('ECHEC')) { check('route accessible', false, how); } else { await sleep(600); await sc.run(session, check); } }
      catch (e) { check('exécution du scénario', false, String(e.message || e)); }
      finally { await session.close(); }
      const bad = checks.filter((c) => !c.ok); failed += bad.length;
      console.log(`${bad.length ? '✗' : '✓'} ${sc.name} — ${sc.description}`);
      for (const c of checks) console.log(`    ${c.ok ? 'ok ' : 'KO '} ${c.label}${c.detail ? ' : ' + c.detail : ''}`);
    }
  } finally { await chrome.close(); }
  process.exitCode = failed === 0 ? 0 : 1;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2); const o = args(rest);
  const table = { snapshot: cmdSnapshot, compare: cmdCompare, contrast: cmdContrast, 'contrast-compare': cmdContrastCompare, shots: cmdShots, scenarios: cmdScenarios };
  if (!table[cmd]) { console.log('Commandes : snapshot | compare | contrast | shots | scenarios (voir l’en-tête de ce fichier)'); process.exit(2); }
  await table[cmd](o);
  process.exit(process.exitCode || 0);
}

if (require.main === module) main().catch((e) => { console.error('ERREUR banc :', e.message); process.exit(3); });

module.exports = { compareSnapshots };
