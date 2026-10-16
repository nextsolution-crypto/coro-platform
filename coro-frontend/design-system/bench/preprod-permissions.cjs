#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tests de permissions du Lot 1 pour un environnement de PRÉPRODUCTION — OUTIL DE TEST UNIQUEMENT, jamais livré à l'utilisateur.
 *
 *   node design-system/bench/preprod-permissions.cjs --api https://api.preprod.example/api --app https://app.preprod.example \
 *        [--from 2026-10-01 --to 2026-10-31] [--browser] [--expect-renderer glass|legacy|any] [--require-all] [--out rapport.json]
 *   node design-system/bench/preprod-permissions.cjs --self-test [--browser]    (faux API local : valide le HARNAIS, pas le backend)
 *
 * Règles de sécurité (vérifiées par bench/preprod.test.cjs) :
 *  - REFUS ABSOLU de tout hôte de production (getcoro.io et sous-domaines), même s'il figure dans PREPROD_ALLOWED_HOSTS.
 *  - Hôtes autorisés : locaux (localhost, 127.0.0.1, *.localhost, *.test) ou listés dans PREPROD_ALLOWED_HOSTS.
 *  - Identifiants LUS dans l'environnement au moment de l'exécution (PREPROD_<RÔLE>_EMAIL / _PASSWORD, ou PREPROD_<RÔLE>_TOKEN),
 *    jamais écrits sur disque, jamais journalisés. Le rapport ne contient ni courriel, ni mot de passe, ni jeton, ni identifiant complet.
 *  - Lecture seule : uniquement GET /rendement, GET /auth/me et la connexion. Aucune écriture, aucune suppression.
 *  - Comptes DÉDIÉS aux tests (MFA désactivé) créés par l'équipe : aucun compte réel de client.
 *
 * Rôles : CONSEILLER, ADMIN, SUPER_ADMIN. Un rôle sans identifiants est « non exécuté » (--require-all : échec).
 */
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');

const ROLES = ['CONSEILLER', 'ADMIN', 'SUPER_ADMIN'];
const PRODUCTION_DOMAINS = ['getcoro.io'];
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost|[a-z0-9.-]+\.test)$/i;

/** Politique d'hôte : { allowed, reason }. Fonction pure (testée). */
function hostPolicy(rawUrl, env = process.env) {
  let u;
  try { u = new URL(rawUrl); } catch { return { allowed: false, reason: 'URL invalide' }; }
  const host = u.hostname.toLowerCase();
  if (PRODUCTION_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) return { allowed: false, reason: `domaine de PRODUCTION refusé (${host})` };
  if (!/^https?:$/.test(u.protocol)) return { allowed: false, reason: 'protocole non http(s)' };
  if (LOCAL_HOST.test(host)) return { allowed: true, reason: 'hôte local' };
  const allow = String(env.PREPROD_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (allow.includes(host)) return u.protocol === 'https:' ? { allowed: true, reason: 'hôte déclaré' } : { allowed: false, reason: 'hôte distant : https obligatoire' };
  return { allowed: false, reason: `hôte non déclaré (ajoutez-le à PREPROD_ALLOWED_HOSTS) : ${host}` };
}

/** Lit les comptes dans l'environnement. Ne renvoie jamais autre chose que ce qui est nécessaire à la connexion. */
function loadAccounts(env = process.env) {
  const accounts = {}; const missing = [];
  for (const role of ROLES) {
    const email = env[`PREPROD_${role}_EMAIL`]; const password = env[`PREPROD_${role}_PASSWORD`]; const token = env[`PREPROD_${role}_TOKEN`];
    if (token) accounts[role] = { token };
    else if (email && password) accounts[role] = { email, password };
    else missing.push(role);
  }
  return { accounts, missing };
}

const mask = (value) => (value ? `${String(value).slice(0, 3)}…(${String(value).length})` : '∅');

function request(method, rawUrl, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(rawUrl); const lib = u.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = lib.request({ method, hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}), ...headers } }, (res) => {
      let data = ''; res.on('data', (c) => (data += c));
      res.on('end', () => { let json = null; try { json = JSON.parse(data); } catch { /* corps non JSON */ } resolve({ status: res.statusCode, json }); });
    });
    req.setTimeout(30000, () => req.destroy(new Error('délai dépassé'))); req.on('error', reject);
    if (payload) req.write(payload); req.end();
  });
}

