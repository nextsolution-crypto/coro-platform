#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Sessions RÉELLES d'un backend de test JETABLE (voir ACCEPTANCE-REAL-BACKEND.md) — OUTIL DE TEST UNIQUEMENT.
 *
 *   ACC_API=http://localhost:3052/api ACC_PASSWORD=... ACC_MFA_DIR=... node design-system/bench/real-session.cjs login NOM email [...] --out sessions.json
 *   node design-system/bench/real-session.cjs refresh sessions.json
 *
 * Refuse tout hôte autre que localhost et le port 3002. Les mots de passe et jetons ne sont jamais affichés : ils vont dans le fichier de sortie.
 * Le jeton d'accès vit 15 minutes ; `refresh()` échange le jeton de rafraîchissement (rotation) pour une session longue (balayage).
 */
const fs = require('node:fs');
const path = require('node:path');

const API = process.env.ACC_API || '';
function guard() {
  let u; try { u = new URL(API); } catch { throw new Error('ACC_API invalide'); }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new Error('Refus : hôte non local');
  if (u.port === '3002') throw new Error('Refus : port 3002 interdit');
}

async function call(method, route, token, body) {
  guard();
  const res = await fetch(API + route, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* non JSON */ }
  return { status: res.status, json };
}

function latestMfaCode(dir, email, afterMs) {
  const files = fs.readdirSync(dir).map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  for (const { f, t } of files) {
    if (t < afterMs - 2000) break;
    const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (String(m.to).toLowerCase() === email.toLowerCase()) { const c = /\b(\d{6})\b/.exec(m.subject); if (c) return c[1]; }
  }
  throw new Error('code MFA introuvable pour ' + email);
}

/** Connexion réelle : mot de passe + code MFA capturé (domaine synthétique). Espacer les appels (limite 5 connexions/min). */
async function login(email) {
  const password = process.env.ACC_PASSWORD; const dir = process.env.ACC_MFA_DIR;
  if (!password || !dir) throw new Error('ACC_PASSWORD et ACC_MFA_DIR requis');
  const start = Date.now();
  const first = await call('POST', '/auth/login', null, { email, password });
  if (first.status >= 300 || !first.json?.mfaRequired) throw new Error(`login ${email}: ${first.status}`);
  await new Promise((r) => setTimeout(r, 400));
  const verified = await call('POST', '/auth/verify-mfa', null, { email, code: latestMfaCode(dir, email, start) });
  if (verified.status >= 300) throw new Error(`verify-mfa ${email}: ${verified.status}`);
  return { token: verified.json.access_token, refresh: verified.json.refresh_token, user: verified.json.user };
}

/** Connexion réelle du PORTAIL CLIENT (comptes client synthétiques) : mot de passe + code MFA capturé. Réponse : { token, user }. */
async function loginPortal(email) {
  const password = process.env.ACC_PASSWORD; const dir = process.env.ACC_MFA_DIR;
  if (!password || !dir) throw new Error('ACC_PASSWORD et ACC_MFA_DIR requis');
  const start = Date.now();
  const first = await call('POST', '/client-auth/login', null, { email, password });
  if (first.status >= 300) throw new Error(`login portail ${email}: ${first.status}`);
  if (first.json?.token && first.json?.user) return { token: first.json.token, user: first.json.user, portal: true };
  if (!first.json?.mfaRequired) throw new Error(`login portail ${email}: réponse inattendue`);
  await new Promise((r) => setTimeout(r, 400));
  const verified = await call('POST', '/client-auth/verify-mfa', null, { email, code: latestMfaCode(dir, email, start) });
  if (verified.status >= 300) throw new Error(`verify-mfa portail ${email}: ${verified.status}`);
  return { token: verified.json.token, user: verified.json.user, portal: true };
}

/** Échange le jeton de rafraîchissement : renvoie une nouvelle session (le jeton de rafraîchissement précédent est révoqué). */
async function refresh(session) {
  let r = await call('POST', '/auth/refresh', null, { refresh_token: session.refresh });
  // Limite de débit du backend (429) : attendre et réessayer plutôt que d'interrompre une longue campagne.
  for (let i = 0; i < 6 && r.status === 429; i++) { await new Promise((res) => setTimeout(res, 15000)); r = await call('POST', '/auth/refresh', null, { refresh_token: session.refresh }); }
  if (r.status >= 300) throw new Error('refresh refusé : ' + r.status);
  return { ...session, token: r.json.access_token, refresh: r.json.refresh_token };
}

module.exports = { login, loginPortal, refresh };

if (require.main === module) {
  (async () => {
    const [cmd, ...rest] = process.argv.slice(2);
    if (cmd === 'login') {
      const out = rest[rest.indexOf('--out') + 1];
      const pairs = rest.slice(0, rest.indexOf('--out'));
      const sessions = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
      for (let i = 0; i < pairs.length; i += 2) {
        if (i) await new Promise((r) => setTimeout(r, 13000));
        sessions[pairs[i]] = await login(pairs[i + 1]);
        console.log('session ouverte :', pairs[i], sessions[pairs[i]].user.role);
      }
      fs.writeFileSync(out, JSON.stringify(sessions, null, 2));
    } else if (cmd === 'login-portal') {
      const out = rest[rest.indexOf('--out') + 1];
      const pairs = rest.slice(0, rest.indexOf('--out'));
      const sessions = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
      for (let i = 0; i < pairs.length; i += 2) {
        if (i) await new Promise((r) => setTimeout(r, 13000));
        sessions[pairs[i]] = await loginPortal(pairs[i + 1]);
        console.log('session portail ouverte :', pairs[i], sessions[pairs[i]].user.role);
      }
      fs.writeFileSync(out, JSON.stringify(sessions, null, 2));
    } else if (cmd === 'refresh') {
      const file = rest[0]; const sessions = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const k of Object.keys(sessions)) if (!sessions[k].portal) sessions[k] = await refresh(sessions[k]);
      fs.writeFileSync(file, JSON.stringify(sessions, null, 2));
      console.log('sessions rafraîchies :', Object.keys(sessions).join(', '));
    } else { console.error('usage : login NOM email ... --out FILE | refresh FILE'); process.exit(2); }
  })().catch((e) => { console.error('ERREUR :', e.message); process.exit(3); });
}
