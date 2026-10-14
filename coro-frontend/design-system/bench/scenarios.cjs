/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios d'interaction dans un navigateur réel (vraies touches clavier, vraie molette, vrais clics).
 * Chaque scénario : { name, description, route, ui, theme, viewport, run(session, check) }.
 * `check(libellé, condition, détail)` consigne un résultat ; le scénario échoue si une condition est fausse.
 */
const { sleep } = require('./cdp.cjs');

const TAB = ['Tab', 'Tab', 9];
const ESC = ['Escape', 'Escape', 27];

const html = (s) => s.eval(`JSON.stringify({ui:document.documentElement.dataset.ui,theme:document.documentElement.dataset.theme,ready:document.documentElement.hasAttribute('data-ui-ready'),islands:document.querySelectorAll('.cg-legacy-island').length,cg:document.querySelectorAll('[class*="cg-"]').length,path:location.pathname})`).then(JSON.parse);

module.exports = [
  {
    name: 'drawer',
    description: 'tiroir mobile Glass : focus, Échap, inertie, verrouillage du défilement',
    route: '/dashboard', ui: 'glass', theme: 'DARK', viewport: 390,
    async run(s, check) {
      const open = () => s.eval(`document.querySelector('button[aria-controls=coro-sidebar]').click()`);
      const state = () => s.eval(`(()=>{const a=document.querySelector('aside');const m=document.querySelector('main');const act=document.activeElement;return JSON.stringify({role:a.getAttribute('role'),modal:a.getAttribute('aria-modal'),inert:a.inert,mainInert:m.inert,inAside:a.contains(act),tag:act&&act.tagName,htmlOv:document.documentElement.style.overflow||'-',x:Math.round(a.getBoundingClientRect().x)})})()`).then(JSON.parse);
      let st = await state();
      check('tiroir fermé : inerte et hors écran', st.inert && st.x < 0, JSON.stringify(st));
      await open(); await sleep(500); st = await state();
      check('ouvert : role=dialog, aria-modal, focus dans le tiroir, zone principale inerte', st.role === 'dialog' && st.modal === 'true' && st.inAside && st.mainInert, JSON.stringify(st));
      check('ouvert : défilement de <html> verrouillé', st.htmlOv === 'hidden', st.htmlOv);
      await s.wheel(380, 400, 600);
      check('molette sur le fond : la page ne défile pas', (await s.eval('Math.round(scrollY)')) === 0);
      let escaped = 0;
      for (let i = 0; i < 40; i++) { await s.key(...TAB); if (!(await state()).inAside && !(await s.eval(`document.activeElement===document.querySelector('button[aria-controls=coro-sidebar]')`))) escaped++; }
      check('40 × Tab : le focus ne sort jamais du tiroir (hors bouton de fermeture)', escaped === 0, escaped + ' sortie(s)');
      await s.key(...ESC); await sleep(400); st = await state();
      check('Échap : ferme, rend le tiroir inerte, déverrouille le défilement', st.inert && st.htmlOv === '-' && !st.mainInert, JSON.stringify(st));
      check('Échap : le focus revient au bouton d’ouverture', await s.eval(`document.activeElement===document.querySelector('button[aria-controls=coro-sidebar]')`));
      const targets = JSON.parse(await s.eval(`JSON.stringify([...document.querySelectorAll('button[aria-controls=coro-sidebar], button[title=Notifications]')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]}))`));
      check('cibles tactiles du header ≥ 44 px', targets.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(targets));
    },
  },
  {
    name: 'island-modal-above-shell',
    description: 'modale d’un écran Legacy dans un îlot : au-dessus du shell, lisible en Dark, variables restaurées',
    route: '/clients', ui: 'glass', theme: 'DARK', viewport: 1600,
    async run(s, check) {
      const h = await html(s);
      check('shell Glass actif et contenu enveloppé dans un îlot', h.ui === 'glass' && h.islands === 1, JSON.stringify(h));
      const probe = () => s.eval(`(()=>{const fixed=[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().width>innerWidth*0.9&&e.getBoundingClientRect().height>innerHeight*0.9&&!e.closest('aside')&&!e.matches('button[aria-label="Fermer le menu"]'));return fixed.length?fixed[0]:null})()?'ok':null`);
      const before = await probe();
      const clicked = await s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>/nouveau|ajouter|cr[ée]er/i.test(x.textContent));if(!b)return null;b.click();return b.textContent.trim().slice(0,30)})()`);
      if (!clicked) { check('bouton d’ouverture de modale trouvé sur /clients', false, 'aucun bouton « Nouveau/Ajouter/Créer » (page vide avec le faux API ?)'); return; }
      await sleep(700);
      const info = JSON.parse(await s.eval(`(()=>{const ov=[...document.querySelectorAll('body *')].find(e=>{const c=getComputedStyle(e);const r=e.getBoundingClientRect();return c.position==='fixed'&&r.width>innerWidth*0.9&&r.height>innerHeight*0.9&&!e.closest('aside')});if(!ov)return JSON.stringify({found:false});const topEl=document.elementFromPoint(200,20);const bar=document.querySelector('.sticky');const modal=ov.querySelector('[class*="rounded"]')||ov;return JSON.stringify({found:true,z:getComputedStyle(ov).zIndex,coversTopbar:ov.contains(topEl),inIsland:!!ov.closest('.cg-legacy-island'),textPrimary:getComputedStyle(ov).getPropertyValue('--text-primary').trim(),scheme:getComputedStyle(ov).colorScheme,topbarZ:bar&&getComputedStyle(bar).zIndex})})()`));
      check('« ' + clicked + ' » ouvre une modale plein écran', info.found && !before, JSON.stringify(info));
      check('la modale recouvre la barre du haut (pas piégée sous le shell)', info.coversTopbar, JSON.stringify(info));
      check('la modale reste dans l’îlot : variables Legacy rétablies et color-scheme clair', info.inIsland && info.textPrimary.toUpperCase() === '#2C3E50' && /light/.test(info.scheme), JSON.stringify(info));
      const first = JSON.parse(await s.eval(`(()=>{const ov=[...document.querySelectorAll('body *')].find(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().width>innerWidth*0.9&&!e.closest('aside'));const t=[...ov.querySelectorAll('h1,h2,h3,label,button')].find(x=>x.textContent.trim());if(!t)return 'null';const cs=getComputedStyle(t);return JSON.stringify({text:t.textContent.trim().slice(0,30),color:cs.color})})()`));
      check('texte de la modale non clair sur fond clair', first && first.color !== 'rgb(237, 243, 250)', JSON.stringify(first));
    },
  },
  {
    name: 'shell-floating-menu',
    description: 'menu profil du shell sur un écran Legacy : au-dessus du contenu, opaque, utilisable',
    route: '/clients', ui: 'glass', theme: 'DARK', viewport: 1600,
    async run(s, check) {
      await s.eval(`[...document.querySelectorAll('button')].find(b=>/Alex/.test(b.textContent)).click()`); await sleep(500);
      const r = JSON.parse(await s.eval(`(()=>{const p=document.querySelector('.cg-panel');if(!p)return JSON.stringify({found:false});const rect=p.getBoundingClientRect();const el=document.elementFromPoint(rect.left+30,rect.top+60);return JSON.stringify({found:true,bg:getComputedStyle(p).backgroundColor,onTop:p.contains(el)})})()`));
      check('menu profil ouvert, rendu en panneau Glass', r.found, JSON.stringify(r));
      check('panneau opaque (≥ 0,94) et au premier plan', /rgba?\(.*(0\.9[4-9]|, 1\))/.test(r.bg) || /^rgb\(/.test(r.bg), r.bg);
      check('le menu est au-dessus du contenu de l’îlot', r.onTop, JSON.stringify(r));
    },
  },
  {
    name: 'kit-modal',
    description: 'GlassModal (route /glass-kit) : focus, piège, Échap, inertie, verrouillage, urgence',
    route: '/glass-kit', ui: 'glass', theme: 'DARK', viewport: 1600,
    async run(s, check) {
      const opener = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Ouvrir une modale')`;
      await s.eval(`${opener}.focus()`); await s.eval(`${opener}.click()`); await sleep(500);
      const dlg = () => s.eval(`(()=>{const d=document.querySelector('[role=dialog][aria-modal=true]');if(!d)return JSON.stringify({open:false});const lab=document.getElementById(d.getAttribute('aria-labelledby'));const desc=document.getElementById(d.getAttribute('aria-describedby'));const inertRoot=[...document.body.children].filter(c=>c.inert).length;return JSON.stringify({open:true,inDialog:d.contains(document.activeElement),activeTag:document.activeElement.tagName,labelled:!!lab,described:!!desc,inertRoot,htmlOv:document.documentElement.style.overflow||'-',bg:getComputedStyle(d).backgroundColor,parentIsBody:d.closest('body')!==null&&d.parentElement.parentElement.parentElement===document.body})})()`).then(JSON.parse);
      let st = await dlg();
      check('ouverte : role=dialog, aria-modal, titre et description reliés', st.open && st.labelled && st.described, JSON.stringify(st));
      check('ouverte : focus initial dans la boîte (champ désigné)', st.inDialog && st.activeTag === 'INPUT', JSON.stringify(st));
      check('ouverte : arrière-plan inerte et défilement verrouillé', st.inertRoot >= 1 && st.htmlOv === 'hidden', JSON.stringify(st));
      check('panneau de la modale opaque (≥ 0,94)', /0\.9[4-9]|, 1\)|^rgb\(/.test(st.bg), st.bg);
      let out = 0; for (let i = 0; i < 30; i++) { await s.key(...TAB); if (!(await dlg()).inDialog) out++; }
      check('30 × Tab : le focus reste dans la modale', out === 0, out + ' sortie(s)');
      await s.key(...ESC); await sleep(400); st = await dlg();
      check('Échap : ferme', !st.open, JSON.stringify(st));
      check('fermée : arrière-plan réactivé, défilement déverrouillé', (await s.eval(`[...document.body.children].filter(c=>c.inert).length`)) === 0 && (await s.eval(`document.documentElement.style.overflow||'-'`)) === '-');
      check('fermée : le focus revient au bouton d’origine', await s.eval(`document.activeElement.textContent.trim()==='Ouvrir une modale'`));
      await s.eval(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Confirmation destructive').click()`); await sleep(500);
      const dz = JSON.parse(await s.eval(`(()=>{const d=document.querySelector('[role=dialog]');const b=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()==='Supprimer');return JSON.stringify({tone:d.getAttribute('data-tone'),btn:getComputedStyle(b).backgroundColor,border:getComputedStyle(d).borderTopColor})})()`));
      check('confirmation destructive : bouton et liseré en rouge d’urgence opaque', dz.tone === 'danger' && dz.btn === 'rgb(192, 57, 43)' && dz.border === 'rgb(192, 57, 43)', JSON.stringify(dz));
      await s.key(...ESC); await sleep(300);
      // Clair : le rouge d'urgence ne change pas
      await s.eval(`localStorage.setItem('coro-theme-preference','LIGHT');window.dispatchEvent(new StorageEvent('storage',{key:'coro-theme-preference'}))`); await sleep(500);
      await s.eval(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Confirmation destructive').click()`); await sleep(500);
      const dl = await s.eval(`(()=>{const d=document.querySelector('[role=dialog]');const b=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()==='Supprimer');return getComputedStyle(b).backgroundColor})()`);
      check('Light : même rouge d’urgence que Dark', dl === 'rgb(192, 57, 43)', dl);
    },
  },
  {
    name: 'unknown-and-fullscreen-routes',
    description: 'routes inconnues et plein écran : document entièrement Legacy même avec la préférence Glass',
    route: '/zz-route-inconnue', ui: 'glass', theme: 'DARK', viewport: 1600,
    async run(s, check) {
      let h = await html(s);
      check('route inconnue : data-ui=legacy, aucune classe cg-*', h.ui === 'legacy' && h.cg === 0, JSON.stringify(h));
      const bg = JSON.parse(await s.eval(`JSON.stringify({c:getComputedStyle(document.body).backgroundColor,i:getComputedStyle(document.body).backgroundImage})`));
      check('route inconnue : aucun fond Glass (pas de dégradé, pas de bleu-noir du canevas Dark)', bg.i === 'none' && bg.c !== 'rgb(14, 18, 23)' && bg.c !== 'rgb(7, 12, 20)', JSON.stringify(bg));
      await s.send('Page.navigate', { url: require('./cdp.cjs').BASE + '/login' }); await sleep(4000);
      h = await html(s);
      check('/login (sans shell) : entièrement Legacy', h.ui === 'legacy' && h.cg === 0, JSON.stringify(h));
      check('/login : la préférence Glass est conservée en stockage', (await s.eval(`localStorage.getItem('coro-ui-generation')`)) === 'glass');
    },
  },
  {
    name: 'client-navigation',
    description: 'navigation côté client : Glass ↔ îlot ↔ plein écran, sans rechargement',
    route: '/dashboard', ui: 'glass', theme: 'DARK', viewport: 1600,
    async run(s, check) {
      const push = async (r) => { await s.eval(`window.next.router.push(${JSON.stringify(r)})`); for (let i = 0; i < 30; i++) { await sleep(1000); if ((await s.eval('location.pathname')) === r) break; } await sleep(800); return html(s); }; // compilation à la demande du serveur de dev : on attend la navigation
      let h = await html(s);
      check('/dashboard : Glass, pas d’îlot', h.ui === 'glass' && h.islands === 0, JSON.stringify(h));
      h = await push('/projects');
      check('/projects (legacy-only) : shell Glass + îlot', h.path === '/projects' && h.ui === 'glass' && h.islands === 1, JSON.stringify(h));
      h = await push('/reset-password');
      check('/reset-password (sans shell ; redirige vers /login sans jeton) : bascule en Legacy', (h.path === '/reset-password' || h.path === '/login') && h.ui === 'legacy' && h.islands === 0, JSON.stringify(h));
      h = await push('/dashboard');
      check('retour /dashboard : Glass rétabli', h.ui === 'glass' && h.islands === 0, JSON.stringify(h));
    },
  },
];
