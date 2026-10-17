/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de /activities/portfolio (Phase 07A) : mêmes vérifications en Legacy, en île (bêta non activée) et en Glass.
 * Ils supposent un faux API configuré par variables d'environnement (voir bench/mock-api.cjs) :
 *   données  : BENCH_ACTIVITIES=1           (7 activités, 3 projets, 3 clients)
 *   vide     : (défaut)
 *   erreur   : BENCH_FAIL_CLIENTS=1         (/api/clients → 500)
 *   chargement : BENCH_DELAY_MS=20000
 * Lancement : node design-system/bench/cli.cjs scenarios --only portfolio-data-legacy,...  (un jeu de scénarios par état du faux API).
 * Les valeurs attendues (totaux, ordre, destinations) viennent du code Legacy et du jeu de données du faux API, pas de la vue Glass.
 */
const { sleep } = require('./cdp.cjs');

const NL = 'String.fromCharCode(10)';
const MODES = [
  ['legacy', { ui: 'legacy', theme: 'SYSTEM' }],
  ['island', { ui: 'glass', theme: 'DARK' }],
  ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true }],
  ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true }],
];

const waitPath = async (s, predicate, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await s.eval('location.pathname'); if (predicate(p)) return p; await sleep(400); } return s.eval('location.pathname'); };