/** Ouvre une session par rôle : connexion API (ou jeton fourni) puis /auth/me. Renvoie { sessions, notes }. */
async function openSessions(api, accounts) {
  const sessions = {}; const notes = [];
  for (const [role, acc] of Object.entries(accounts)) {
    try {
      let token = acc.token; let user = null; let refresh = null;
      if (!token) {
        const r = await request('POST', `${api}/auth/login`, { body: { email: acc.email, password: acc.password } });
        if (r.json && r.json.mfaRequired) { notes.push(`${role} : MFA actif sur ce compte de test — non automatisable (fournir PREPROD_${role}_TOKEN ou désactiver le MFA du compte de test)`); continue; }
        if (r.status !== 200 && r.status !== 201) { notes.push(`${role} : connexion refusée (HTTP ${r.status})`); continue; }
        token = r.json && r.json.access_token; user = r.json && r.json.user; refresh = r.json && r.json.refresh_token;
      }
      if (!user) { const me = await request('GET', `${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); user = me.json; }
      if (!token || !user || !user.id) { notes.push(`${role} : session incomplète (jeton ou profil absent)`); continue; }
      sessions[role] = { token, refresh, user };
      if (user.role && user.role !== role) notes.push(`${role} : le rôle renvoyé par le serveur est « ${user.role} » (attendu « ${role} ») — vérifier le compte`);
    } catch (e) { notes.push(`${role} : erreur réseau (${e.message})`); }
  }
  return { sessions, notes };
}

const sum = (list, key) => list.reduce((s, c) => s + (Number(c[key]) || 0), 0);
const near = (a, b) => Math.abs(a - b) < 0.01 + Math.abs(b) * 1e-9;
const KNOWN_KEYS = ['userId', 'userName', 'heuresTotal', 'revenusTotal', 'mandatsList', 'mandatsDeficitaires', 'mandatsCount'];
const KNOWN_MANDATE_KEYS = ['projectId', 'projectName', 'clientName', 'heures', 'montantVendu', 'heuresBudgetees', 'coutReel', 'marge', 'margePct'];

/** Contrôles de l'API /rendement par rôle. Chaque contrôle : { id, title, run(ctx) → { status, detail } }. */
const API_CHECKS = [
  { id: 'PERM-API-01', title: 'GET /rendement sans jeton → 401/403', run: async (c) => { const r = await request('GET', c.url()); return verdict([401, 403].includes(r.status), `HTTP ${r.status}`); } },
  { id: 'PERM-API-02', title: 'GET /rendement avec un jeton invalide → 401/403', run: async (c) => { const r = await request('GET', c.url(), { headers: { Authorization: 'Bearer jeton-invalide-de-test' } }); return verdict([401, 403].includes(r.status), `HTTP ${r.status}`); } },
  { id: 'PERM-API-03', title: 'CONSEILLER sans userId → uniquement ses propres données', role: 'CONSEILLER', run: async (c) => ownOnly(await c.get('CONSEILLER'), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-04', title: 'CONSEILLER avec son propre userId → uniquement ses propres données', role: 'CONSEILLER', run: async (c) => ownOnly(await c.get('CONSEILLER', c.sessions.CONSEILLER.user.id), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-05', title: 'CONSEILLER avec le userId d’un AUTRE utilisateur → aucune donnée étrangère', role: 'CONSEILLER', needs: ['otherUserId'], run: async (c) => ownOnly(await c.get('CONSEILLER', c.otherUserId), c.sessions.CONSEILLER.user.id, true) },
  { id: 'PERM-API-06', title: 'ADMIN sans userId → réponse cohérente (teamStats = somme des conseillers)', role: 'ADMIN', run: async (c) => consistent(await c.get('ADMIN')) },
  { id: 'PERM-API-07', title: 'ADMIN avec userId du conseiller → uniquement ce conseiller', role: 'ADMIN', needs: ['CONSEILLER'], run: async (c) => onlyUser(await c.get('ADMIN', c.sessions.CONSEILLER.user.id), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-08', title: 'SUPER_ADMIN sans userId → réponse cohérente', role: 'SUPER_ADMIN', run: async (c) => consistent(await c.get('SUPER_ADMIN')) },
  { id: 'PERM-API-09', title: 'SUPER_ADMIN avec userId du conseiller → uniquement ce conseiller', role: 'SUPER_ADMIN', needs: ['CONSEILLER'], run: async (c) => onlyUser(await c.get('SUPER_ADMIN', c.sessions.CONSEILLER.user.id), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-10', title: 'ADMIN avec le userId d’une AUTRE organisation → aucune donnée (cloisonnement)', role: 'ADMIN', needs: ['otherOrgUserId'], run: async (c) => { const r = await c.get('ADMIN', c.otherOrgUserId); return verdict(r.status === 403 || (r.status === 200 && Array.isArray(r.json && r.json.conseillers) && r.json.conseillers.length === 0), `HTTP ${r.status}, ${r.json && r.json.conseillers ? r.json.conseillers.length : '?'} conseiller(s)`); } },
  { id: 'PERM-API-11', title: 'Champs de la réponse : inventaire des champs non affichés par l’interface (information)', role: 'CONSEILLER', run: async (c) => {
    const r = await c.get('CONSEILLER'); const list = (r.json && r.json.conseillers) || [];
    const extra = new Set(); for (const x of list) { Object.keys(x).filter((k) => !KNOWN_KEYS.includes(k)).forEach((k) => extra.add(k)); for (const m of x.mandatsList || []) Object.keys(m).filter((k) => !KNOWN_MANDATE_KEYS.includes(k)).forEach((k) => extra.add(`mandatsList.${k}`)); }
    return { status: 'info', detail: extra.size ? `champs supplémentaires renvoyés à un CONSEILLER : ${[...extra].sort().join(', ')} (à qualifier par le propriétaire du backend ; non affichés par l’interface)` : 'aucun champ supplémentaire' };
  } },
];

function verdict(ok, detail) { return { status: ok ? 'ok' : 'ko', detail }; }
function ownOnly(r, ownId, allowForbidden = false) {
  if (allowForbidden && r.status === 403) return verdict(true, 'HTTP 403 (refus explicite)');
  const list = r.json && r.json.conseillers;
  if (r.status !== 200 || !Array.isArray(list)) return verdict(false, `HTTP ${r.status}, forme inattendue`);
  const foreign = list.filter((c) => c.userId !== ownId).length;
  return verdict(foreign === 0 && list.length <= 1, `${list.length} conseiller(s), ${foreign} étranger(s)`);
}
function onlyUser(r, userId) {
  const list = r.json && r.json.conseillers;
  if (r.status !== 200 || !Array.isArray(list)) return verdict(false, `HTTP ${r.status}, forme inattendue`);
  const foreign = list.filter((c) => c.userId !== userId).length;
  return verdict(foreign === 0, `${list.length} conseiller(s), ${foreign} étranger(s)`);
}
function consistent(r) {
  const list = r.json && r.json.conseillers; const t = r.json && r.json.teamStats;
  if (r.status !== 200 || !Array.isArray(list) || !t) return verdict(false, `HTTP ${r.status}, forme inattendue`);
  const ok = near(t.heuresTotal, sum(list, 'heuresTotal')) && near(t.revenusTotal, sum(list, 'revenusTotal')) && t.mandatsDeficitaires === sum(list, 'mandatsDeficitaires');
  return verdict(ok, `${list.length} conseiller(s) ; teamStats ${ok ? 'cohérent' : 'INCOHÉRENT'} avec la somme`);
}

async function runApiChecks({ api, sessions, from, to, otherUserId, otherOrgUserId, only }) {
  const ctx = {
    sessions, otherUserId, otherOrgUserId,
    url: (userId) => `${api}/rendement?from=${from}&to=${to}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`,
    get: (role, userId) => request('GET', ctx.url(userId), { headers: { Authorization: `Bearer ${sessions[role].token}` } }),
  };
  const out = [];
  for (const check of API_CHECKS) {
    if (only && !only.includes(check.id)) continue;
    const need = [...(check.role ? [check.role] : []), ...(check.needs || []).filter((n) => ROLES.includes(n))];
    const missingRole = need.find((r) => !sessions[r]);
    const missingParam = (check.needs || []).find((n) => !ROLES.includes(n) && !ctx[n]);
    // Si le rôle de l'« autre utilisateur » est absent mais que ADMIN existe, son identifiant sert d'autre utilisateur.
    if (check.needs && check.needs.includes('otherUserId') && !ctx.otherUserId) ctx.otherUserId = (sessions.ADMIN || sessions.SUPER_ADMIN || {}).user && (sessions.ADMIN || sessions.SUPER_ADMIN).user.id;
    if (missingRole) { out.push({ id: check.id, title: check.title, status: 'skip', detail: `rôle ${missingRole} sans identifiants` }); continue; }
    if (missingParam && !ctx[missingParam]) { out.push({ id: check.id, title: check.title, status: 'skip', detail: `paramètre ${missingParam} non fourni (PREPROD_${missingParam.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase().replace(/^_/, '')})` }); continue; }
    try { const r = await check.run(ctx); out.push({ id: check.id, title: check.title, ...r }); } catch (e) { out.push({ id: check.id, title: check.title, status: 'ko', detail: `erreur : ${e.message}` }); }
  }
  return out;
}

// ───────── Couche navigateur (optionnelle) ─────────
const LOT1_ROUTES = ['/settings', '/activities/portfolio', '/profile/rendement', '/dashboard/rendement'];
const WIDTHS = [320, 390, 768, 1600];

/** Marqueur du moteur de rendu : le contenu de <main> est Glass si une carte `.cg-glass` ou une primitive `.cgx-*` y figure. */
const RENDERER_PROBE = `(()=>{const m=document.querySelector('main');if(!m)return 'aucun-main';return m.querySelector('.cg-glass,[class*="cgx-"]')?'glass':'legacy'})()`;

async function runBrowserChecks({ app, sessions, expectRenderer, beta }) {
  process.env.BENCH_BASE_URL = app; // lu par cdp.cjs au chargement
  const { launch, openSession, sleep } = require('./cdp.cjs');
  const results = []; const add = (id, title, status, detail) => results.push({ id, title, status, detail });
  const chrome = await launch();
  try {
    for (const [role, s] of Object.entries(sessions)) {
      const seed = `try{var u=${JSON.stringify(JSON.stringify(s.user))};` +
        `localStorage.setItem('coro_token',${JSON.stringify(s.token)});localStorage.setItem('coro_user',u);sessionStorage.setItem('coro_token',${JSON.stringify(s.token)});sessionStorage.setItem('coro_user',u);` +
        (s.refresh ? `localStorage.setItem('coro_refresh_token',${JSON.stringify(s.refresh)});sessionStorage.setItem('coro_refresh_token',${JSON.stringify(s.refresh)});` : '') + `}catch(e){}`;
      for (const route of LOT1_ROUTES) {
        const session = await openSession(chrome.port, { ui: 'glass', theme: 'LIGHT', viewport: 1600, beta: !!beta });
        try {
          await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seed }); // exécuté APRÈS la session factice du banc : la vraie session prime
          await session.send('Page.navigate', { url: app + route }); await sleep(5000);
          const path = await session.eval('location.pathname');
          const reached = path === route;
          add(`PERM-BRW-01:${role}:${route}`, `${role} — accès direct à ${route}`, reached ? 'ok' : (route === '/dashboard/rendement' && role === 'CONSEILLER' ? 'info' : 'ko'), reached ? 'page atteinte' : `redirigé vers ${path}`);
          if (!reached) continue;
          const renderer = await session.eval(RENDERER_PROBE);
          if (expectRenderer !== 'any') add(`PERM-BRW-02:${role}:${route}`, `${role} — moteur de rendu de ${route} = ${expectRenderer}`, renderer === expectRenderer ? 'ok' : 'ko', `observé : ${renderer}`);
          if (route === '/dashboard/rendement') {
            const text = await session.eval(`document.querySelector('main')?document.querySelector('main').innerText:''`);
            const headers = await session.eval(`[...document.querySelectorAll('main button')].filter(b=>/mandats?\\s·\\s/.test(b.innerText)).length`);
            const adminLike = role !== 'CONSEILLER';
            add(`PERM-BRW-03:${role}`, `${role} — /dashboard/rendement : périmètre des données visibles`, adminLike ? 'info' : (headers <= 1 ? 'ok' : 'ko'), `${headers} conseiller(s) affiché(s)${adminLike ? ' (rôle administrateur : toute l’équipe attendue)' : ' (≤ 1 attendu : soi-même)'}${/Heures équipe/.test(text) ? '' : ' ; statistiques d’équipe absentes'}`);
          }
          if (route === '/settings') {
            const text = (await session.eval(`document.querySelector('main')?document.querySelector('main').innerText:''`)).toLowerCase();
            const hasOrg = /organisation/.test(text) && /membres de l.équipe/.test(text);
            const admin = role !== 'CONSEILLER';
            add(`PERM-BRW-04:${role}`, `${role} — /settings : sections ${admin ? 'administrateur visibles' : 'administrateur ABSENTES'}`, hasOrg === admin ? 'ok' : 'ko', hasOrg ? 'section Organisation visible' : 'section Organisation absente');
          }
          if (route === '/dashboard/rendement' || route === '/settings') {
            // Menu : le lien « Rendement équipe » est réservé aux administrateurs
            const link = await session.eval(`[...document.querySelectorAll('nav a, nav button, aside a, aside button')].some(e=>/Rendement équipe/i.test(e.innerText))`);
            if (route === '/settings') add(`PERM-BRW-05:${role}`, `${role} — menu : lien « Rendement équipe » ${role === 'CONSEILLER' ? 'absent' : 'présent'}`, link === (role !== 'CONSEILLER') ? 'ok' : 'ko', link ? 'présent' : 'absent');
          }
          const errors = session.consoleErrors.length;
          add(`PERM-BRW-06:${role}:${route}`, `${role} — ${route} : aucune exception JavaScript non gérée`, errors === 0 ? 'ok' : 'ko', `${errors} exception(s)`);
        } finally { await session.close(); }
      }
      // Responsive : aucune page ne déborde horizontalement, 4 largeurs
      for (const width of WIDTHS) {
        for (const route of LOT1_ROUTES) {
          const session = await openSession(chrome.port, { ui: 'glass', theme: 'LIGHT', viewport: width, beta: !!beta });
          try {
            await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seed });
            await session.send('Page.navigate', { url: app + route }); await sleep(4500);
            if ((await session.eval('location.pathname')) !== route) continue;
            const overflow = await session.eval('document.documentElement.scrollWidth>innerWidth');
            add(`PERM-BRW-07:${role}:${route}:${width}`, `${role} — ${route} @${width} : aucun défilement horizontal de la page`, overflow ? 'ko' : 'ok', overflow ? 'débordement' : 'ok');
          } finally { await session.close(); }
        }
      }
    }
  } finally { await chrome.close(); }
  return results;
}

function summarize(results) {
  const by = (s) => results.filter((r) => r.status === s).length;
  return { total: results.length, ok: by('ok'), ko: by('ko'), skip: by('skip'), info: by('info') };
}

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(name);

async function main() {
  let api = arg('--api', process.env.PREPROD_API_URL); let app = arg('--app', process.env.PREPROD_APP_URL);
  const selfTest = flag('--self-test');
  let child = null; let env = process.env;
  if (selfTest) {
    // Auto-test du harnais contre le faux API local (comptes fictifs). Ne prouve RIEN sur le vrai backend.
    const port = Number(process.env.BENCH_API_PORT || 3012);
    api = `http://localhost:${port}/api`; app = app || process.env.BENCH_BASE_URL || 'http://localhost:3010';
    env = { ...process.env, PREPROD_CONSEILLER_EMAIL: 'conseiller@bench.test', PREPROD_CONSEILLER_PASSWORD: 'bench-only', PREPROD_ADMIN_EMAIL: 'admin@bench.test', PREPROD_ADMIN_PASSWORD: 'bench-only', PREPROD_SUPER_ADMIN_EMAIL: 'super@bench.test', PREPROD_SUPER_ADMIN_PASSWORD: 'bench-only' };
    child = require('node:child_process').spawn(process.execPath, [require('node:path').join(__dirname, 'mock-api.cjs')], { env: { ...process.env, BENCH_API_PORT: String(port), BENCH_STRICT_AUTH: '1', BENCH_RENDEMENT: '1', ...(flag('--leak') ? { BENCH_LEAK_RENDEMENT: '1' } : {}) }, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (!api) { console.error('ERREUR : --api (ou PREPROD_API_URL) requis'); process.exit(2); }
  for (const [label, url] of [['API', api], ...(app ? [['application', app]] : [])]) {
    const p = hostPolicy(url, env);
    if (!p.allowed) { console.error(`REFUSÉ (${label}) : ${p.reason}`); if (child) child.kill(); process.exit(2); }
  }
  const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
  const from = arg('--from', `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-01`);
  const to = arg('--to', `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate())}`);
  const { accounts, missing } = loadAccounts(env);
  console.log(`Cible API : ${new URL(api).host} | période ${from} → ${to} | rôles configurés : ${Object.keys(accounts).join(', ') || 'aucun'}${missing.length ? ` | sans identifiants : ${missing.join(', ')}` : ''}`);
  const { sessions, notes } = await openSessions(api, accounts);
  notes.forEach((n) => console.log('  ! ' + n));
  const results = await runApiChecks({ api, sessions, from, to, otherUserId: env.PREPROD_OTHER_USER_ID, otherOrgUserId: env.PREPROD_OTHER_ORG_USER_ID });
  if (flag('--browser')) {
    if (!app) { console.error('ERREUR : --app requis avec --browser'); if (child) child.kill(); process.exit(2); }
    results.push(...await runBrowserChecks({ app, sessions, expectRenderer: arg('--expect-renderer', 'any'), beta: flag('--beta') || selfTest }));
  }
  if (child) child.kill();
  for (const r of results) console.log(`  ${{ ok: 'ok  ', ko: 'KO  ', skip: 'skip', info: 'info' }[r.status]} ${r.id} — ${r.title}${r.detail ? ' : ' + r.detail : ''}`);
  const s = summarize(results);
  console.log(`\nRÉSULTAT : ${s.ok} ok, ${s.ko} KO, ${s.skip} non exécuté(s), ${s.info} information(s)${missing.length && flag('--require-all') ? ' — rôles manquants (--require-all)' : ''}`);
  const outFile = arg('--out', null);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ date: new Date().toISOString(), host: new URL(api).host, selfTest, summary: s, notes, results }, null, 2));
  process.exitCode = s.ko > 0 || (flag('--require-all') && (missing.length > 0 || s.skip > 0)) ? 1 : 0;
}

module.exports = { hostPolicy, loadAccounts, mask, openSessions, runApiChecks, API_CHECKS, LOT1_ROUTES, RENDERER_PROBE, summarize, ROLES };
if (require.main === module) main().catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });
