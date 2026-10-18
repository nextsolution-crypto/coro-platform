#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de la migration V2 (mandat 49) dans un navigateur réel, avec les SESSIONS RÉELLES d'un backend de test jetable. OUTIL DE TEST UNIQUEMENT.
 *
 *   BENCH_BASE_URL=http://localhost:3049 ACC_API=http://localhost:3052/api node design-system/bench/skin-scenarios.cjs --app app \
 *     --sessions D:/CORO-Workspace/p49/sessions.json --profile DEMO_ADMIN [--only sidebar-350,classic-fallback] [--json OUT.json]
 *   BENCH_BASE_URL=http://localhost:3050 ... --app portal --sessions .../portal-sessions.json --profile PORTAL_MANAGER
 *
 * Le serveur testé doit être un build portant le jeton de préproduction (NEXT_PUBLIC_GLASS_BETA=production-preview).
 */
const fs = require('node:fs');
const { launch, openSession, sleep } = require('./cdp.cjs');

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const APP = opt('--app', 'app');
const only = opt('--only') ? opt('--only').split(',') : null;
const sessionsFile = opt('--sessions'); const profile = opt('--profile', 'FOUNDER');
const TAB = ['Tab', 'Tab', 9];
const ESC = ['Escape', 'Escape', 27];

async function liveReal() {
  const all = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  if (all[profile].portal) return { access: all[profile].token, user: all[profile].user, portal: true };
  const rs = require('./real-session.cjs');
  all[profile] = await rs.refresh(all[profile]);
  fs.writeFileSync(sessionsFile, JSON.stringify(all, null, 2));
  return { access: all[profile].token, user: all[profile].user };
}

const state = (s) => s.eval(`JSON.stringify({ui:document.documentElement.dataset.ui,theme:document.documentElement.dataset.theme,mode:document.documentElement.getAttribute('data-cg-mode'),skinSheet:!!document.getElementById('cg-skin-css'),cg:document.querySelectorAll('[class*="cg-"]').length,path:location.pathname,ready:document.documentElement.hasAttribute('data-ui-ready')})`).then(JSON.parse);

/** Éléments focalisables atteints par Tab et présence d'un indicateur de focus visible (contour ou ombre). */
async function focusAudit(s, n) {
  const res = [];
  for (let i = 0; i < n; i++) {
    await s.key(...TAB);
    res.push(JSON.parse(await s.eval(`(()=>{const e=document.activeElement;if(!e||e===document.body)return JSON.stringify({body:true});const c=getComputedStyle(e);const ow=parseFloat(c.outlineWidth)||0;return JSON.stringify({tag:e.tagName,name:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),outline:c.outlineStyle!=='none'&&ow>0,shadow:c.boxShadow!=='none'})})()`)));
  }
  return res;
}

const APP_ROUTES = ['/projects', '/clients', '/buildings', '/bookings', '/planning', '/settings/users', '/dashboard/rendement', '/admin/commercial', '/notifications', '/library'];

const scenarios = [
  {
    name: 'sidebar-350', apps: ['app'], desc: 'barre latérale : Glass 350 px par défaut, borne 180–400, largeur enregistrée valide conservée, Classique 240 px',
    async run(ctx, check) {
      const width = (s) => s.eval(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`);
      let s = await ctx.open({ ui: 'glass', theme: 'LIGHT', viewport: 1600, beta: true });
      await s.goto('/projects');
      await s.eval(`localStorage.removeItem('coro-glass-sidebar-width')`); await s.send('Page.reload'); await sleep(4500);
      check('Glass (/projects, mode skin) : 350 px par défaut', (await width(s)) === 350, 'largeur ' + (await width(s)));
      check('mode de la route = skin', (await state(s)).mode === 'skin');
      await s.eval(`localStorage.setItem('coro-glass-sidebar-width','300')`); await s.send('Page.reload'); await sleep(4500);
      check('largeur enregistrée valide (300) conservée', (await width(s)) === 300, 'largeur ' + (await width(s)));
      await s.eval(`localStorage.setItem('coro-glass-sidebar-width','999')`); await s.send('Page.reload'); await sleep(4500);
      const w = await width(s);
      check('valeur enregistrée hors bornes : ramenée dans 180–400', w >= 180 && w <= 400, 'largeur ' + w);
      await s.close();
      s = await ctx.open({ ui: 'legacy', theme: 'LIGHT', viewport: 1600 });
      await s.goto('/projects');
      check('Classique : 240 px', (await width(s)) === 240, 'largeur ' + (await width(s)));
      await s.close();
    },
  },
  {
    name: 'classic-fallback', apps: ['app', 'portal'], desc: 'Classique : aucune route ne rend de Glass ni ne charge la feuille de teinte (build de préproduction, préférence Classique)',
    async run(ctx, check) {
      const routes = APP === 'portal' ? ['/dashboard', '/documents', '/buildings', '/notifications', '/profile', '/map', '/login'] : APP_ROUTES.concat(['/profile', '/dashboard', '/login']);
      const s = await ctx.open({ ui: 'legacy', theme: 'DARK', viewport: 1600, beta: true });
      for (const r of routes) {
        const how = await s.goto(r);
        if (how.startsWith('ECHEC')) { check(`${r} : accessible`, true, 'redirigée (' + how + ')'); }
        const st = await state(s);
        const requests = await s.eval(`performance.getEntriesByType('resource').filter(e=>/glass-skin/.test(e.name)).length`);
        check(`${r} : Classique (data-ui=legacy, aucun data-cg-mode, aucune feuille de teinte)`, st.ui === 'legacy' && st.mode === null && !st.skinSheet && requests === 0, JSON.stringify(st) + ' requêtes teinte ' + requests);
      }
      await s.close();
    },
  },
  {
    name: 'skin-load', apps: ['app', 'portal'], desc: 'chargement paresseux : la feuille de teinte n’est demandée qu’en mode skin/canvas et retirée en le quittant',
    async run(ctx, check) {
      const first = APP === 'portal' ? '/dashboard' : '/projects';
      const s = await ctx.open({ ui: 'glass', theme: 'DARK', viewport: 1600, beta: true });
      await s.goto(first);
      let st = await state(s);
      check(`${first} : mode ${APP === 'portal' ? 'canvas' : 'skin'}, feuille liée et chargée`, st.mode === (APP === 'portal' ? 'canvas' : 'skin') && st.skinSheet && st.ready, JSON.stringify(st));
      const loaded = await s.eval(`(()=>{const l=document.getElementById('cg-skin-css');return !!(l&&l.sheet&&l.sheet.cssRules.length>30)})()`);
      check('la feuille est évaluée (> 30 règles groupées)', loaded);
      if (APP === 'app') {
        await s.eval(`window.next.router.push('/dashboard')`); await sleep(3500);
        st = await state(s);
        check('/dashboard (Glass natif) : feuille de teinte retirée', st.mode === 'glass' && !st.skinSheet, JSON.stringify(st));
        await s.eval(`window.next.router.push('/projects')`); await sleep(3500);
        st = await state(s);
        check('retour sur /projects : feuille rechargée', st.mode === 'skin' && st.skinSheet && st.ready, JSON.stringify(st));
      }
      await s.close();
    },
  },
  {
    name: 'appearance-switch', apps: ['app', 'portal'], desc: 'choix d’apparence : Classique ↔ Glass, Clair / Sombre / Système, mémorisé et appliqué sans rechargement',
    async run(ctx, check) {
      const s = await ctx.open({ ui: 'legacy', theme: 'SYSTEM', viewport: 1600, beta: true, colorScheme: 'light' });
      await s.goto('/profile');
      const click = (label) => s.eval(`(()=>{const b=[...document.querySelectorAll('button[role=radio]')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(label)}));if(!b)return false;b.click();return true})()`);
      check('section « Apparence » présente (build de préproduction)', await s.eval(`!!([...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Apparence'))`));
      let st = await state(s);
      check('Classique par défaut', st.ui === 'legacy' && st.mode === null, JSON.stringify(st));
      check('choix « Liquid Glass » possible', await click('Liquid Glass')); await sleep(2500);
      st = await state(s);
      check('Glass actif sans rechargement', st.ui === 'glass' && !!st.mode, JSON.stringify(st));
      await click('Sombre'); await sleep(800); st = await state(s);
      check('Sombre', st.theme === 'dark', JSON.stringify(st));
      await click('Clair'); await sleep(800); st = await state(s);
      check('Clair', st.theme === 'light', JSON.stringify(st));
      await click('Système'); await sleep(800); st = await state(s);
      check('Système (préférence du navigateur claire) → clair', st.theme === 'light', JSON.stringify(st));
      await s.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); await sleep(900); st = await state(s);
      check('Système réagit en direct : navigateur sombre → sombre', st.theme === 'dark', JSON.stringify(st));
      const stored = JSON.parse(await s.eval(`JSON.stringify({ui:localStorage.getItem('coro-ui-generation'),theme:localStorage.getItem('coro-theme-preference')})`));
      check('préférences mémorisées localement', stored.ui === 'glass' && stored.theme === 'SYSTEM', JSON.stringify(stored));
      await click('Classique'); await sleep(1200); st = await state(s);
      check('retour Classique : plus de Glass ni de feuille de teinte', st.ui === 'legacy' && st.mode === null && !st.skinSheet, JSON.stringify(st));
      await s.close();
    },
  },
  {
    name: 'focus-keyboard', apps: ['app', 'portal'], desc: 'clavier : chaque arrêt de focus a un indicateur visible en Glass Light et Dark, au moins aussi bon qu’en Classique',
    async run(ctx, check) {
      const routes = APP === 'portal' ? ['/dashboard', '/documents', '/profile'] : ['/projects', '/clients', '/settings/users'];
      for (const r of routes) {
        const res = {};
        for (const [name, cfg] of [['legacy', { ui: 'legacy', theme: 'LIGHT' }], ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true }], ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true }]]) {
          const s = await ctx.open({ ...cfg, viewport: 1600 });
          const how = await s.goto(r);
          if (how.startsWith('ECHEC')) { res[name] = null; await s.close(); continue; }
          await sleep(500);
          const stops = (await focusAudit(s, 14)).filter((x) => !x.body);
          res[name] = { stops: stops.length, visible: stops.filter((x) => x.outline || x.shadow).length };
          await s.close();
        }
        if (!res.legacy) { check(`${r} : accessible`, false, JSON.stringify(res)); continue; }
        for (const m of ['glass-light', 'glass-dark']) {
          const g = res[m]; const l = res.legacy;
          check(`${r} ${m} : ${g.visible}/${g.stops} arrêts avec indicateur (Classique ${l.visible}/${l.stops})`, g.stops > 0 && g.visible / g.stops >= l.visible / Math.max(1, l.stops) - 0.01, JSON.stringify(res));
        }
      }
    },
  },
  {
    name: 'modal-above-shell', apps: ['app'], desc: 'modale d’un écran re-teinté : au premier plan, opaque, lisible en Dark',
    async run(ctx, check) {
      const s = await ctx.open({ ui: 'glass', theme: 'DARK', viewport: 1600, beta: true });
      await s.goto('/clients'); await sleep(800);
      const clicked = await s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>/nouveau|ajouter|cr[ée]er/i.test(x.textContent));if(!b)return null;b.click();return b.textContent.trim().slice(0,30)})()`);
      if (!clicked) { check('bouton d’ouverture de modale trouvé', false, 'aucun'); await s.close(); return; }
      await sleep(900);
      const info = JSON.parse(await s.eval(`(()=>{const ov=[...document.querySelectorAll('body *')].find(e=>{const c=getComputedStyle(e);const r=e.getBoundingClientRect();return c.position==='fixed'&&r.width>innerWidth*0.9&&r.height>innerHeight*0.9&&!e.closest('aside')});if(!ov)return JSON.stringify({found:false});const topEl=document.elementFromPoint(200,20);const panel=[...ov.querySelectorAll('*')].find(e=>{const c=getComputedStyle(e);return c.backgroundColor!=='rgba(0, 0, 0, 0)'&&e.getBoundingClientRect().width>300});return JSON.stringify({found:true,coversTopbar:ov.contains(topEl),panelBg:panel?getComputedStyle(panel).backgroundColor:null,mode:document.documentElement.getAttribute('data-cg-mode')})})()`));
      check('« ' + clicked + ' » ouvre une modale plein écran', info.found, JSON.stringify(info));
      check('la modale recouvre la barre du haut', info.coversTopbar, JSON.stringify(info));
      const alpha = info.panelBg ? (/rgba\(.*,\s*([0-9.]+)\)/.exec(info.panelBg) || [0, '1'])[1] : '0';
      check('panneau de la modale opaque (alpha ≥ 0,94)', Number(alpha) >= 0.94, String(info.panelBg));
      await s.key(...ESC); await sleep(500);
      await s.close();
    },
  },
];

(async () => {
  const chrome = await launch();
  let failed = 0; const report = [];
  try {
    for (const sc of scenarios) {
      if (!sc.apps.includes(APP) || (only && !only.includes(sc.name))) continue;
      const checks = []; const check = (label, ok, detail = '') => checks.push({ label, ok: !!ok, detail });
      const ctx = { open: async (cfg) => openSession(chrome.port, { ...cfg, role: 'SUPER_ADMIN', real: await liveReal() }) };
      try { await sc.run(ctx, check); } catch (e) { check('exécution du scénario', false, String(e.message || e)); }
      const bad = checks.filter((c) => !c.ok); failed += bad.length;
      console.log(`${bad.length ? '✗' : '✓'} ${sc.name} — ${sc.desc}`);
      for (const c of checks) console.log(`    ${c.ok ? 'ok ' : 'KO '} ${c.label}${c.ok ? '' : ' : ' + c.detail}`);
      report.push({ name: sc.name, desc: sc.desc, checks });
    }
  } finally { await chrome.close(); }
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(report, null, 2));
  console.log(failed ? `\nSCÉNARIOS : ${failed} contrôle(s) en échec` : '\nSCÉNARIOS : tous les contrôles satisfaits');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERREUR :', e.stack || e.message); process.exit(3); });