/** Valeur numérique qui suit un libellé de statistique dans le texte de <main>. */
const statValue = (s, label) => s.eval(`(()=>{const L=document.querySelector('main').innerText.split(${NL}).map(x=>x.trim()).filter(Boolean);const i=L.indexOf(${JSON.stringify(label)});return i<0?null:Number(L[i+1])})()`);
const visibleRows = (s) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length`);
const visibleCards = (s) => s.eval(`(()=>{const c=[...document.querySelectorAll('main [class~="md:hidden"]')].find(e=>e.getClientRects().length>0&&e.children.length>0);return c?c.children.length:0})()`);
const clientsInRows = (s) => s.eval(`JSON.stringify([...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).map(r=>r.children[0].innerText.trim()))`).then(JSON.parse);
const setControl = (s, index, value) => s.eval(`(()=>{const c=[...document.querySelectorAll('main input[type=text], main select')][${index}];if(!c)return false;const proto=c.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(c,${JSON.stringify(value)});c.dispatchEvent(new Event(c.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`);
const controlsCount = (s) => s.eval(`document.querySelectorAll('main input[type=text], main select').length`);

function make(kind, mode, opts, run) {
  const [modeName, base] = mode;
  return { name: `portfolio-${kind}-${modeName}`, description: `/activities/portfolio — ${kind} (${modeName})`, route: '/activities/portfolio', viewport: opts.viewport || 1600, ...base, ...(opts.extra || {}), run };
}

const scenarios = [];
for (const mode of MODES) {
  // ───── DONNÉES : statistiques, filtres, ouverture de ligne, téléchargement .ics ─────
  scenarios.push(make('data', mode, {}, async (s, check) => {
    await sleep(1500);
    const counts = { total: await statValue(s, 'Total activités'), done: await statValue(s, 'Terminées'), todo: await statValue(s, 'À faire'), postponed: await statValue(s, 'Reportées') };
    check('statistiques : total 7, terminées 1, à faire 3, reportées 1', counts.total === 7 && counts.done === 1 && counts.todo === 3 && counts.postponed === 1, JSON.stringify(counts));
    check('progression globale 14 %', (await s.eval(`document.querySelector('main').innerText`)).includes('14%'));
    check('7 lignes dans le tableau', (await visibleRows(s)) === 7, String(await visibleRows(s)));
    check('ordre : par date prévue croissante, sans date en dernier', JSON.stringify(await clientsInRows(s)) === JSON.stringify(['Organisation Démo A', 'Organisation Démo A', 'Organisation Démo B', 'Organisation Démo A', 'Organisation Démo B', 'Organisation Démo A', 'Organisation Démo A']), JSON.stringify(await clientsInRows(s)));
    check('4 contrôles de filtre (recherche + 3 listes)', (await controlsCount(s)) === 4, String(await controlsCount(s)));
    check('libellé long tronqué dans la cellule (pas de débordement)', await s.eval(`[...document.querySelectorAll('main table tbody tr')].every(r=>r.children[2].scrollWidth<=r.children[2].clientWidth+2||getComputedStyle(r.children[2].querySelector('.truncate')||r.children[2]).textOverflow==='ellipsis')`));
    // Filtre statut « À faire »
    await setControl(s, 2, 'a_faire'); await sleep(500);
    check('filtre statut « À faire » → 3 lignes et statistiques recalculées (total 3)', (await visibleRows(s)) === 3 && (await statValue(s, 'Total activités')) === 3, `${await visibleRows(s)} / ${await statValue(s, 'Total activités')}`);
    await setControl(s, 2, '');
    // Filtre client
    await setControl(s, 1, 'c-p1'); await sleep(500);
    check('filtre client (Organisation Démo A) → 3 lignes', (await visibleRows(s)) === 3, String(await visibleRows(s)));
    await setControl(s, 1, '');
    // Filtre type
    await setControl(s, 3, 'rencontre'); await sleep(500);
    check('filtre type « rencontre » → 2 lignes', (await visibleRows(s)) === 2, String(await visibleRows(s)));
    await setControl(s, 3, '');
    // Recherche (client, bâtiment ou libellé) puis aucun résultat
    await setControl(s, 0, 'formation'); await sleep(500);
    check('recherche « formation » → 1 ligne', (await visibleRows(s)) === 1, String(await visibleRows(s)));
    await setControl(s, 0, 'zzz-introuvable'); await sleep(500);
    const text = await s.eval(`document.querySelector('main').innerText`);
    check('aucun résultat → « Aucune activité trouvée », plus de tableau, plus de progression', text.includes('Aucune activité trouvée') && (await visibleRows(s)) === 0 && !text.includes('Progression globale'));
    await setControl(s, 0, ''); await sleep(500);
    check('filtres vidés → retour aux 7 lignes', (await visibleRows(s)) === 7);
    // Téléchargement .ics : fetch intercepté (aucun appel réseau réel), navigation non déclenchée
    await s.eval(`window.__ics=[];window.fetch=(u,o)=>{window.__ics.push({u:String(u),auth:o&&o.headers&&o.headers.Authorization});return Promise.resolve({blob:()=>Promise.resolve(new Blob(['x']))})};URL.createObjectURL=()=>'blob:bench';URL.revokeObjectURL=()=>{}`);
    const icsButtons = await s.eval(`[...document.querySelectorAll('main button[title="Télécharger .ics"]')].filter(b=>b.getClientRects().length>0).length`);
    check('6 boutons .ics (une activité sans date n’en a pas)', icsButtons === 6, String(icsButtons));
    await s.eval(`[...document.querySelectorAll('main button[title="Télécharger .ics"]')].find(b=>b.getClientRects().length>0).click()`); await sleep(600);
    const ics = JSON.parse(await s.eval('JSON.stringify(window.__ics)'));
    check('clic .ics : requête vers /activities/<id>/ics avec jeton, sans navigation', ics.length === 1 && /\/activities\/a6\/ics$/.test(ics[0].u) && /^Bearer /.test(ics[0].auth || '') && (await s.eval('location.pathname')) === '/activities/portfolio', JSON.stringify(ics));
    // Ouverture d'une ligne
    await s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[1].children[0].click()`);
    const p = await waitPath(s, (x) => x !== '/activities/portfolio', 40000);
    check('clic sur une ligne → /projects/p1/activities', p === '/projects/p1/activities', p);
  }));

  // ───── MOBILE (390, 320) : cartes, cibles tactiles, pas de défilement horizontal ─────
  for (const width of [390, 320]) {
    scenarios.push(make(`mobile${width}`, mode, { viewport: width }, async (s, check) => {
      await sleep(1500);
      check('7 cartes visibles (le tableau est masqué)', (await visibleCards(s)) === 7 && (await visibleRows(s)) === 0, `${await visibleCards(s)} cartes / ${await visibleRows(s)} lignes`);
      const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,ics:[...document.querySelectorAll('main button[title="Télécharger .ics"]')].filter(b=>b.getClientRects().length>0).map(b=>Math.round(Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height)))})`));
      check('aucun défilement horizontal de la page', m.docW <= m.vw, JSON.stringify(m));
      check('6 boutons .ics visibles', m.ics.length === 6, JSON.stringify(m.ics));
      if (mode[0].startsWith('glass')) check('cibles tactiles des boutons .ics ≥ 44 px (Glass)', m.ics.every((v) => v >= 44), JSON.stringify(m.ics));
      await s.eval(`(()=>{const c=[...document.querySelectorAll('main [class~="md:hidden"]')].find(e=>e.getClientRects().length>0&&e.children.length>0);c.children[1].querySelector('p').click()})()`);
      const p = await waitPath(s, (x) => x !== '/activities/portfolio', 40000);
      check('clic sur une carte → /projects/p1/activities', p === '/projects/p1/activities', p);
    }));
  }

  // ───── TABLETTE 768 : tableau avec défilement interne, jamais de défilement de page ─────
  scenarios.push(make('tablet768', mode, { viewport: 768 }, async (s, check) => {
    await sleep(1500);
    const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,rows:[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length,tableW:Math.round(document.querySelector('main table').getBoundingClientRect().width)})`));
    check('tableau visible (7 lignes), largeur mini 900 px', m.rows === 7 && m.tableW >= 899, JSON.stringify(m));
    check('aucun défilement horizontal de la page (le tableau défile dans son conteneur)', m.docW <= m.vw, JSON.stringify(m));
  }));

  // ───── CLAVIER : ordre des contrôles puis boutons .ics ─────
  scenarios.push(make('keyboard', mode, {}, async (s, check) => {
    await sleep(1500);
    await s.eval(`window.__ics=[];window.fetch=(u,o)=>{window.__ics.push(String(u));return Promise.resolve({blob:()=>Promise.resolve(new Blob(['x']))})};URL.createObjectURL=()=>'blob:bench';URL.revokeObjectURL=()=>{}`);
    await s.eval('document.body.focus()');
    const order = [];
    for (let i = 0; i < 80 && order.length < 5; i++) {
      await s.key('Tab', 'Tab', 9);
      const d = await s.eval(`(()=>{const a=document.activeElement;if(!a||!document.querySelector('main').contains(a))return null;return a.tagName+':'+(a.getAttribute('aria-label')||a.getAttribute('title')||a.getAttribute('placeholder')||'')})()`);
      if (d) order.push(d);
    }
    const glass = mode[0].startsWith('glass');
    // Legacy et île : seules les lignes cliquables à la souris, le premier arrêt après les filtres est le bouton .ics.
    // Glass : le premier arrêt est le bouton natif d'ouverture du projet (Phase 07B), le .ics vient juste après.
    check(glass ? 'Tab : recherche, client, statut, type, puis bouton « Ouvrir le projet » de la 1re ligne' : 'Tab : recherche, client, statut, type, puis premier bouton .ics', order.length === 5 && order[0].startsWith('INPUT') && order.slice(1, 4).every((x) => x.startsWith('SELECT')) && (glass ? order[4].startsWith('BUTTON:Organisation') || /^BUTTON:Ouvrir le projet de /.test(order[4]) : order[4].startsWith('BUTTON:')), JSON.stringify(order));
    if (glass) { await s.key('Tab', 'Tab', 9); }
    await s.key('Enter', 'Enter', 13);
    await sleep(600);
    const ics = JSON.parse(await s.eval('JSON.stringify(window.__ics)'));
    check('Entrée sur le bouton .ics → téléchargement demandé, pas de navigation', ics.length === 1 && /\/ics$/.test(ics[0]) && (await s.eval('location.pathname')) === '/activities/portfolio', JSON.stringify(ics));
  }));

  // ───── CLAVIER GLASS (Phase 07B) : ouverture du projet et .ics, une seule action par touche ─────
  if (mode[0].startsWith('glass')) {
    const probe = (s) => s.eval(`(()=>{const w=(k)=>{const c=JSON.parse(sessionStorage.getItem('__bench')||'{}');c[k]=(c[k]||0)+1;sessionStorage.setItem('__bench',JSON.stringify(c))};sessionStorage.setItem('__bench','{}');window.fetch=(u)=>{if(String(u).endsWith('/ics'))w('ics');return Promise.resolve({blob:()=>Promise.resolve(new Blob(['x']))})};URL.createObjectURL=()=>'blob:bench';URL.revokeObjectURL=()=>{};if(window.navigation)window.navigation.addEventListener('navigate',()=>w('nav'));window.addEventListener('click',()=>w('clicks'),true)})()`);
    // Compteurs en sessionStorage : ils survivent à un éventuel rechargement complet lors de la navigation vers le projet.
    const counters = async (s) => { const c = JSON.parse(await s.eval("sessionStorage.getItem('__bench')||'{}'")); return { ics: c.ics || 0, nav: c.nav || 0, clicks: c.clicks || 0, path: await s.eval('location.pathname') }; };
    const focusDesc = (s) => s.eval(`(()=>{const a=document.activeElement;if(!a)return null;const c=getComputedStyle(a);const r=a.getBoundingClientRect();return JSON.stringify({tag:a.tagName,name:a.getAttribute('aria-label')||'',title:a.getAttribute('title')||'',role:a.getAttribute('role'),tabindex:a.getAttribute('tabindex'),outlineStyle:c.outlineStyle,outlineWidth:parseFloat(c.outlineWidth),h:Math.round(r.height),inView:r.top>=0&&r.bottom<=innerHeight})})()`).then((v) => (v ? JSON.parse(v) : null));
    // Arrive sur le premier bouton « Ouvrir le projet » visible en tabulant depuis le haut de la page.
    const tabToOpen = async (s) => {
      await s.eval('document.body.focus()');
      for (let i = 0; i < 80; i++) { await s.key('Tab', 'Tab', 9); const d = await focusDesc(s); if (d && /^Ouvrir le projet de /.test(d.name)) return d; }
      return null;
    };
    const kinds = [['kbopen-enter', 1600, 'Enter', 'Enter', 13], ['kbopen-space', 1600, 'Espace', ' ', 32], ['kbopen-mobile390', 390, 'Entrée', 'Enter', 13]];
    for (const [kind, viewport, label, key, vk] of kinds) {
      scenarios.push(make(kind, mode, { viewport }, async (s, check) => {
        await sleep(1500);
        await probe(s);
        const d = await tabToOpen(s);
        check('bouton natif « Ouvrir le projet » atteint par Tab, sans rôle ARIA ni tabindex artificiel', !!d && d.tag === 'BUTTON' && d.role === null && d.tabindex === null, JSON.stringify(d));
        check('focus visible (contour ≥ 2 px) et cible ≥ 44 px, dans la fenêtre', !!d && d.outlineStyle !== 'none' && d.outlineWidth >= 2 && d.h >= 44 && d.inView, JSON.stringify(d));
        // Ordre : ouverture → .ics (si la ligne a une date) → ouverture de la ligne suivante.
        await s.key('Tab', 'Tab', 9);
        const next = await focusDesc(s);
        check('Tab suivant : bouton .ics distinct de la même ligne', !!next && next.title === 'Télécharger .ics' && /^Télécharger /.test(next.name), JSON.stringify(next));
        await s.key('Tab', 'Tab', 9);
        const after = await focusDesc(s);
        check('Tab suivant : « Ouvrir le projet » de la ligne suivante (aucun arrêt parasite)', !!after && /^Ouvrir le projet de /.test(after.name), JSON.stringify(after));
        // .ics au clavier : une requête par touche, aucune navigation, aucun clic de ligne.
        await s.key('Tab', 'Tab', 9, true); await s.key('Tab', 'Tab', 9, true); // retour sur « Ouvrir le projet » (Maj+Tab ×2)
        const back = await focusDesc(s);
        await s.key('Tab', 'Tab', 9); // sur le .ics
        const c0 = await counters(s);
        await s.key('Enter', 'Enter', 13);
        const c1 = await counters(s);
        check('Entrée sur .ics : 1 téléchargement, 0 navigation, 1 clic', c1.ics - c0.ics === 1 && c1.nav === c0.nav && c1.clicks - c0.clicks === 1 && c1.path === '/activities/portfolio', JSON.stringify({ c0, c1 }));
        await s.key(' ', 'Space', 32);
        const c2 = await counters(s);
        check('Espace sur .ics : 1 téléchargement, 0 navigation, 1 clic', c2.ics - c1.ics === 1 && c2.nav === c1.nav && c2.clicks - c1.clicks === 1 && c2.path === '/activities/portfolio', JSON.stringify({ c1, c2 }));
        check('retour de Maj+Tab sur le même bouton d’ouverture', !!back && /^Ouvrir le projet de /.test(back.name) && back.name === d.name, JSON.stringify({ back, d }));
        // Ouverture au clavier : exactement une navigation, une seule activation.
        await s.key('Tab', 'Tab', 9, true);
        const onOpen = await focusDesc(s);
        const c3 = await counters(s);
        await s.key(key, key === ' ' ? 'Space' : 'Enter', vk);
        const p = await waitPath(s, (x) => x !== '/activities/portfolio', 40000);
        const c4 = await counters(s);
        check(`${label} sur « Ouvrir le projet » → /projects/p3/activities (projet de la 1re ligne)`, p === '/projects/p3/activities', `${p} / ${JSON.stringify(onOpen)}`);
        check(`${label} : une seule activation (1 clic) et un seul changement d’URL`, c4.clicks - c3.clicks === 1 && c4.ics === c3.ics && c4.nav - c3.nav === 1, JSON.stringify({ c3, c4 }));
      }));
    }
  }

  // ───── VIDE / ERREUR : même rendu (une erreur donne la liste vide en Legacy) ─────
  for (const kind of ['empty', 'error']) {
    scenarios.push(make(kind, mode, {}, async (s, check) => {
      await sleep(1500);
      const t = await s.eval(`document.querySelector('main').innerText`);
      check('« Aucune activité trouvée » affiché', t.includes('Aucune activité trouvée'));
      check('statistiques à zéro, sans barre de progression', (await statValue(s, 'Total activités')) === 0 && !t.includes('Progression globale'));
      check('filtres présents (4 contrôles) et aucun tableau', (await controlsCount(s)) === 4 && (await visibleRows(s)) === 0);
      check('aucune exception de page non gérée', true);
    }));
  }

  // ───── CHARGEMENT (réponse retardée) ─────
  scenarios.push(make('loading', mode, {}, async (s, check) => {
    await sleep(1000);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('« Chargement du portefeuille... » affiché', t.includes('Chargement du portefeuille...'), t.slice(0, 80));
    check('ni statistiques, ni filtres, ni tableau pendant le chargement', !t.includes('Total activités') && (await controlsCount(s)) === 0 && (await visibleRows(s)) === 0);
    if (mode[0].startsWith('glass')) check('zone annoncée aux lecteurs d’écran (role=status)', await s.eval(`!!document.querySelector('main [role=status]')`));
  }));
}

module.exports = scenarios;
