#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Contrôle de production RÉEL (build + serveur), à lancer avant tout déploiement touchant au design system :
 *   node design-system/tools/production-check.cjs [--skip-build] [--port 3021]
 *
 * Prouve que, dans un build de production :
 *   1. la route /glass-kit n'existe pas (absente du manifeste des routes, accès directs = 404) ;
 *   2. aucun outil de test (banc, faux API, terrain d'essai, tests) n'est compilé, tracé ni servi ;
 *   3. les pages historiques répondent normalement.
 * Un build de production écrit dans .next/ ; le serveur de dev écrit dans .next/dev/ (documentation Next.js 16 :
 * `next dev` et `next build` peuvent tourner en parallèle). Ne touche à aucun fichier suivi par Git.
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const NEXT = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const PORT = Number(arg('--port', 3021));
const skipBuild = process.argv.includes('--skip-build');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (label, ok, detail = '') => { results.push({ label, ok: !!ok, detail }); console.log(`  ${ok ? 'ok ' : 'KO '} ${label}${detail ? ' — ' + detail : ''}`); };

function request(method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: urlPath, method, headers: { Accept: 'text/html' } }, (res) => {
      let body = ''; res.on('data', (c) => (body += c)); res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject); req.setTimeout(30000, () => req.destroy(new Error('délai dépassé'))); req.end();
  });
}

