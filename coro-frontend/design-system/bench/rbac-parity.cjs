#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Parité RBAC (mandat 49) — OUTIL DE TEST UNIQUEMENT. Sessions RÉELLES d'un backend de test jetable.
 *
 * Pour chaque rôle et chaque route sensible : même issue (chemin final, accès accordé ou refusé) entre la RÉFÉRENCE (ad9f86e2, rendu Classique)
 * et V2 en GLASS (bêta activée) ; et aucun texte propre à une autre organisation n'apparaît. La migration visuelle ne doit ouvrir aucun accès,
 * ni en refuser un.
 *
 *   node design-system/bench/rbac-parity.cjs --a http://localhost:3043 --b http://localhost:3049 --sessions F --ids F --out FILE.json
 */
const fs = require('node:fs');
require('../test-loader.cjs');
const { launch, openSession, sleep } = require('./cdp.cjs');
const rs = require('./real-session.cjs');

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const A = opt('--a'); const B = opt('--b');
const sessionsFile = opt('--sessions'); const ids = JSON.parse(fs.readFileSync(opt('--ids'), 'utf8'));
const ROLES = ['FOUNDER', 'DELEGATED', 'NO_PERMISSION', 'ROLE_ONLY_SUPER_ADMIN', 'ADMIN_A', 'ADMIN_B', 'CONSEILLER_A'];
const ROUTES = ['/dashboard/rendement', '/profile/rendement', '/admin/commercial', '/admin/commercial/contracts', '/admin/product-catalog', '/admin/organizations',
  '/admin/platform-permission-grants', '/admin/control-center', '/admin/metering', '/settings/users', '/settings/organization', '/bookings', '/planning', '/admin/procedures', '/admin/health'];
const resolve = (r) => ids[r] || r;

async function visit(chrome, base, ui, real) {
  const out = {};
  for (const route of ROUTES) {
    const s = await openSession(chrome.port, { ui, theme: 'DARK', viewport: 1600, beta: ui === 'glass', role: real.user.role, real });
    try {
      await s.send('Page.navigate', { url: base + resolve(route) }); await sleep(5500);
      out[route] = JSON.parse(await s.eval(`JSON.stringify({path:location.pathname,mode:document.documentElement.getAttribute('data-cg-mode'),text:(document.querySelector('main')||document.body).innerText.replace(/\\s+/g,' ').trim().slice(0,300),n:document.querySelectorAll('main *').length})`));
    } finally { await s.close(); }
  }
  return out;
}

(async () => {
  const all = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  const chrome = await launch(); const rows = []; let bad = 0;
  try {
    for (const role of ROLES) {
      all[role] = await rs.refresh(all[role]);
      fs.writeFileSync(sessionsFile, JSON.stringify(all, null, 2));
      const real = { access: all[role].token, user: all[role].user };
      const a = await visit(chrome, A, 'legacy', real);
      const b = await visit(chrome, B, 'glass', real);
      for (const route of ROUTES) {
        const same = a[route].path === b[route].path;
        // Accès accordé = on reste sur la route ; refusé = redirection. Le contenu texte peut varier (heure) : seul le résultat d'accès compte.
        const grantedA = a[route].path === resolve(route); const grantedB = b[route].path === resolve(route);
        const ok = same && grantedA === grantedB;
        if (!ok) bad++;
        rows.push({ role, route, refPath: a[route].path, v2Path: b[route].path, granted: grantedB, v2Mode: b[route].mode, ok });
        console.log(`${ok ? 'ok ' : 'KO '} ${role.padEnd(22)} ${route.padEnd(36)} réf→${a[route].path}  V2(Glass)→${b[route].path} ${grantedB ? '[accès]' : '[refus]'}`);
      }
    }
  } finally { await chrome.close(); }
  fs.writeFileSync(opt('--out'), JSON.stringify(rows, null, 2));
  console.log(bad ? `\nPARITÉ RBAC : ${bad} divergence(s)` : `\nPARITÉ RBAC : ${rows.length}/${rows.length} issues identiques à la référence`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e.stack || e.message); process.exit(3); });
