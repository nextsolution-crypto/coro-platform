#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Vérification de la bêta Liquid Glass sur des builds de PRODUCTION DE TEST (locaux, jamais déployés) — OUTIL DE TEST UNIQUEMENT.
 *
 *   node design-system/tools/preprod-build-check.cjs [--variants off,accidental,on] [--skip-build] [--port 3031]
 *
 * Pour chaque variante : build de production de test, serveur `next start`, faux API local, contrôle du moteur de rendu des quatre routes
 * bêta (bench/beta-routes-check.cjs) puis contrôle d'absence des outils de développement (tools/production-check.cjs --skip-build).
 *   off        : NEXT_PUBLIC_GLASS_BETA absent            → les 4 routes restent en îlot Legacy (comportement de production par défaut)
 *   accidental : NEXT_PUBLIC_GLASS_BETA=1                 → idem : « 1 » n'active rien en production
 *   on         : NEXT_PUBLIC_GLASS_BETA=production-preview → les 4 routes sont rendues en Glass pour un utilisateur dont la préférence est Glass
 * Les builds écrivent dans .next/ (ignoré par Git) ; la dernière variante construite y reste. NEXT_PUBLIC_API_URL pointe vers le faux API local.
 * Ne touche à aucun fichier suivi par Git. Aucun accès réseau externe. Durée : ~4 min de build par variante.
 */
const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const NEXT = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const PORT = Number(arg('--port', 3031));
const API_PORT = Number(process.env.BENCH_API_PORT || 3012);
const variants = String(arg('--variants', 'off,accidental,on')).split(',').map((v) => v.trim()).filter(Boolean);
const skipBuild = process.argv.includes('--skip-build');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VARIANTS = {
  off: { token: undefined, expectBeta: 'off', label: 'sans jeton' },
  accidental: { token: '1', expectBeta: 'off', label: 'NEXT_PUBLIC_GLASS_BETA=1 (valeur accidentelle)' },
  on: { token: 'production-preview', expectBeta: 'on', label: 'NEXT_PUBLIC_GLASS_BETA=production-preview' },
};

const get = (url) => new Promise((resolve) => { const r = http.get(url, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); }); r.on('error', () => resolve(0)); r.setTimeout(30000, () => { r.destroy(); resolve(0); }); });

(async () => {
  const { checkBetaRoutes } = require('../bench/beta-routes-check.cjs');
  const summary = [];
  for (const name of variants) {
    const v = VARIANTS[name]; if (!v) { console.error(`variante inconnue : ${name}`); process.exit(2); }
    console.log(`\n=== Variante « ${name} » — ${v.label}`);
    const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}/api` };
    delete env.NEXT_PUBLIC_GLASS_BETA; if (v.token !== undefined) env.NEXT_PUBLIC_GLASS_BETA = v.token;
    if (!skipBuild) {
      const build = spawnSync(process.execPath, [NEXT, 'build'], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 1 << 26 });
      if (build.status !== 0) { console.log('  KO next build', (build.stderr || build.stdout).slice(-500)); summary.push({ name, ok: false, why: 'build' }); continue; }
      console.log('  ok  next build réussi');
    }
    const mock = spawn(process.execPath, [path.join(ROOT, 'design-system', 'bench', 'mock-api.cjs')], { env: { ...env, BENCH_API_PORT: String(API_PORT), BENCH_ACTIVITIES: '1', BENCH_RENDEMENT: '1' }, stdio: 'ignore' });
    const server = spawn(process.execPath, [NEXT, 'start', '-p', String(PORT)], { cwd: ROOT, env, stdio: 'ignore' });
    let ok = true;
    try {
      let up = false; for (let i = 0; i < 80 && !up; i++) { up = (await get(`http://localhost:${PORT}/login`)) === 200; if (!up) await sleep(500); }
      if (!up) { console.log('  KO serveur de production non démarré'); summary.push({ name, ok: false, why: 'serveur' }); continue; }
      for (const r of await checkBetaRoutes({ base: `http://localhost:${PORT}`, expectBeta: v.expectBeta })) { console.log(`  ${r.ok ? 'ok ' : 'KO '} ${r.label} — ${r.detail}`); if (!r.ok) ok = false; }
    } finally { server.kill(); mock.kill(); await sleep(800); }
    // Outils de développement : même contrôle que `npm run glass:verify-production`, sur ce build.
    const prod = spawnSync(process.execPath, [path.join(__dirname, 'production-check.cjs'), '--skip-build', '--port', String(PORT + 1)], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 1 << 26 });
    const verdict = (prod.stdout.match(/RÉSULTAT : (.*)/) || [])[1] || 'indéterminé';
    console.log(`  ${prod.status === 0 ? 'ok ' : 'KO '} outils de développement absents (production-check) — ${verdict}`);
    if (prod.status !== 0) ok = false;
    summary.push({ name, ok });
  }
  console.log('\nRÉSUMÉ : ' + summary.map((s) => `${s.name}=${s.ok ? 'OK' : 'ÉCHEC'}`).join(' | '));
  process.exitCode = summary.every((s) => s.ok) && summary.length === variants.length ? 0 : 1;
})().catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });
