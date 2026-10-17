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
 *  - Lecture seule : uniquement GET /rendement/operational, GET /rendement/financial, l'ancien GET /rendement, GET /auth/me et la connexion.
 *    Aucune écriture (le PUT .../financial/mandates/:id/sale n'est JAMAIS appelé), aucune suppression.
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

const OPERATIONAL_KEYS = { advisor: ['userId', 'userName', 'hours', 'activities', 'participatedMandates'], period: ['from', 'to', 'timeZone', 'upperBoundExclusive'] };
// Champs qui n'ont rien à faire dans la réponse OPÉRATIONNELLE (contrat de main : « aucune donnée financière »).
const FINANCIAL_KEYS = /^(soldAmount|soldCurrency|soldAt|knownLaborCost|contributionMargin|contributionMarginPercent|lossMaking|completeness|incompleteReasons|hourlyCost|tauxHoraire|coutReel|marge|margePct|montantVendu|revenusTotal|heuresBudgetees)$/;
const MONEY = /^-?\d+\.\d{2}$/;
const COMPLETENESS = ['COMPLETE', 'INCOMPLETE', 'NOT_AVAILABLE'];

const keysDeep = (value, out = new Set()) => { if (Array.isArray(value)) value.forEach((v) => keysDeep(v, out)); else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { out.add(k); keysDeep(v, out); } return out; };
function verdict(ok, detail) { return { status: ok ? 'ok' : 'ko', detail }; }
const noAuthority = (r) => r.status === 403 || (r.status === 200 && r.json && r.json.founder === false && Array.isArray(r.json.grants) && r.json.grants.length === 0);

/** Forme de la réponse opérationnelle (contrat de main) ; renvoie la liste des anomalies. */
function operationalShapeIssues(json) {
  const issues = [];
  if (!json || typeof json !== 'object') return ['réponse non JSON'];
  if (!json.period || typeof json.period !== 'object' || typeof json.period.timeZone !== 'string') issues.push('period.timeZone absent');
  if (!Array.isArray(json.advisors)) { issues.push(Array.isArray(json.conseillers) ? 'ANCIEN MODÈLE (conseillers) au lieu de advisors' : 'advisors absent'); return issues; }
  for (const a of json.advisors) {
    if (typeof a.userId !== 'string' || typeof a.userName !== 'string') issues.push('advisor sans userId/userName');
    if (typeof a.hours !== 'number' || a.hours < 0) issues.push('hours invalide');
    if (!Array.isArray(a.activities) || !Array.isArray(a.participatedMandates)) issues.push('activities/participatedMandates invalides');
  }
  return issues;
}
function ownAdvisorsOnly(r, ownId, allowForbidden = false) {
  if (allowForbidden && r.status === 403) return verdict(true, 'HTTP 403 (refus explicite)');
  const list = r.json && r.json.advisors;
  if (r.status !== 200 || !Array.isArray(list)) return verdict(false, `HTTP ${r.status}, forme inattendue${r.json && r.json.conseillers ? ' (ancien modèle « conseillers »)' : ''}`);
  const foreign = list.filter((a) => a.userId !== ownId).length;
  return verdict(foreign === 0 && list.length <= 1, `${list.length} conseiller(s), ${foreign} étranger(s)`);
}
function onlyAdvisor(r, userId) {
  const list = r.json && r.json.advisors;
  if (r.status !== 200 || !Array.isArray(list)) return verdict(false, `HTTP ${r.status}, forme inattendue`);
  const foreign = list.filter((a) => a.userId !== userId).length;
  return verdict(foreign === 0, `${list.length} conseiller(s), ${foreign} étranger(s)`);
}
function operationalValid(r) {
  if (r.status !== 200) return verdict(false, `HTTP ${r.status}`);
  const issues = operationalShapeIssues(r.json);
  return verdict(issues.length === 0, issues.length ? issues.join(' ; ') : `${r.json.advisors.length} conseiller(s), forme conforme`);
}
/** Forme et invariants de la réponse financière (contrat de main). Ne valide AUCUN calcul. */
function financialIssues(json) {
  const issues = [];
  if (!json || typeof json !== 'object') return ['réponse non JSON'];
  if (!json.scope || typeof json.scope.view !== 'string') issues.push('scope.view absent');
  if (!Array.isArray(json.mandates) || !Array.isArray(json.totals)) return [...issues, 'mandates/totals absents'];
  for (const m of json.mandates) {
    for (const key of ['soldAmount', 'knownLaborCost', 'contributionMargin']) if (m[key] != null && !MONEY.test(String(m[key]))) issues.push(`${key} n'est pas une chaîne décimale à 2 décimales`);
    if (!COMPLETENESS.includes(m.completeness)) issues.push(`completeness inconnue : ${m.completeness}`);
    if (m.completeness === 'INCOMPLETE' && !(Array.isArray(m.incompleteReasons) && m.incompleteReasons.length)) issues.push('mandat incomplet sans raison');
    if (m.completeness === 'COMPLETE' && m.contributionMargin == null) issues.push('mandat complet sans marge');
  }
  const counted = json.totals.reduce((s, t) => s + (Number(t.completeMandates) || 0) + (Number(t.incompleteMandates) || 0), 0);
  if (counted !== json.mandates.length) issues.push(`totaux incohérents : ${counted} mandat(s) comptés pour ${json.mandates.length} présent(s)`);
  for (const t of json.totals) for (const key of ['soldAmount', 'knownLaborCost', 'contributionMargin']) if (!MONEY.test(String(t[key]))) issues.push(`totals.${key} n'est pas une chaîne décimale`);
  return issues;
}
function financialValid(r) {
  if (r.status !== 200) return verdict(false, `HTTP ${r.status}`);
  const issues = financialIssues(r.json);
  return verdict(issues.length === 0, issues.length ? issues.join(' ; ') : `${r.json.mandates.length} mandat(s), ${r.json.totals.length} devise(s), forme et invariants conformes`);
}

/** Contrôles de l'API de rendement par rôle (contrat de main : /rendement/operational et /rendement/financial). Lecture seule. */
const API_CHECKS = [
  { id: 'PERM-API-01', title: 'GET /rendement/operational sans jeton → 401/403', run: async (c) => { const r = await request('GET', c.url('operational')); return verdict([401, 403].includes(r.status), `HTTP ${r.status}`); } },
  { id: 'PERM-API-02', title: 'GET /rendement/financial sans jeton → 401/403', run: async (c) => { const r = await request('GET', c.url('financial')); return verdict([401, 403].includes(r.status), `HTTP ${r.status}`); } },
  { id: 'PERM-API-03', title: 'Jeton invalide sur /rendement/operational et /rendement/financial → 401/403', run: async (c) => {
    const bad = { Authorization: 'Bearer jeton-invalide-de-test' };
    const a = await request('GET', c.url('operational'), { headers: bad }); const b = await request('GET', c.url('financial'), { headers: bad });
    return verdict([401, 403].includes(a.status) && [401, 403].includes(b.status), `operational HTTP ${a.status}, financial HTTP ${b.status}`);
  } },
  { id: 'PERM-API-04', title: 'CONSEILLER : /rendement/operational sans userId → uniquement ses propres données', role: 'CONSEILLER', run: async (c) => ownAdvisorsOnly(await c.get('CONSEILLER', 'operational'), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-05', title: 'CONSEILLER : /rendement/operational avec son propre userId → uniquement ses propres données', role: 'CONSEILLER', run: async (c) => ownAdvisorsOnly(await c.get('CONSEILLER', 'operational', c.sessions.CONSEILLER.user.id), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-06', title: 'CONSEILLER : /rendement/operational avec le userId d’un AUTRE utilisateur → aucune donnée étrangère', role: 'CONSEILLER', needs: ['otherUserId'], run: async (c) => ownAdvisorsOnly(await c.get('CONSEILLER', 'operational', c.otherUserId), c.sessions.CONSEILLER.user.id, true) },
  { id: 'PERM-API-07', title: 'CONSEILLER : /rendement/financial → refusé (403), aucune donnée financière', role: 'CONSEILLER', run: async (c) => {
    const r = await c.get('CONSEILLER', 'financial');
    const leaked = r.status === 200 ? 'DONNÉES FINANCIÈRES RENVOYÉES' : '';
    return verdict(r.status === 403, `HTTP ${r.status}${leaked ? ' — ' + leaked : ''}`);
  } },
  { id: 'PERM-API-08', title: 'CONSEILLER : la réponse opérationnelle ne contient AUCUN champ financier', role: 'CONSEILLER', run: async (c) => {
    const r = await c.get('CONSEILLER', 'operational');
    if (r.status !== 200) return verdict(false, `HTTP ${r.status}`);
    const found = [...keysDeep(r.json)].filter((k) => FINANCIAL_KEYS.test(k));
    return verdict(found.length === 0, found.length ? `champs financiers présents : ${found.join(', ')}` : 'aucun champ financier');
  } },
  { id: 'PERM-API-09', title: 'CONSEILLER : l’ancien chemin GET /rendement renvoie la forme opérationnelle (advisors), jamais l’ancien modèle (conseillers)', role: 'CONSEILLER', run: async (c) => {
    const r = await request('GET', c.url('', c.sessions.CONSEILLER.user.id), { headers: { Authorization: `Bearer ${c.sessions.CONSEILLER.token}` } });
    const own = ownAdvisorsOnly(r, c.sessions.CONSEILLER.user.id);
    const hasOld = !!(r.json && (r.json.conseillers || r.json.teamStats));
    return verdict(own.status === 'ok' && !hasOld, hasOld ? 'ANCIEN MODÈLE renvoyé (conseillers / teamStats)' : own.detail);
  } },
  { id: 'PERM-API-10', title: 'ADMIN : /rendement/operational sans userId → forme conforme (hours, activities, participatedMandates)', role: 'ADMIN', run: async (c) => operationalValid(await c.get('ADMIN', 'operational')) },
  { id: 'PERM-API-11', title: 'ADMIN : /rendement/operational avec le userId du conseiller → uniquement ce conseiller', role: 'ADMIN', needs: ['CONSEILLER'], run: async (c) => onlyAdvisor(await c.get('ADMIN', 'operational', c.sessions.CONSEILLER.user.id), c.sessions.CONSEILLER.user.id) },
  { id: 'PERM-API-12', title: 'ADMIN client : /rendement/financial → refusé (403) : autorité de plateforme requise, aucune donnée financière', role: 'ADMIN', run: async (c) => {
    const r = await c.get('ADMIN', 'financial');
    const leaked = r.status === 200 ? 'DONNÉES FINANCIÈRES RENVOYÉES À UN ADMIN CLIENT' : '';
    return verdict(r.status === 403, `HTTP ${r.status}${leaked ? ' — ' + leaked : ''}`);
  } },
  { id: 'PERM-API-13', title: 'SUPER_ADMIN (Founder ou permission FINANCIAL_RENDEMENT_READ) : /rendement/financial et /rendement/operational → 200, formes conformes', role: 'SUPER_ADMIN', run: async (c) => {
    const f = financialValid(await c.get('SUPER_ADMIN', 'financial')); const o = operationalValid(await c.get('SUPER_ADMIN', 'operational'));
    return verdict(f.status === 'ok' && o.status === 'ok', `financier : ${f.detail} ; opérationnel : ${o.detail}`);
  } },
  // Contrat réel de main (constaté Phase 41 sur le vrai backend) : /me n'est pas refusé à un compte client, il renvoie une vue SANS autorité (founder=false, grants=[]).
  { id: 'PERM-API-16', title: 'ADMIN client : GET /admin/v1/platform-authority/me → aucune autorité révélée (403, ou 200 avec founder=false et grants=[])', role: 'ADMIN', run: async (c) => { const r = await c.raw('ADMIN', '/admin/v1/platform-authority/me'); return verdict(noAuthority(r), `HTTP ${r.status}${r.status === 200 ? ' — founder=' + (r.json && r.json.founder) + ', grants=' + ((r.json && r.json.grants || []).length) : ''}`); } },
  { id: 'PERM-API-17', title: 'CONSEILLER : GET /admin/v1/platform-authority/me → aucune autorité révélée (403, ou 200 avec founder=false et grants=[])', role: 'CONSEILLER', run: async (c) => { const r = await c.raw('CONSEILLER', '/admin/v1/platform-authority/me'); return verdict(noAuthority(r), `HTTP ${r.status}${r.status === 200 ? ' — founder=' + (r.json && r.json.founder) + ', grants=' + ((r.json && r.json.grants || []).length) : ''}`); } },
  { id: 'PERM-API-18', title: 'ADMIN client : GET /admin/v1/platform-authority/grants → refusé (403), aucune liste de grants', role: 'ADMIN', run: async (c) => { const r = await c.raw('ADMIN', '/admin/v1/platform-authority/grants'); return verdict(r.status === 403, `HTTP ${r.status}${r.status === 200 ? ' — GRANTS RENVOYÉS À UN ADMIN CLIENT' : ''}`); } },
  { id: 'PERM-API-19', title: 'SUPER_ADMIN : GET /admin/v1/platform-authority/me → 200, forme conforme (authorityStatus, founder, grants)', role: 'SUPER_ADMIN', run: async (c) => {
    const r = await c.raw('SUPER_ADMIN', '/admin/v1/platform-authority/me'); const j = r.json || {};
    const ok = r.status === 200 && ['UNCONFIGURED', 'DRAFT', 'ACTIVE'].includes(j.authorityStatus) && typeof j.founder === 'boolean' && Array.isArray(j.grants);
    return verdict(ok, `HTTP ${r.status}${ok ? `, ${j.authorityStatus}, founder=${j.founder}, ${j.grants.length} grant(s)` : ', forme inattendue'}`);
  } },
  { id: 'PERM-API-14', title: 'ADMIN : le userId d’une AUTRE organisation ne renvoie aucune donnée (cloisonnement), sur les deux chemins', role: 'ADMIN', needs: ['otherOrgUserId'], run: async (c) => {
    const o = await c.get('ADMIN', 'operational', c.otherOrgUserId); const f = await c.get('ADMIN', 'financial', c.otherOrgUserId);
    const oOk = o.status === 403 || (o.status === 200 && Array.isArray(o.json && o.json.advisors) && o.json.advisors.length === 0);
    const fOk = f.status === 403 || (f.status === 200 && Array.isArray(f.json && f.json.mandates) && f.json.mandates.length === 0);
    return verdict(oOk && fOk, `operational HTTP ${o.status} (${o.json && o.json.advisors ? o.json.advisors.length : '?'} conseiller(s)), financial HTTP ${f.status} (${f.json && f.json.mandates ? f.json.mandates.length : '?'} mandat(s))`);
  } },
  { id: 'PERM-API-15', title: 'Champs de la réponse opérationnelle d’un CONSEILLER non prévus par le contrat (information)', role: 'CONSEILLER', run: async (c) => {
    const r = await c.get('CONSEILLER', 'operational'); const extra = new Set();
    if (r.json && typeof r.json === 'object') {
      for (const k of Object.keys(r.json)) if (!['period', 'advisors'].includes(k)) extra.add(k);
      for (const k of Object.keys(r.json.period || {})) if (!OPERATIONAL_KEYS.period.includes(k)) extra.add(`period.${k}`);
      for (const a of r.json.advisors || []) for (const k of Object.keys(a)) if (!OPERATIONAL_KEYS.advisor.includes(k)) extra.add(`advisors.${k}`);
    }
    return { status: 'info', detail: extra.size ? `champs supplémentaires : ${[...extra].sort().join(', ')} (à qualifier par le propriétaire du backend)` : 'aucun champ supplémentaire' };
  } },
];

async function runApiChecks({ api, sessions, from, to, otherUserId, otherOrgUserId, only }) {
  const ctx = {
    sessions, otherUserId, otherOrgUserId,
    url: (endpoint, userId) => `${api}/rendement${endpoint ? '/' + endpoint : ''}?from=${from}&to=${to}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`,
    get: (role, endpoint, userId) => request('GET', ctx.url(endpoint, userId), { headers: { Authorization: `Bearer ${sessions[role].token}` } }),
    raw: (role, path) => request('GET', `${api}${path}`, { headers: { Authorization: `Bearer ${sessions[role].token}` } }),
  };
  const out = [];
  for (const check of API_CHECKS) {
    if (only && !only.includes(check.id)) continue;
    const need = [...(check.role ? [check.role] : []), ...(check.needs || []).filter((n) => ROLES.includes(n))];
    const missingRole = need.find((r) => !sessions[r]);
    // Si aucun « autre utilisateur » n'est fourni mais qu'un administrateur existe, son identifiant en tient lieu.
    if (check.needs && check.needs.includes('otherUserId') && !ctx.otherUserId) { const admin = sessions.ADMIN || sessions.SUPER_ADMIN; ctx.otherUserId = admin && admin.user && admin.user.id; }
    const missingParam = (check.needs || []).find((n) => !ROLES.includes(n) && !ctx[n]);
    if (missingRole) { out.push({ id: check.id, title: check.title, status: 'skip', detail: `rôle ${missingRole} sans identifiants` }); continue; }
    if (missingParam) { out.push({ id: check.id, title: check.title, status: 'skip', detail: `paramètre ${missingParam} non fourni (PREPROD_${missingParam.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase().replace(/^_/, '')})` }); continue; }
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
          // /dashboard/rendement : la page redirige un non-administrateur vers /profile/rendement (garde de rôle de main) ; toute autre route est atteinte.
          const redirectedByDesign = route === '/dashboard/rendement' && role === 'CONSEILLER';
          const expectedPath = redirectedByDesign ? '/profile/rendement' : route;
          const reached = path === expectedPath;
          add(`PERM-BRW-01:${role}:${route}`, `${role} — accès direct à ${route}${redirectedByDesign ? ' : redirection attendue vers /profile/rendement (garde de rôle de la page)' : ''}`, reached ? 'ok' : 'ko', reached ? (redirectedByDesign ? 'redirigé vers /profile/rendement' : 'page atteinte') : `chemin final ${path}, attendu ${expectedPath}`);
          if (!reached) continue;
          const renderer = await session.eval(RENDERER_PROBE);
          // Rendement : legacy-only, JAMAIS Glass (même avec le jeton exact) ; routes bêta : le moteur attendu dépend du build (--expect-renderer).
          const rendementRoute = route === '/profile/rendement' || route === '/dashboard/rendement';
          const expected = rendementRoute ? 'legacy' : expectRenderer;
          if (expected !== 'any') add(`PERM-BRW-02:${role}:${route}`, `${role} — moteur de rendu de ${route} = ${expected}`, renderer === expected ? 'ok' : 'ko', `observé : ${renderer}`);
          if (rendementRoute) {
            const text = await session.eval(`document.querySelector('main')?document.querySelector('main').innerText:''`);
            if (route === '/dashboard/rendement' && role === 'ADMIN') {
              // ADMIN client : le backend refuse (autorité de plateforme requise) ; la page ne doit afficher AUCUNE donnée financière, avec un message d'erreur.
              const financialWords = /Montant vendu|Coût de main-d’œuvre|Marge des mandats|Synthèse financière|Mandats incomplets|Vendu|Coût connu/.test(text);
              const alert = await session.eval(`!!document.querySelector('main [role=alert]')`);
              add(`PERM-BRW-03:${role}:${route}`, `${role} client — /dashboard/rendement : aucun indicateur financier (refus du backend), message d’erreur affiché`, !financialWords && alert ? 'ok' : 'ko', financialWords ? 'DONNÉES FINANCIÈRES VISIBLES' : (alert ? 'aucune donnée, erreur affichée' : 'aucune donnée mais aucun message d’erreur'));
            } else if (route === '/dashboard/rendement' && !redirectedByDesign) {
              // Administrateur : l'écran financier s'affiche sans message d'erreur (une erreur en préproduction doit être investiguée).
              const title = await session.eval(`document.querySelector('main h1')?document.querySelector('main h1').textContent.trim():''`);
              const alert = await session.eval(`!!document.querySelector('main [role=alert]')`);
              add(`PERM-BRW-03:${role}:${route}`, `${role} — /dashboard/rendement : écran financier affiché sans erreur`, title === 'Rendement et rentabilité' && !alert ? 'ok' : 'ko', `titre « ${title} »${alert ? ', message d’erreur affiché' : ''}`);
            } else {
              // Page opérationnelle (ou page vers laquelle un CONSEILLER a été redirigé) : aucune donnée financière.
              const financialWords = /Montant vendu|Coût de main-d’œuvre|Marge des mandats|Synthèse financière|Mandats incomplets|Vendu|Coût connu/.test(text);
              add(`PERM-BRW-03:${role}:${route}`, `${role} — ${route}${redirectedByDesign ? ' (après redirection)' : ''} : aucune donnée financière affichée`, financialWords ? 'ko' : 'ok', financialWords ? 'vocabulaire financier détecté' : 'aucun vocabulaire financier');
            }
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
