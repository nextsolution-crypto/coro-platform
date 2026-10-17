#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Acceptation NAVIGATEUR sur le vrai backend (plan ACCEPTANCE-REAL-BACKEND.md, AC-20 à AC-28) — outil de test uniquement.
 * Chrome piloté par cdp.cjs ; la session est une VRAIE session (connexion + MFA faits par acceptance-real-backend.cjs),
 * injectée sans jeton de rafraîchissement : le navigateur ne peut donc pas allonger ni changer la session.
 *
 * Variables : BENCH_BASE_URL (build de préproduction), ACC_API, ACC_SESSIONS (JSON écrit par l'acceptation API),
 * ACC_JWT_SECRET + ACC_BACKEND_DIR (jeton expiré), ACC_SHOTS (dossier de captures), ACC_OUT (rapport JSON), ACC_ONLY (filtre profils).
 * Garde-fous : refuse la production et le port 3002 ; aucun jeton ni identifiant dans le rapport.
 */
const fs = require('fs');
const path = require('path');
const { launch, openSession, sleep, VIEWPORTS, BASE } = require('./cdp.cjs');

const API = (process.env.ACC_API || '').replace(/\/$/, '');
const au = new URL(API || 'http://invalide');
if (!API || /getcoro\.io$/i.test(au.hostname) || au.port === '3002' || !['localhost', '127.0.0.1'].includes(au.hostname)) { console.error('Refus : API de test locale (hors 3002) requise.'); process.exit(2); }
const SESSIONS_FILE = process.env.ACC_SESSIONS;
const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
const SHOTS = process.env.ACC_SHOTS;
const ONLY = (process.env.ACC_ONLY || '').split(',').filter(Boolean);

// Autorité attendue (contrat de main) par profil.
const PROFILES = [
  { name: 'FOUNDER', founder: true, platform: true, finance: true },
  { name: 'DELEGATED', founder: false, platform: true, finance: false },
  { name: 'NO_PERMISSION', founder: false, platform: false, finance: false },
  { name: 'ROLE_ONLY_SUPER_ADMIN', founder: false, platform: false, finance: false },
  { name: 'ADMIN_A', founder: false, platform: false, finance: false },
  { name: 'ADMIN_B', founder: false, platform: false, finance: false },
  { name: 'CONSEILLER_A', founder: false, platform: false, finance: false },
].filter((p) => !ONLY.length || ONLY.includes(p.name));
const MODES = [
  ['classic', { ui: 'legacy', theme: 'SYSTEM', colorScheme: 'light' }],
  ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true, colorScheme: 'light' }],
  ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true, colorScheme: 'light' }],
  ['glass-system', { ui: 'glass', theme: 'SYSTEM', beta: true, colorScheme: 'dark' }],
];
const results = [];
let current = '';
function check(label, ok, detail) { results.push({ scope: current, label, ok: !!ok, detail: ok ? undefined : String(detail ?? '').slice(0, 300) }); console.log(`${ok ? 'OK ' : 'KO '} [${current}] ${label}${ok ? '' : ' -> ' + String(detail ?? '').slice(0, 200)}`); }

async function refreshAccess(profile) {
  // Chaîne de rafraîchissement propre à ce script (jamais donnée au navigateur) ; le backend limite à 10 par minute.
  const rec = sessions[profile];
  const res = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: rec.refresh }) });
  if (!res.ok) throw new Error(`refresh ${profile}: ${res.status}`);
  const j = await res.json(); rec.token = j.access_token; rec.refresh = j.refresh_token;
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 1), { mode: 0o600 });
  await sleep(6500);
  return rec;
}

const text = (s) => s.eval('document.body.innerText');
const path_ = (s) => s.eval('location.pathname');
const navLinks = (s) => s.eval(`JSON.stringify([...document.querySelectorAll('aside nav button')].map(a=>a.textContent.trim()))`).then(JSON.parse);
const SENSITIVE_GRANTS = /Accorder une permission|Accorder après validation|Permissions existantes/;
// Observateurs installés avant tout script : enregistrent si un contenu sensible a été rendu, même une fraction de seconde (« flash »).
//  __flash : contenu réservé (page des permissions, montants financiers ; le simple titre de la page de rendement n'est pas une donnée) ; __cross : données de l'AUTRE organisation cliente.
// Les données de sa propre organisation (ex. « Projet A » sur le tableau de bord d'un ADMIN de A) ne sont pas une fuite.
const OTHER_ORG = { ADMIN_A: 'Client B P41|Projet B|Bâtiment B|ConseillerB|AdminB', CONSEILLER_A: 'Client B P41|Projet B|Bâtiment B|ConseillerB|AdminB', ADMIN_B: 'Client A P41|Projet A|Bâtiment A|ConseillerA|AdminA' };
const flashWatch = (profile) => String.raw`(()=>{window.__flash=[];window.__cross=[];const re=/Accorder une permission|Permissions existantes|Justification de révocation|\d[\d\s ]*[,.]\d{2}\s?(?:\$|CAD|USD|EUR)|10[\s ]?000/;const cross=${OTHER_ORG[profile] ? '/' + OTHER_ORG[profile] + '/' : 'null'};const scan=()=>{const t=document.body&&document.body.innerText||'';let m=re.exec(t);if(m&&!window.__flash.includes(m[0]))window.__flash.push(m[0]);m=cross&&cross.exec(t);if(m&&!window.__cross.includes(m[0]))window.__cross.push(m[0])};new MutationObserver(scan).observe(document,{childList:true,subtree:true,characterData:true});setInterval(scan,50)})()`;
const FLASH_WATCH = flashWatch('FOUNDER_EXPIRED');

async function setValue(s, selector, value) {
  return s.eval(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return 'absent';const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return 'ok'})()`);
}
const clickText = (s, re) => s.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>${re}.test(x.textContent));if(!b)return 'absent';b.click();return 'ok'})()`);

async function runProfile(profile, modeName, mode) {
  const meta = PROFILES.find((p) => p.name === profile);
  current = `${profile}/${modeName}`;
  const rec = await refreshAccess(profile);
  const browser = await launch();
  const { port } = browser;
  const prevBase = BASE;
  void prevBase;
  let s;
  try {
    s = await openSession(port, { ui: mode.ui, theme: mode.theme, colorScheme: mode.colorScheme, viewport: 1440, beta: mode.beta, real: { access: rec.token, user: rec.user } });
    await s.send('Page.addScriptToEvaluateOnNewDocument', { source: flashWatch(profile) });
    const nav = async (route, wait = 5000) => { await s.send('Page.navigate', { url: BASE + route }); await sleep(wait); return path_(s); };

    // AC-27 : session hydratée depuis la vraie API, puis F5
    let here = await nav('/dashboard');
    check('session réelle : /dashboard atteint sans passer par /login', here === '/dashboard', here);
    const shell = await s.eval(`JSON.stringify({ui:document.documentElement.getAttribute('data-ui')||'',theme:document.documentElement.getAttribute('data-theme')||''})`).then(JSON.parse);
    const expectGlass = mode.ui === 'glass';
    check(`rendu ${modeName} : ${expectGlass ? 'shell Glass' : 'Classic sans shell Glass'}`, expectGlass ? shell.ui === 'glass' : shell.ui !== 'glass', JSON.stringify(shell));
    if (expectGlass) {
      const expectedTheme = mode.theme === 'DARK' ? 'dark' : mode.theme === 'LIGHT' ? 'light' : mode.colorScheme;
      check(`thème ${expectedTheme} appliqué`, shell.theme === expectedTheme, JSON.stringify(shell));
    }

    // AC-20 : menu
    const links = await navLinks(s);
    const hasLink = (t) => links.some((l) => l.includes(t));
    check('menu : navigation rendue (garde-fou contre un menu vide)', links.length >= 5 && hasLink('Tableau de bord'), links.join(' | '));
    check(`menu : « Permissions plateforme » ${meta.founder ? 'visible' : 'ABSENT'}`, hasLink('Permissions plateforme') === meta.founder, links.join(' | '));
    const platformGroup = await s.eval(`/Catalogue|Commercial|Configurateur|Propositions|Contrats|Droits/i.test(document.querySelector('aside')?.innerText||'')`);
    check(`menu : groupe commercial/plateforme ${meta.platform ? 'visible' : 'ABSENT'}`, platformGroup === meta.platform, links.join(' | ').slice(0, 300));
    check('menu : aucune entrée « Rendement équipe » financière exposée à un profil non autorisé', meta.finance || !(await s.eval(`/Rentabilité/i.test(document.querySelector('aside')?.innerText||'')`)), links.join(' | '));

    // AC-27 : F5
    await s.send('Page.reload'); await sleep(5000);
    const afterReload = { path: await path_(s), links: await navLinks(s), shell: await s.eval(`document.documentElement.getAttribute('data-theme')||''`) };
    check('F5 : même écran, même thème, même menu', afterReload.path === '/dashboard' && afterReload.shell === shell.theme && JSON.stringify(afterReload.links) === JSON.stringify(links), JSON.stringify(afterReload).slice(0, 250));

    // AC-21 : accès direct à la page des permissions
    here = await nav('/admin/platform-permission-grants', 6500);
    const body = await text(s);
    const flash = await s.eval('JSON.stringify(window.__flash||[])').then(JSON.parse).catch(() => []);
    if (meta.founder) {
      check('page Permissions : atteinte par le Founder', here === '/admin/platform-permission-grants' && /Permissions plateforme/.test(body) && /Accorder une permission/.test(body), `${here} ${body.slice(0, 120)}`);
      check('page Permissions : provenance affichée (justification, organisation, accordé par)', /Acceptation P41 : délégation globale/.test(body) && /Toutes les organisations/.test(body) && /Client A P41/.test(body) && /Accordé par/.test(body), body.slice(0, 300));
    } else {
      check('page Permissions : redirigé vers /dashboard', here === '/dashboard', here);
      check('page Permissions : AUCUN contenu sensible, même brièvement (observateur DOM)', flash.length === 0 && !SENSITIVE_GRANTS.test(body), JSON.stringify(flash));
    }
    if (OTHER_ORG[profile]) check('aucune donnée de l’autre organisation cliente rendue (page Permissions → redirection)', (await s.eval('JSON.stringify(window.__cross||[])').then(JSON.parse)).length === 0, await s.eval('JSON.stringify(window.__cross)'));
    await s.eval('window.__flash=[]');

    // AC-22 : écrans commerciaux
    for (const route of ['/admin/commercial', '/admin/commercial/configurator', '/admin/product-catalog']) {
      here = await nav(route, 5500);
      const landed = here === route;
      check(`${route} : ${meta.platform ? 'atteint' : 'redirigé vers /dashboard'}`, meta.platform ? landed : here === '/dashboard', here);
    }

    // AC-23 / AC-26 : rendement financier
    await s.eval('window.__flash=[]');
    here = await nav('/dashboard/rendement', 7000);
    const rbody = await text(s);
    const rflash = await s.eval('JSON.stringify(window.__flash||[])').then(JSON.parse).catch(() => []);
    if (meta.finance) {
      check('rendement financier : écran et indicateurs du Founder, sans RangeError', here === '/dashboard/rendement' && /Rendement et rentabilité/.test(rbody) && !/RangeError/.test(rbody) && s.consoleErrors.every((e) => !/RangeError/.test(e)), `${here} ${rbody.slice(0, 160)}`);
    } else {
      const noFigures = !/10\s?000/.test(rbody) && !/(\d[\d\s]*[,.]\d{2})\s?\$/.test(rbody);
      check('rendement financier : aucune valeur financière visible', noFigures, rbody.slice(0, 200));
      check('rendement financier : aucun contenu financier rendu, même brièvement', rflash.length === 0, JSON.stringify(rflash));
      if (OTHER_ORG[profile]) check('rendement : aucune donnée de l’autre organisation cliente, même brièvement', (await s.eval('JSON.stringify(window.__cross||[])').then(JSON.parse)).length === 0, await s.eval('JSON.stringify(window.__cross)'));
    }

    // AC-24 : débordement horizontal (tableau de bord) à 4 largeurs
    await nav('/dashboard', 4500);
    for (const w of [1440, 1920, 390, 430, 768]) {
      await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[w]); await sleep(900);
      const o = await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth})`).then(JSON.parse);
      check(`aucun débordement horizontal à ${w} px (/dashboard)`, o.docW <= o.vw + 1, JSON.stringify(o));
    }
    if (SHOTS) { await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[1440]); await sleep(500); await s.screenshot(path.join(SHOTS, profile, `${modeName}-dashboard-1440.png`)); }

    // Tiroir mobile (Glass) : focus et Échap
    if (expectGlass) {
      await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[390]); await sleep(900);
      const opened = await s.eval(`(()=>{const b=document.querySelector('button[aria-controls=coro-sidebar]');if(!b)return 'absent';b.click();return 'ok'})()`);
      await sleep(600);
      const st = await s.eval(`(()=>{const a=document.querySelector('aside');return JSON.stringify({modal:a&&a.getAttribute('aria-modal'),inAside:!!a&&a.contains(document.activeElement)})})()`).then(JSON.parse);
      check('tiroir mobile : ouvert, modal, focus dans le tiroir', opened === 'ok' && st.modal === 'true' && st.inAside, JSON.stringify(st));
      const drawerLinks = await navLinks(s);
      check('tiroir mobile : mêmes entrées de menu que sur le bureau', JSON.stringify(drawerLinks) === JSON.stringify(links), drawerLinks.join('|').slice(0, 200));
      await s.key('Escape', 'Escape', 27); await sleep(500);
      check('tiroir mobile : Échap rend le focus au bouton d’ouverture', await s.eval(`document.activeElement===document.querySelector('button[aria-controls=coro-sidebar]')`));
    }

    // Page des permissions du Founder : écrans à 4 largeurs + flux d'octroi / révocation dans l'interface
    if (meta.founder) {
      await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[1440]);
      await nav('/admin/platform-permission-grants', 6500);
      for (const w of [1440, 1920, 390, 430]) {
        await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[w]); await sleep(900);
        const o = await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth})`).then(JSON.parse);
        check(`page Permissions : aucun débordement horizontal à ${w} px`, o.docW <= o.vw + 1, JSON.stringify(o));
        if (SHOTS) await s.screenshot(path.join(SHOTS, 'FOUNDER', `${modeName}-permissions-${w}.png`));
      }
      await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[1440]); await sleep(800);
      check('page Permissions : aucune exception JavaScript', s.consoleErrors.length === 0, s.consoleErrors.map((e) => String(e).split('\n')[0]).join(' | '));
      await grantsFlow(s, modeName);
    }
    if (!meta.founder) check('aucune exception JavaScript non gérée', s.consoleErrors.filter((e) => !/Request failed|403|401|Network Error/.test(e)).length === 0, s.consoleErrors.map((e) => String(e).split('\n')[0]).join(' | '));
  } finally {
    try { if (s) await s.close(); } catch { /* ignoré */ }
    await browser.close();
  }
}

/** Octroi ORGANIZATION et GLOBAL (case + confirmation), annulation de la confirmation, révocation avec confirmation — via l'interface. */
async function grantsFlow(s, modeName) {
  await s.eval(`window.__confirms=[];window.__answer=true;window.confirm=(m)=>{window.__confirms.push(m);return window.__answer}`);
  const count = () => s.eval(`document.querySelectorAll('article').length`);
  const before = await count();
  const users = await s.eval(`JSON.stringify([...document.querySelectorAll('select[aria-label="Employé CORO admissible"] option')].map(o=>({v:o.value,t:o.textContent})))`).then(JSON.parse);
  const target = users.find((u) => /noperm@p41\.test/.test(u.t));
  check('formulaire : employés CORO admissibles = employés internes non Founder (aucun client, aucun SUPER_ADMIN)', !!target && !users.some((u) => /admin-a|admin-b|conseiller|founder@|roleonly/.test(u.t)) && users.some((u) => /delegated@/.test(u.t)), users.map((u) => u.t).join(' | ').slice(0, 300));
  const orgs = await s.eval(`JSON.stringify([...document.querySelectorAll('select[aria-label="Organisation cliente"] option')].map(o=>({v:o.value,t:o.textContent})))`).then(JSON.parse);
  check('formulaire : organisations clientes seulement (opérateur exclu)', orgs.some((o) => /Client B P41/.test(o.t)) && !orgs.some((o) => /opérateur/.test(o.t)), orgs.map((o) => o.t).join(' | '));
  const orgB = orgs.find((o) => /Client B P41/.test(o.t));
  // 1) ORGANIZATION
  await setValue(s, 'select[aria-label="Employé CORO admissible"]', target.v);
  await setValue(s, 'select[aria-label="Permission plateforme"]', 'FINANCIAL_RENDEMENT_READ');
  await setValue(s, 'select[aria-label="Organisation cliente"]', orgB.v);
  await setValue(s, 'textarea[aria-label="Justification du grant"]', `Acceptation P41 navigateur ${modeName} : octroi organisation`);
  await clickText(s, '/Accorder après validation/'); await sleep(2500);
  check('octroi ORGANIZATION : confirmé par le serveur et visible dans la liste', (await text(s)).includes('Permission activée après confirmation du serveur') && (await count()) === before + 1, (await text(s)).slice(0, 200));
  // 2) GLOBAL sans case, puis avec confirmation refusée, puis acceptée
  await s.eval(`[...document.querySelectorAll('input[type=radio]')].find(r=>r.parentElement.textContent.trim()==='GLOBAL').click()`); await sleep(300);
  await setValue(s, 'select[aria-label="Employé CORO admissible"]', target.v);
  await setValue(s, 'select[aria-label="Permission plateforme"]', 'COMMERCIAL_CATALOG_MANAGE');
  await setValue(s, 'textarea[aria-label="Justification du grant"]', `Acceptation P41 navigateur ${modeName} : octroi global`);
  await clickText(s, '/Accorder après validation/'); await sleep(800);
  check('GLOBAL sans case cochée : refusé, aucun octroi', (await text(s)).includes('Confirmez la portée globale') && (await count()) === before + 1, '');
  await s.eval(`document.querySelector('input[type=checkbox]').click()`); await sleep(200);
  await s.eval('window.__answer=false'); await clickText(s, '/Accorder après validation/'); await sleep(1200);
  check('GLOBAL, confirmation du navigateur refusée : aucun octroi', (await count()) === before + 1 && (await s.eval('window.__confirms.length')) === 1, '');
  await s.eval('window.__answer=true'); await clickText(s, '/Accorder après validation/'); await sleep(2500);
  check('GLOBAL, case + confirmation acceptée : octroyé', (await count()) === before + 2 && /Toutes les organisations/.test(await text(s)), '');
  // 3) révocation : motif trop court, confirmation refusée, puis acceptée
  const revokeAll = async () => {
    for (let i = 0; i < 4; i++) {
      const info = await s.eval(`(()=>{const a=[...document.querySelectorAll('article')].find(x=>/noperm@p41\\.test/.test(x.textContent)&&/ACTIVE/.test(x.textContent)&&x.querySelector('input'));return a?a.querySelector('h3').textContent:null})()`);
      if (!info) return i;
      const sel = `input[aria-label="Justification de révocation ${info}"]`;
      if (i === 0) {
        await clickText(s, '/Révoquer/'); await sleep(600);
        check('révocation sans motif suffisant : refusée', (await text(s)).includes('La justification de révocation doit contenir au moins 10 caractères'), '');
        await setValue(s, sel, `Acceptation P41 ${modeName} : révocation`);
        await s.eval('window.__answer=false'); await s.eval(`[...document.querySelectorAll('article')].find(x=>/noperm@p41\\.test/.test(x.textContent)&&/ACTIVE/.test(x.textContent)).querySelector('button').click()`); await sleep(800);
        check('révocation, confirmation refusée : le grant reste ACTIF', await s.eval(`[...document.querySelectorAll('article')].some(x=>/noperm@p41\\.test/.test(x.textContent)&&/ACTIVE/.test(x.textContent))`), '');
        await s.eval('window.__answer=true');
      } else await setValue(s, sel, `Acceptation P41 ${modeName} : révocation`);
      await s.eval(`[...document.querySelectorAll('article')].find(x=>/noperm@p41\\.test/.test(x.textContent)&&/ACTIVE/.test(x.textContent)&&x.querySelector('input')).querySelector('button').click()`); await sleep(2500);
    }
    return 4;
  };
  await revokeAll();
  const left = await s.eval(`[...document.querySelectorAll('article')].filter(x=>/noperm@p41\\.test/.test(x.textContent)&&/ACTIVE/.test(x.textContent)).length`);
  check('révocations confirmées : plus aucun grant actif pour l’employé sans permission', left === 0, String(left));
  check('révoqués : motif de révocation et statut conservés (audit visible)', /Motif de révocation/.test(await text(s)) && /REVOKED/.test(await text(s)), '');
  check('confirmations demandées pour GLOBAL et pour chaque révocation', (await s.eval('window.__confirms.length')) >= 4, String(await s.eval('window.__confirms.length')));
}

/** AC-28 : session expirée ou invalide — l'application renvoie vers /login et n'expose aucune autorité. */
async function expiredSessionCases() {
  current = 'SESSION';
  const jwt = require(path.join(process.env.ACC_BACKEND_DIR, 'node_modules', 'jsonwebtoken'));
  const f = sessions.FOUNDER;
  const claims = (() => { const p = JSON.parse(Buffer.from(f.token.split('.')[1], 'base64url').toString()); delete p.iat; delete p.exp; return p; })();
  const cases = [
    ['jeton expiré', jwt.sign(claims, process.env.ACC_JWT_SECRET, { expiresIn: -120 })],
    ['jeton signé avec un autre secret', jwt.sign(claims, 'autre-secret-de-test-0123456789abcdef-xyz', { expiresIn: 600 })],
    ['jeton absurde', 'pas.un.jeton'],
  ];
  for (const [label, token] of cases) {
    const browser = await launch();
    let s;
    try {
      s = await openSession(browser.port, { ui: 'glass', theme: 'DARK', viewport: 1440, beta: true, real: { access: token, user: f.user } });
      await s.send('Page.addScriptToEvaluateOnNewDocument', { source: FLASH_WATCH });
      await s.send('Page.navigate', { url: BASE + '/admin/platform-permission-grants' }); await sleep(7000);
      const here = await path_(s); const body = await text(s);
      const flash = await s.eval('JSON.stringify(window.__flash||[])').then(JSON.parse).catch(() => []);
      check(`${label} : renvoyé vers /login`, here === '/login', here);
      check(`${label} : aucune autorité ni contenu Founder exposé (même brièvement)`, flash.length === 0 && !/Permissions plateforme|Accorder une permission/.test(body), JSON.stringify(flash));
    } finally { try { if (s) await s.close(); } catch { /* ignoré */ } await browser.close(); }
  }
}

(async () => {
  for (const p of PROFILES) for (const [modeName, mode] of MODES) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const mark = results.length;
      await sleep(attempt === 1 ? 20000 : 65000);
      await runProfile(p.name, modeName, mode);
      const sessionCheck = results.slice(mark).find((r) => r.label.startsWith('session réelle'));
      if (sessionCheck && sessionCheck.ok) break;
      if (attempt === 1) { console.log(`   (session non établie pour ${p.name}/${modeName} : limitation de débit probable du backend, nouvel essai)`); results.length = mark; }
    }
  }
  if (!ONLY.length || ONLY.includes('FOUNDER')) { await refreshAccess('FOUNDER'); await expiredSessionCases(); }
  const failed = results.filter((r) => !r.ok);
  if (process.env.ACC_OUT) { fs.mkdirSync(path.dirname(process.env.ACC_OUT), { recursive: true }); fs.writeFileSync(process.env.ACC_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, total: results.length, failed: failed.length, results }, null, 2)); }
  console.log(`\nRÉSULTAT : ${results.length - failed.length} ok, ${failed.length} KO`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('ERREUR', e); process.exit(2); });