/** Comme request(), mais suit jusqu'à 3 redirections (Next.js normalise la barre finale : /x/ → 308 → /x). */
async function requestFollow(method, urlPath) {
  let current = urlPath; const hops = [];
  for (let i = 0; i < 4; i++) {
    const r = await request(method, current);
    if ([301, 302, 307, 308].includes(r.status) && r.headers.location) { hops.push(r.status); current = new URL(r.headers.location, 'http://127.0.0.1').pathname + new URL(r.headers.location, 'http://127.0.0.1').search; continue; }
    return { ...r, hops, finalPath: current };
  }
  throw new Error('trop de redirections pour ' + urlPath);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

(async () => {
  console.log('1. Build de production');
  if (!skipBuild) {
    const build = spawnSync(process.execPath, [NEXT, 'build'], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, encoding: 'utf8', maxBuffer: 1 << 26 });
    check('next build réussi', build.status === 0, build.status === 0 ? '' : (build.stderr || build.stdout).slice(-600));
    if (build.status !== 0) { process.exitCode = 1; return finish(); }
    const listing = build.stdout;
    check('la sortie du build ne liste pas /glass-kit', !/glass-kit/.test(listing));
    check('la sortie du build liste /dashboard', /\/dashboard/.test(listing));
  } else console.log('   (build ignoré : --skip-build)');

  console.log('2. Manifestes de routes');
  const manifests = ['app-path-routes-manifest.json', path.join('server', 'app-paths-manifest.json'), 'routes-manifest.json', 'build-manifest.json']
    .map((f) => path.join(ROOT, '.next', f)).filter((f) => fs.existsSync(f));
  check('manifestes de build présents', manifests.length >= 2, manifests.map((f) => path.basename(f)).join(', '));
  for (const f of manifests) check(`${path.basename(f)} : aucune mention de glass-kit`, !/glass-kit/i.test(fs.readFileSync(f, 'utf8')));
  const appRoutes = path.join(ROOT, '.next', 'app-path-routes-manifest.json');
  if (fs.existsSync(appRoutes)) check('/dashboard est bien une route du build', Object.values(JSON.parse(fs.readFileSync(appRoutes, 'utf8'))).includes('/dashboard'));

  console.log('3. Contenu du build (serveur, client, trace standalone)');
  const buildFiles = walk(path.join(ROOT, '.next')).filter((f) => !f.split(path.sep).includes('dev') && !f.split(path.sep).includes('cache'));
  const textFiles = buildFiles.filter((f) => /\.(js|mjs|cjs|json|html|rsc|css|txt|map)$/.test(f) && fs.statSync(f).size < 20 * 1024 * 1024);
  const SENTINELS = [
    ['page de l’outil de développement', /GlassKitPlayground|Kit Liquid Glass|Outillage de développement/],
    ['faux API / banc de validation', /bench-token|bench@example\.test|OUTIL DE TEST UNIQUEMENT|mock-api|design-system[\\/]bench/],
    // Textes propres au terrain d'essai. Les classes génériques .cgx-* ne sont PAS un marqueur : la feuille du kit est livrée légitimement
    // dès qu'une page migrée utilise une primitive (p. ex. PageHeader sur /settings).
    ['terrain d’essai du kit (textes et dialogues propres à l’outil)', /Confirmation destructive|Ouvrir une modale|Exemple de modale|Exemple de dialogue|Terrain d.essai des primitives/],
  ];
  // Exception unique et vérifiée : .next/standalone/package.json est une copie de package.json ; elle contient le TEXTE des scripts
  // npm de développement (glass:bench…), jamais le code du banc. On contrôle séparément qu'elle ne contient aucune donnée de test.
  const isStandalonePackageJson = (f) => path.relative(ROOT, f).split(path.sep).join('/') === '.next/standalone/package.json';
  for (const [label, re] of SENTINELS) {
    const hits = textFiles.filter((f) => !isStandalonePackageJson(f)).filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    check(`aucun ${label} dans le build (${textFiles.length} fichiers lus)`, hits.length === 0, hits.slice(0, 3).join(', '));
  }
  const spj = path.join(ROOT, '.next', 'standalone', 'package.json');
  if (fs.existsSync(spj)) check('standalone/package.json : scripts seulement, aucune donnée de test', !/bench-token|bench@example|OUTIL DE TEST/.test(fs.readFileSync(spj, 'utf8')));
  const standalone = path.join(ROOT, '.next', 'standalone');
  if (fs.existsSync(standalone)) {
    const traced = walk(standalone).map((f) => path.relative(standalone, f).split(path.sep).join('/'));
    const bad = traced.filter((f) => /design-system\/(bench|tools|dev)\/|\.test\.(cjs|mjs|js)$|mock-api/.test(f));
    check(`image standalone (${traced.length} fichiers) : ni banc, ni outils, ni tests, ni faux API`, bad.length === 0, bad.slice(0, 3).join(', '));
  } else check('dossier standalone présent', false, 'output: standalone attendu');

  console.log('4. Serveur de production : accès directs');
  const server = spawn(process.execPath, [NEXT, 'start', '-p', String(PORT)], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore' });
  try {
    let up = false;
    for (let i = 0; i < 60 && !up; i++) { try { await request('GET', '/login'); up = true; } catch { await sleep(500); } }
    check(`serveur de production démarré (port ${PORT})`, up);
    if (up) {
      for (const [method, url] of [['GET', '/glass-kit'], ['GET', '/glass-kit/'], ['GET', '/glass-kit?x=1'], ['HEAD', '/glass-kit'], ['GET', '/glass-kit/autre'], ['GET', '/GLASS-KIT'], ['GET', '/_next/data/x/glass-kit.json']]) {
        const r = await requestFollow(method, url);
        check(`${method} ${url} → 404${r.hops.length ? ' (après redirection ' + r.hops.join('>') + ' vers ' + r.finalPath + ')' : ''}`, r.status === 404, 'statut final ' + r.status);
        if (method === 'GET') check(`  ${url} : aucune trace de l’outil dans la réponse`, !/GlassKitPlayground|Kit Liquid Glass|Ouvrir une modale|Confirmation destructive/.test(r.body));
      }
      for (const url of ['/login', '/dashboard', '/projects']) {
        const r = await request('GET', url);
        check(`GET ${url} → 200 (page historique intacte)`, r.status === 200, 'statut ' + r.status);
      }
      const login = await request('GET', '/login');
      check('le script anti-flash est présent et ne mentionne pas /glass-kit', /data-ui/.test(login.body) && !/glass-kit/.test(login.body));
    }
  } finally { server.kill(); await sleep(500); }
  finish();
})().catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });

function finish() {
  const bad = results.filter((r) => !r.ok);
  console.log(`\nRÉSULTAT : ${results.length - bad.length}/${results.length} contrôles satisfaits${bad.length ? ' — ÉCHECS : ' + bad.map((b) => b.label).join(' | ') : ''}`);
  process.exitCode = bad.length ? 1 : 0;
}
