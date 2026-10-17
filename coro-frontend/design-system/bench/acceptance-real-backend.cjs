#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Acceptation API sur le VRAI backend (plan ACCEPTANCE-REAL-BACKEND.md, AC-01 à AC-17 et AC-28).
 * Cible : un backend de test isolé (base jetable). Refuse la production et le port 3002.
 * Lecture seule, sauf AC-12 à AC-15 : ils créent puis révoquent des grants pour le profil NO_PERMISSION.
 *
 * Variables : ACC_API (ex. http://localhost:3052/api), ACC_IDS (JSON des identifiants semés), ACC_PASSWORD (mot de passe des
 * comptes synthétiques), ACC_MFA_DIR (dossier de capture MFA du backend de test), ACC_JWT_SECRET (pour forger un jeton expiré),
 * ACC_OUT (rapport JSON, sans identifiant ni jeton).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = (process.env.ACC_API || '').replace(/\/$/, '');
if (!API) { console.error('ACC_API requis'); process.exit(2); }
const u = new URL(API);
if (/getcoro\.io$/i.test(u.hostname) || u.port === '3002' || !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) {
  console.error('Refus : seule une instance locale de test (hors port 3002) est acceptée.'); process.exit(2);
}
const IDS = JSON.parse(fs.readFileSync(process.env.ACC_IDS, 'utf8'));
const PASSWORD = process.env.ACC_PASSWORD;
const MFA_DIR = process.env.ACC_MFA_DIR;
if (!PASSWORD || !MFA_DIR) { console.error('ACC_PASSWORD et ACC_MFA_DIR requis'); process.exit(2); }

const PROFILES = {
  FOUNDER: 'founder', DELEGATED: 'delegated', NO_PERMISSION: 'noperm', ROLE_ONLY_SUPER_ADMIN: 'roleonly-superadmin',
  ADMIN_A: 'admin-a', ADMIN_B: 'admin-b', CONSEILLER_A: 'conseiller-a', CONSEILLER_B: 'conseiller-b',
};
const results = [];
const secrets = new Set();
function record(id, label, ok, detail) { results.push({ id, label, ok, detail }); console.log(`${ok ? 'OK ' : 'KO '} ${id.padEnd(8)} ${label}${ok ? '' : ' -> ' + detail}`); }

async function call(method, route, token, body) {
  const res = await fetch(API + route, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; const text = await res.text(); try { json = JSON.parse(text); } catch { /* corps non JSON */ }
  return { status: res.status, json, text };
}

function latestMfaCode(email, afterMs) {
  const files = fs.readdirSync(MFA_DIR).map((f) => ({ f, t: fs.statSync(path.join(MFA_DIR, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  for (const { f, t } of files) {
    if (t < afterMs - 2000) break;
    const m = JSON.parse(fs.readFileSync(path.join(MFA_DIR, f), 'utf8'));
    if (m.to.toLowerCase() === email.toLowerCase()) { const code = /\b(\d{6})\b/.exec(m.subject); if (code) return code[1]; }
  }
  throw new Error('code MFA introuvable');
}

/** Connexion réelle : mot de passe, code MFA capturé (domaine synthétique), session. */
async function login(key) {
  const email = `${key}@p41.test`;
  const start = Date.now();
  const first = await call('POST', '/auth/login', null, { email, password: PASSWORD });
  if (first.status >= 300 || !first.json?.mfaRequired) throw new Error(`login ${key}: ${first.status}`);
  await new Promise((r) => setTimeout(r, 300));
  const code = latestMfaCode(email, start);
  const verified = await call('POST', '/auth/verify-mfa', null, { email, code });
  if (verified.status >= 300) throw new Error(`verify-mfa ${key}: ${verified.status}`);
  secrets.add(verified.json.access_token); secrets.add(verified.json.refresh_token);
  return { token: verified.json.access_token, refresh: verified.json.refresh_token, user: verified.json.user };
}

(async () => {
  const S = {};
  // Le backend limite la connexion à 5 par minute et par IP (règle de main, conservée) : on espace les connexions.
  let first = true;
  for (const [name, key] of Object.entries(PROFILES)) { if (!first) await new Promise((r) => setTimeout(r, 13000)); first = false; S[name] = await login(key); }
  if (process.env.ACC_SESSIONS_OUT) fs.writeFileSync(process.env.ACC_SESSIONS_OUT, JSON.stringify(Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v])), null, 1), { mode: 0o600 });
  const T = (n) => S[n].token;
  const orgA = IDS.orgA, orgB = IDS.orgB;
  const expect = (id, label, res, status, extra) => {
    let ok = res.status === status; let detail = `statut ${res.status} (attendu ${status})`;
    if (ok && extra) { const r = extra(res); if (r !== true) { ok = false; detail = r; } }
    record(id, label, ok, detail);
  };

  // AC-00 : la session réelle (MFA) renvoie l'identité sans mot de passe
  record('AC-00', 'login + MFA réels : utilisateur public sans mot de passe', !JSON.stringify(S.FOUNDER.user).includes('password'), 'champ password exposé');

  // AC-01..04 : /me
  const me = (n) => call('GET', '/admin/v1/platform-authority/me', T(n));
  expect('AC-01', 'FOUNDER /me : founder, ACTIVE', await me('FOUNDER'), 200, (r) => (r.json.founder === true && r.json.authorityStatus === 'ACTIVE') || `corps ${r.text}`);
  const d = await me('DELEGATED');
  expect('AC-02', 'DELEGATED /me : non Founder, 2 grants exacts', d, 200, (r) => {
    const g = r.json.grants || []; const has = (p, s, t) => g.some((x) => x.permission === p && x.scope === s && (x.targetOrganizationId || null) === (t || null));
    return (r.json.founder === false && g.length === 2 && has('COMMERCIAL_CATALOG_MANAGE', 'GLOBAL') && has('FINANCIAL_RENDEMENT_READ', 'ORGANIZATION', orgA)) || `corps ${r.text}`;
  });
  expect('AC-03', 'NO_PERMISSION /me : non Founder, aucun grant', await me('NO_PERMISSION'), 200, (r) => (r.json.founder === false && r.json.grants.length === 0) || `corps ${r.text}`);
  for (const n of ['ADMIN_A', 'ADMIN_B', 'CONSEILLER_A']) {
    const r = await me(n);
    // Contrat réel de main : /me n'est pas un refus pour un compte client ; il ne révèle AUCUNE autorité.
    record('AC-04', `${n} /me : aucune autorité révélée (statut ${r.status})`, r.status === 403 || (r.status === 200 && r.json.founder === false && r.json.grants.length === 0), `corps ${r.text}`);
  }
  const ro = await me('ROLE_ONLY_SUPER_ADMIN');
  record('AC-04b', 'SUPER_ADMIN sans Founder ni grant /me : founder=false', ro.status === 200 && ro.json.founder === false && ro.json.grants.length === 0, `corps ${ro.text}`);
  expect('AC-04c', 'anonyme /me', await call('GET', '/admin/v1/platform-authority/me', null), 401);

  // AC-05/06 : liste des grants
  expect('AC-05', 'FOUNDER liste les grants avec provenance', await call('GET', '/admin/v1/platform-authority/grants', T('FOUNDER')), 200, (r) => {
    const l = Array.isArray(r.json) ? r.json : r.json?.grants; return (Array.isArray(l) && l.length >= 2 && l.every((g) => g.grantedByUserId || g.grantedBy) && l.every((g) => g.grantReason)) || `corps ${r.text.slice(0, 200)}`;
  });
  for (const n of ['DELEGATED', 'NO_PERMISSION', 'ROLE_ONLY_SUPER_ADMIN', 'ADMIN_A', 'ADMIN_B', 'CONSEILLER_A'])
    expect('AC-06', `${n} ne liste pas les grants`, await call('GET', '/admin/v1/platform-authority/grants', T(n)), 403);

  // AC-07..09 : financier
  const fin = (n, org) => call('GET', `/rendement/financial${org ? `?organizationId=${org}` : ''}`, T(n));
  const f = await fin('FOUNDER', orgA);
  expect('AC-07', 'FOUNDER financier org A : montants décimaux CAD, aucune donnée de B', f, 200, (r) => {
    const t = (r.json.totals || [])[0];
    return (t && t.soldAmount === '10000.00' && t.knownLaborCost === '800.00' && !r.text.includes('Client B') && !r.text.includes('Projet B')) || `corps ${r.text.slice(0, 300)}`;
  });
  expect('AC-08a', 'DELEGATED (grant org A) lit l\'org A', await fin('DELEGATED', orgA), 200, (r) => !r.text.includes('Client B') || 'données de B');
  expect('AC-08b', 'DELEGATED refusé sur l\'org B', await fin('DELEGATED', orgB), 403);
  expect('AC-08c', 'DELEGATED sans organizationId (défaut = org opérateur, sans grant) refusé', await fin('DELEGATED'), 403);
  for (const n of ['NO_PERMISSION', 'ROLE_ONLY_SUPER_ADMIN']) expect('AC-09', `${n} refusé au financier`, await fin(n, orgA), 403);
  expect('AC-09', 'ADMIN_A refusé au financier de sa propre org', await fin('ADMIN_A', orgA), 403);
  expect('AC-09', 'ADMIN_A refusé au financier sans paramètre', await fin('ADMIN_A'), 403);
  expect('AC-09', 'ADMIN_B refusé au financier de l\'org A', await fin('ADMIN_B', orgA), 403);
  expect('AC-09', 'CONSEILLER_A refusé au financier', await fin('CONSEILLER_A', orgA), 403);
  expect('AC-09', 'anonyme refusé au financier', await call('GET', `/rendement/financial?organizationId=${orgA}`, null), 401);

  // AC-10/11 : opérationnel et isolation
  const opA = await call('GET', '/rendement/operational', T('CONSEILLER_A'));
  record('AC-10', 'CONSEILLER_A opérationnel : aucun champ financier', (opA.status === 200 || opA.status === 403) && !/soldAmount|hourlyCost|contributionMargin|laborCost/i.test(opA.text), `statut ${opA.status} ${opA.text.slice(0, 200)}`);
  // Isolation : la réponse ne doit contenir AUCUN identifiant ni nom appartenant à l'autre organisation.
  const orgUsers = { A: [IDS.adminA, IDS.adminA2, IDS.conseillerA], B: [IDS.adminB, IDS.adminB2, IDS.conseillerB] };
  const orgNames = { A: /AdminA|ConseillerA|Client A|Projet A|Bâtiment A/, B: /AdminB|ConseillerB|Client B|Projet B|Bâtiment B/ };
  for (const [n, other, otherUser] of [['ADMIN_A', 'B', IDS.conseillerB], ['CONSEILLER_A', 'B', IDS.conseillerB], ['ADMIN_B', 'A', IDS.conseillerA], ['CONSEILLER_B', 'A', IDS.conseillerA]]) {
    for (const route of [`/rendement/operational?userId=${otherUser}`, `/rendement?userId=${otherUser}`, '/rendement/operational']) {
      const r = await call('GET', route, T(n));
      const leaks = orgUsers[other].some((id) => r.text.includes(id)) || orgNames[other].test(r.text);
      record('AC-11', `${n} ${route.split('?')[0]}${route.includes('?') ? ' (userId autre org)' : ''} : aucune donnée de l'org ${other} (statut ${r.status})`, !leaks, 'fuite : ' + r.text.slice(0, 200));
    }
  }
  const usersA = await call('GET', '/users/organization', T('ADMIN_A'));
  record('AC-11', 'ADMIN_A ne liste que les utilisateurs de son org', usersA.status === 200 && Array.isArray(usersA.json) && !usersA.text.includes('@p41.test') === false && !usersA.json.some((x) => ['admin-b', 'conseiller-b', 'admin-b2'].some((k) => x.email === `${k}@p41.test`)) && usersA.json.some((x) => x.email === 'admin-a@p41.test'), `statut ${usersA.status}`);
  const projA = await call('GET', '/projects', T('ADMIN_A'));
  record('AC-11', 'ADMIN_A ne voit pas les projets de B', projA.status === 200 && /Projet A/.test(projA.text) && !/Projet B/.test(projA.text), `statut ${projA.status}`);
  const projB = await call('GET', '/projects', T('ADMIN_B'));
  const projIdB = (Array.isArray(projB.json) ? projB.json : projB.json?.data || []).find((p) => /Projet B/.test(p.name))?.id;
  if (projIdB) { const x = await call('GET', `/projects/${projIdB}`, T('ADMIN_A')); record('AC-11', `ADMIN_A refusé sur un projet de B par URL directe (statut ${x.status})`, [403, 404].includes(x.status), x.text.slice(0, 120)); }
  else record('AC-11', 'projet B repérable pour le test d\'accès direct', false, `statut ${projB.status}`);
  const orgsA = await call('GET', `/organizations/${orgB}`, T('ADMIN_A'));
  record('AC-11', `ADMIN_A refusé sur la fiche de l'org B (statut ${orgsA.status})`, orgsA.status !== 200 || !orgsA.text.includes('Client B P41'), orgsA.text.slice(0, 120));

  // AC-16 : pas de repli sur le rôle seul (routes commerciales)
  for (const n of ['NO_PERMISSION', 'ROLE_ONLY_SUPER_ADMIN', 'ADMIN_A'])
    expect('AC-16', `${n} refusé au catalogue commercial`, await call('GET', '/admin/v1/commercial/capabilities', T(n)), 403);
  expect('AC-16', 'DELEGATED (grant GLOBAL catalogue) autorisé au catalogue', await call('GET', '/admin/v1/commercial/capabilities', T('DELEGATED')), 200);
  expect('AC-16', 'FOUNDER autorisé au catalogue', await call('GET', '/admin/v1/commercial/capabilities', T('FOUNDER')), 200);
  expect('AC-16', 'DELEGATED refusé à la configuration commerciale (aucun grant)', await call('GET', '/admin/v1/commercial/configurations', T('DELEGATED')), 403);
  expect('AC-16', 'FOUNDER autorisé à la configuration commerciale', await call('GET', '/admin/v1/commercial/configurations', T('FOUNDER')), 200);
  expect('AC-16', 'ROLE_ONLY_SUPER_ADMIN refusé à la configuration commerciale', await call('GET', '/admin/v1/commercial/configurations', T('ROLE_ONLY_SUPER_ADMIN')), 403);

  // AC-12..15 : octroi et révocation immédiate (écrit : NO_PERMISSION, révoqué en fin de test)
  const grantBody = (extra) => ({ userId: IDS.noperm, permission: 'FINANCIAL_RENDEMENT_READ', scope: 'ORGANIZATION', targetOrganizationId: orgB, reason: 'Acceptation P41 : test d\'octroi', ...extra });
  expect('AC-14', 'DELEGATED ne peut pas octroyer', await call('POST', '/admin/v1/platform-authority/grants', T('DELEGATED'), grantBody()), 403);
  expect('AC-14', 'ADMIN_A ne peut pas octroyer', await call('POST', '/admin/v1/platform-authority/grants', T('ADMIN_A'), grantBody()), 403);
  expect('AC-14', 'ROLE_ONLY_SUPER_ADMIN ne peut pas octroyer', await call('POST', '/admin/v1/platform-authority/grants', T('ROLE_ONLY_SUPER_ADMIN'), grantBody()), 403);
  const before = await call('GET', '/admin/v1/platform-authority/grants', T('FOUNDER'));
  const countBefore = (Array.isArray(before.json) ? before.json : before.json?.grants || []).length;
  const bad = await call('POST', '/admin/v1/platform-authority/grants', T('FOUNDER'), grantBody({ targetOrganizationId: crypto.randomUUID() }));
  const after = await call('GET', '/admin/v1/platform-authority/grants', T('FOUNDER'));
  record('AC-15', `organisation cible inexistante refusée (statut ${bad.status}), aucun grant créé`, [400, 403, 404].includes(bad.status) && (Array.isArray(after.json) ? after.json : after.json?.grants || []).length === countBefore, bad.text.slice(0, 150));
  expect('AC-15', 'octroi à un utilisateur client refusé', await call('POST', '/admin/v1/platform-authority/grants', T('FOUNDER'), grantBody({ userId: IDS.adminA })), 400);
  expect('AC-15', 'octroi à un SUPER_ADMIN refusé', await call('POST', '/admin/v1/platform-authority/grants', T('FOUNDER'), grantBody({ userId: IDS.roleOnly })), 400);
  expect('AC-13', 'NO_PERMISSION refusé avant octroi', await fin('NO_PERMISSION', orgB), 403);
  const g1 = await call('POST', '/admin/v1/platform-authority/grants', T('FOUNDER'), grantBody());
  expect('AC-12', 'FOUNDER octroie ORGANIZATION (org B) à NO_PERMISSION', g1, 201, (r) => (r.json.id && r.json.status === 'ACTIVE') || `corps ${r.text}`);
  expect('AC-12', 'NO_PERMISSION lit l\'org B sans nouvelle connexion', await fin('NO_PERMISSION', orgB), 200);
  expect('AC-12', 'NO_PERMISSION toujours refusé sur l\'org A (portée respectée)', await fin('NO_PERMISSION', orgA), 403);
  const g2 = await call('POST', '/admin/v1/platform-authority/grants', T('FOUNDER'), grantBody({ permission: 'COMMERCIAL_CATALOG_MANAGE', scope: 'GLOBAL', targetOrganizationId: undefined }));
  expect('AC-12', 'FOUNDER octroie GLOBAL (catalogue) à NO_PERMISSION', g2, 201);
  expect('AC-12', 'NO_PERMISSION lit le catalogue (GLOBAL)', await call('GET', '/admin/v1/commercial/capabilities', T('NO_PERMISSION')), 200);
  const mine = await me('NO_PERMISSION');
  record('AC-12', '/me reflète immédiatement les 2 grants', mine.json?.grants?.length === 2, mine.text);
  for (const g of [g1, g2]) {
    const rev = await call('POST', `/admin/v1/platform-authority/grants/${g.json.id}/revoke`, T('FOUNDER'), { lockVersion: g.json.lockVersion, reason: 'Acceptation P41 : révocation' });
    expect('AC-13', 'FOUNDER révoque un grant', rev, 201, (r) => (r.json.status === 'REVOKED') || `corps ${r.text}`);
  }
  expect('AC-13', 'RÉVOCATION IMMÉDIATE : financier refusé aussitôt', await fin('NO_PERMISSION', orgB), 403);
  expect('AC-13', 'RÉVOCATION IMMÉDIATE : catalogue refusé aussitôt', await call('GET', '/admin/v1/commercial/capabilities', T('NO_PERMISSION')), 403);
  const mine2 = await me('NO_PERMISSION');
  record('AC-13', '/me ne montre plus aucun grant', mine2.json?.grants?.length === 0, mine2.text);

  // AC-28 : jeton absent / invalide / expiré / falsifié
  expect('AC-28', 'jeton invalide refusé', await call('GET', '/admin/v1/platform-authority/me', 'jeton.invalide.xyz'), 401);
  if (process.env.ACC_JWT_SECRET) {
    const jwt = require(path.join(process.env.ACC_BACKEND_DIR, 'node_modules', 'jsonwebtoken'));
    const payload = JSON.parse(Buffer.from(S.FOUNDER.token.split('.')[1], 'base64url').toString());
    const claims = { ...payload }; delete claims.iat; delete claims.exp;
    expect('AC-28', 'jeton expiré refusé', await call('GET', '/admin/v1/platform-authority/me', jwt.sign(claims, process.env.ACC_JWT_SECRET, { expiresIn: -60 })), 401);
    expect('AC-28', 'jeton signé avec un autre secret refusé', await call('GET', '/admin/v1/platform-authority/me', jwt.sign(claims, 'autre-secret-de-test-0123456789abcdef-xyz', { expiresIn: 600 })), 401);
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + S.FOUNDER.token.split('.')[1] + '.';
    expect('AC-28', 'jeton alg=none refusé', await call('GET', '/admin/v1/platform-authority/me', none), 401);
  }
  // Un jeton valide d'un rôle ne se transforme pas en Founder par altération de la charge utile
  const parts = S.ADMIN_A.token.split('.');
  const forgedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); forgedPayload.role = 'SUPER_ADMIN';
  expect('AC-28', 'charge utile altérée (rôle SUPER_ADMIN) refusée', await call('GET', '/admin/v1/platform-authority/grants', `${parts[0]}.${Buffer.from(JSON.stringify(forgedPayload)).toString('base64url')}.${parts[2]}`), 401);

  // Fuite : aucun jeton ni secret dans le rapport
  const failed = results.filter((r) => !r.ok);
  const report = { generatedAt: new Date().toISOString(), api: `${u.hostname}:${u.port}`, total: results.length, failed: failed.length, results };
  let text = JSON.stringify(report, null, 2);
  for (const s of secrets) text = text.split(s).join('[masqué]');
  if (process.env.ACC_OUT) { fs.mkdirSync(path.dirname(process.env.ACC_OUT), { recursive: true }); fs.writeFileSync(process.env.ACC_OUT, text); }
  console.log(`\nRÉSULTAT : ${results.length - failed.length} ok, ${failed.length} KO`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('ERREUR', e.message); process.exit(2); });
