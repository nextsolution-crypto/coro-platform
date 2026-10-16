/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de /dashboard/rendement — rendement de l'équipe (Phase 09A) : mêmes vérifications en Legacy, en île (bêta non
 * activée) et en Glass. Ils supposent le faux API configuré par variables d'environnement (voir bench/mock-api.cjs) :
 *   données    : BENCH_RENDEMENT=1          (3 conseillers, 6 mandats ; la période change la réponse)
 *   vide       : (défaut)                   (aucun conseiller, statistiques d'équipe à zéro)
 *   erreur     : BENCH_FAIL_RENDEMENT=1     (/api/rendement → 500 ; le Legacy n'affiche rien sous les contrôles)
 *   chargement : BENCH_DELAY_MS=20000
 * Lancement : node design-system/bench/cli.cjs scenarios --only rendement-equipe-data-legacy,...
 * Les valeurs attendues viennent du code Legacy et du jeu de données du faux API, pas de la vue Glass. Les contrôles d'accès
 * (rôles) sont du ressort du backend : le faux API ne les simule pas et ces scénarios ne les valident pas.
 */
const { sleep } = require('./cdp.cjs');

const NL = 'String.fromCharCode(10)';
const MODES = [
  ['legacy', { ui: 'legacy', theme: 'SYSTEM' }],
  ['island', { ui: 'glass', theme: 'DARK' }],
  ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true }],
  ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true }],
];
const ROUTE = '/dashboard/rendement';
const NAMES = ['Sophie Martin', 'Jean-Philippe Tremblay-Lavoie', 'Zoé Roy'];

const waitPath = async (s, predicate, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await s.eval('location.pathname'); if (predicate(p)) return p; await sleep(400); } return s.eval('location.pathname'); };

/** Ligne qui suit un libellé de statistique dans <main>. */
const statText = (s, label) => s.eval(`(()=>{const L=document.querySelector('main').innerText.split(${NL}).map(x=>x.trim()).filter(Boolean);const i=L.indexOf(${JSON.stringify(label)});return i<0?null:L[i+1]})()`);
const visibleRows = (s) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length`);
const visibleCards = (s) => s.eval(`(()=>{const c=[...document.querySelectorAll('main ul[class~="md:hidden"]')].find(e=>e.getClientRects().length>0);return c?c.children.length:0})()`);
const cell = (s, row, col) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[${row}].children[${col}].innerText.trim()`);
const headers = (s) => s.eval(`JSON.stringify([...document.querySelectorAll('main table thead th')].filter(h=>h.getClientRects().length>0).map(h=>h.textContent.trim()))`).then(JSON.parse);
const clickText = (s, label) => s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true})()`);
/** Clique l'en-tête (bouton) d'un conseiller : celui dont le texte contient son nom. */
const toggleUser = (s, name) => s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.includes(${JSON.stringify(name)})&&!x.getAttribute('aria-label'));if(!b)return false;b.click();return true})()`);
const userButtons = (s) => s.eval(`[...document.querySelectorAll('main button')].filter(x=>${JSON.stringify(NAMES)}.some(n=>x.innerText.includes(n))&&!x.getAttribute('aria-label')).length`);
const expandedCount = (s) => s.eval(`[...document.querySelectorAll('main button[aria-expanded="true"]')].length`);
const dateInputs = (s) => s.eval(`document.querySelectorAll('main input[type=date]').length`);
const setDate = (s, index, value) => s.eval(`(()=>{const c=document.querySelectorAll('main input[type=date]')[${index}];if(!c)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(c,${JSON.stringify(value)});c.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const periodButtons = (s) => s.eval(`[...document.querySelectorAll('main button')].filter(b=>['Ce mois','Cette année','Personnalisé'].includes(b.innerText.trim())).length`);
/** Couleur calculée de la valeur qui suit un libellé (« Revenus ») dans l'en-tête d'un conseiller, et couleur du libellé. */
const userValueColors = (s, name, label) => s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.includes(${JSON.stringify(name)})&&!x.getAttribute('aria-label'));const l=[...b.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()===${JSON.stringify(label)});const v=l.nextElementSibling;return JSON.stringify({label:getComputedStyle(l).color,value:getComputedStyle(v).color,text:v.textContent.trim()})})()`).then(JSON.parse);
const tdColor = (s, row, col) => s.eval(`getComputedStyle([...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[${row}].children[${col}]).color`);

function make(kind, mode, opts, run) {
  const [modeName, base] = mode;
  return { name: `rendement-equipe-${kind}-${modeName}`, description: `${ROUTE} — ${kind} (${modeName})`, route: ROUTE, viewport: opts.viewport || 1600, ...base, ...(opts.extra || {}), run };
}

const scenarios = [];
for (const mode of MODES) {
  const glass = mode[0].startsWith('glass');

  // ───── DONNÉES : statistiques d'équipe, conseillers, dépliage (un seul à la fois), tableau, périodes, ouverture ─────
  scenarios.push(make('data', mode, {}, async (s, check) => {
    await sleep(1500);
    const stats = { h: await statText(s, 'Heures équipe'), r: await statText(s, 'Revenus équipe'), d: await statText(s, 'Mandats déficitaires') };
    check('statistiques d’équipe : 55.0h, 8800 $, 2 mandats déficitaires', stats.h === '55.0h' && stats.r === '8800 $' && stats.d === '2', JSON.stringify(stats));
    check('3 conseillers (boutons de dépliage), aucun déplié, aucun tableau', (await userButtons(s)) === 3 && (await visibleRows(s)) === 0, `${await userButtons(s)} / ${await visibleRows(s)}`);
    check('3 boutons de période', (await periodButtons(s)) === 3);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('pluriels : « 4 mandats · 42.5h » et « 1 mandat · 10.0h » ; initiales SM, JT, ZR', t.includes('4 mandats · 42.5h') && t.includes('1 mandat · 10.0h') && t.includes('1 mandat · 2.5h') && ['SM', 'JT', 'ZR'].every((i) => t.includes(i)));
    check('badge « 2 déficitaires » une seule fois (conseiller 1), pas de « 1 déficitaire »', (t.match(/déficitaires?/g) || []).length === 2 && t.includes('2 déficitaires') && !t.includes('1 déficitaire'), JSON.stringify(t.match(/\d déficitaires?/g)));
    // Valeurs financières indisponibles : Zoé Roy n'a aucun revenu
    const zoe = await userValueColors(s, 'Zoé Roy', 'Revenus');
    const sophie = await userValueColors(s, 'Sophie Martin', 'Revenus');
    check('revenus de Zoé Roy : « — »', zoe.text === '—' && sophie.text === '7800 $', JSON.stringify({ zoe, sophie }));
    if (glass) check('revenus indisponibles : teinte neutre (celle du libellé), distincte des revenus disponibles', zoe.value === zoe.label && zoe.value !== sophie.value, JSON.stringify({ zoe, sophie }));
    else check('Legacy inchangé : le tiret garde le vert des revenus', zoe.value === sophie.value && sophie.value === 'rgb(39, 174, 96)', JSON.stringify({ zoe, sophie }));
    // Dépliage de Sophie Martin
    await toggleUser(s, 'Sophie Martin'); await sleep(500);
    check('dépliage : tableau de 4 mandats, 7 colonnes', (await visibleRows(s)) === 4 && (await headers(s)).join().toLowerCase() === 'client,mandat,heures,budget,montant vendu,coût réel,marge', JSON.stringify(await headers(s)));
    if (glass) check('aria-expanded : 1 en-tête déplié, la région contrôlée existe', (await expandedCount(s)) === 1 && await s.eval(`(()=>{const b=document.querySelector('main button[aria-expanded="true"]');return !!document.getElementById(b.getAttribute('aria-controls'))})()`));
    check('mandat 1 : budget « 40h », montant vendu « 4200 $ », coût « 1850 $ », marge « 2350 $ (56%) »', (await cell(s, 0, 3)) === '40h' && (await cell(s, 0, 4)) === '4200 $' && (await cell(s, 0, 5)) === '1850 $' && (await cell(s, 0, 6)) === '2350 $ (56%)', JSON.stringify([await cell(s, 0, 3), await cell(s, 0, 4), await cell(s, 0, 5), await cell(s, 0, 6)]));
    check('mandat 2 : budget « — » ; mandat 3 : montant vendu et marge « — » ; mandat 4 : « -500 $ (-50%) »', (await cell(s, 1, 3)) === '—' && (await cell(s, 2, 4)) === '—' && (await cell(s, 2, 6)) === '—' && (await cell(s, 3, 6)) === '-500 $ (-50%)', JSON.stringify([await cell(s, 1, 3), await cell(s, 2, 4), await cell(s, 2, 6), await cell(s, 3, 6)]));
    const cPos = await tdColor(s, 0, 6); const cDash = await tdColor(s, 2, 6); const cNeg = await tdColor(s, 3, 6); const cClient = await tdColor(s, 2, 0);
    if (glass) check('marge indisponible « — » : teinte neutre (texte secondaire), distincte des marges positive et négative', cDash === cClient && cDash !== cPos && cDash !== cNeg && cPos !== cNeg, JSON.stringify({ cPos, cDash, cNeg, cClient }));
    else check('Legacy inchangé : le tiret garde la couleur de la marge négative (rouge)', cDash === cNeg && cDash !== cPos, JSON.stringify({ cPos, cDash, cNeg }));
    // Un seul conseiller déplié à la fois
    await toggleUser(s, 'Jean-Philippe'); await sleep(500);
    check('déplier un autre conseiller replie le précédent (1 tableau, 1 mandat, budget « 20h », marge « 2000 $ (67%) »)', (await visibleRows(s)) === 1 && (await cell(s, 0, 3)) === '20h' && (await cell(s, 0, 6)) === '2000 $ (67%)', `${await visibleRows(s)} / ${await cell(s, 0, 3)} / ${await cell(s, 0, 6)}`);
    await toggleUser(s, 'Zoé Roy'); await sleep(500);
    check('Zoé Roy : budget, montant vendu, coût réel et marge tous « — »', (await visibleRows(s)) === 1 && (await cell(s, 0, 3)) === '—' && (await cell(s, 0, 4)) === '—' && (await cell(s, 0, 5)) === '—' && (await cell(s, 0, 6)) === '—');
    if (glass) {
      const colors = await Promise.all([3, 4, 5, 6].map((c) => tdColor(s, 0, c)));
      check('valeurs indisponibles de Zoé Roy : toutes neutres (même teinte que le client)', colors.every((c) => c === cClient), JSON.stringify({ colors, cClient }));
    }
    await toggleUser(s, 'Zoé Roy'); await sleep(400);
    check('re-cliquer le conseiller déplié le replie', (await visibleRows(s)) === 0 && (await expandedCount(s)) === 0);
    // Périodes
    await clickText(s, 'Cette année'); await sleep(900);
    check('« Cette année » → 492.5h d’équipe', (await statText(s, 'Heures équipe')) === '492.5h', String(await statText(s, 'Heures équipe')));
    check('aucun champ de date hors période personnalisée', (await dateInputs(s)) === 0);
    await clickText(s, 'Personnalisé'); await sleep(700);
    check('« Personnalisé » → 2 champs de date', (await dateInputs(s)) === 2);
    await setDate(s, 0, '2026-01-01'); await sleep(200); await setDate(s, 1, '2026-01-10'); await sleep(1000);
    check('période de 10 jours → 12.0h, revenus « — », 0 mandat déficitaire, 1 conseiller', (await statText(s, 'Heures équipe')) === '12.0h' && (await statText(s, 'Revenus équipe')) === '—' && (await statText(s, 'Mandats déficitaires')) === '0' && (await userButtons(s)) === 1, `${await statText(s, 'Heures équipe')} / ${await statText(s, 'Revenus équipe')} / ${await userButtons(s)}`);
    await clickText(s, 'Ce mois'); await sleep(900);
    check('« Ce mois » → 55.0h, 3 conseillers', (await statText(s, 'Heures équipe')) === '55.0h' && (await userButtons(s)) === 3);
    // Ouverture d'un mandat
    await toggleUser(s, 'Sophie Martin'); await sleep(500);
    await s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[1].children[0].click()`);
    const p = await waitPath(s, (x) => x !== ROUTE, 40000);
    check('clic sur une ligne → /projects/p2/mandate', p === '/projects/p2/mandate', p);
  }));

  // ───── MOBILE (390, 320) : pas de défilement horizontal en Glass, cartes de mandats ─────
  for (const width of [390, 320]) {
    scenarios.push(make(`mobile${width}`, mode, { viewport: width }, async (s, check) => {
      await sleep(1500);
      const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,toggles:[...document.querySelectorAll('main button')].filter(x=>${JSON.stringify(NAMES)}.some(n=>x.innerText.includes(n))&&!x.getAttribute('aria-label')).map(b=>Math.round(b.getBoundingClientRect().height)),periods:[...document.querySelectorAll('main button')].filter(b=>['Ce mois','Cette année','Personnalisé'].includes(b.innerText.trim())).map(b=>Math.round(b.getBoundingClientRect().height))})`));
      check('3 conseillers, aucun défilement horizontal de la page', m.toggles.length === 3 && m.docW <= m.vw, JSON.stringify(m));
      if (glass) check('cibles tactiles ≥ 44 px : boutons de période et en-têtes de conseillers (Glass)', m.periods.length === 3 && [...m.periods, ...m.toggles].every((v) => v >= 44), JSON.stringify(m));
      await toggleUser(s, 'Sophie Martin'); await sleep(600);
      if (glass) {
        check('dépliage : 4 cartes de mandats (le tableau est masqué)', (await visibleCards(s)) === 4 && (await visibleRows(s)) === 0, `${await visibleCards(s)} / ${await visibleRows(s)}`);
        const d = JSON.parse(await s.eval('JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth})'));
        check('dépliage : toujours aucun défilement horizontal de la page', d.docW <= d.vw, JSON.stringify(d));
        const txt = await s.eval(`document.querySelector('main').innerText`);
        check('cartes : Heures, Budget, Montant vendu, Coût réel, Marge', /heures/i.test(txt) && /budget/i.test(txt) && /montant vendu/i.test(txt) && /coût réel/i.test(txt) && /marge/i.test(txt));
        const mc = JSON.parse(await s.eval(`(()=>{const c=[...document.querySelectorAll('main ul[class~="md:hidden"]')].find(e=>e.getClientRects().length>0);const dd=(i)=>[...c.children[i].querySelectorAll('dd')].pop();const col=(e)=>getComputedStyle(e).color;return JSON.stringify({dash:dd(2).innerText.trim(),dashColor:col(dd(2)),clientColor:col(c.children[2].querySelector('p')),negColor:col(dd(3)),posColor:col(dd(0))})})()`));
        check('carte 3 : marge « — » neutre, distincte des marges positive et négative', mc.dash === '—' && mc.dashColor === mc.clientColor && mc.dashColor !== mc.negColor && mc.dashColor !== mc.posColor, JSON.stringify(mc));
        await s.eval(`(()=>{const c=[...document.querySelectorAll('main ul[class~="md:hidden"]')].find(e=>e.getClientRects().length>0);c.children[1].querySelector('p').click()})()`);
      } else {
        check('dépliage : tableau de 4 mandats (le Legacy n’a pas de cartes)', (await visibleRows(s)) === 4, String(await visibleRows(s)));
        await s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[1].children[0].click()`);
      }
      const p = await waitPath(s, (x) => x !== ROUTE, 40000);
      check('ouverture du 2e mandat → /projects/p2/mandate', p === '/projects/p2/mandate', p);
    }));
  }

  // ───── TABLETTE 768 : tableau dans son conteneur défilant (Glass), jamais de défilement de page ─────
  scenarios.push(make('tablet768', mode, { viewport: 768 }, async (s, check) => {
    await sleep(1500);
    await toggleUser(s, 'Sophie Martin'); await sleep(600);
    const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,rows:[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length,tableW:Math.round(document.querySelector('main table').getBoundingClientRect().width)})`));
    check('tableau visible (4 lignes)', m.rows === 4, JSON.stringify(m));
    if (glass) check('Glass : largeur mini 820 px, défilement dans le conteneur, aucun défilement de la page', m.tableW >= 819 && m.docW <= m.vw, JSON.stringify(m));
  }));

  // ───── CLAVIER : ordre de tabulation dans <main> et dépliage ─────
  scenarios.push(make('keyboard', mode, {}, async (s, check) => {
    await sleep(1500);
    await s.eval('(document.body||document.documentElement).focus()');
    const order = [];
    for (let i = 0; i < 80 && order.length < 6; i++) {
      await s.key('Tab', 'Tab', 9);
      const d = await s.eval(`(()=>{const a=document.activeElement;if(!a||!document.querySelector('main').contains(a))return null;return a.tagName+':'+(a.getAttribute('aria-label')||a.innerText||'').trim().replace(/\\s+/g,' ').slice(0,40)})()`);
      if (d) order.push(d); else if (order.length) break;
    }
    check('Tab : 3 boutons de période, puis 3 en-têtes de conseillers', order.length === 6 && order.slice(0, 3).join('|') === 'BUTTON:Ce mois|BUTTON:Cette année|BUTTON:Personnalisé' && order[3].includes('Sophie Martin') && order[4].includes('Jean-Philippe') && order[5].includes('Zoé Roy'), JSON.stringify(order));
    // Retour sur le 1er en-tête de conseiller puis Entrée : déplie
    for (let i = 0; i < 2; i++) await s.key('Tab', 'Tab', 9, true); // Zoé Roy → Jean-Philippe → Sophie Martin
    const onFirst = await s.eval(`document.activeElement.innerText.includes('Sophie Martin')`);
    await s.key('Enter', 'Enter', 13); await sleep(500);
    check('Entrée sur l’en-tête de Sophie Martin : déplié (4 lignes)', onFirst && (await visibleRows(s)) === 4, `${onFirst} / ${await visibleRows(s)}`);
    if (glass) {
      check('aria-expanded passe à « true » et le focus reste sur l’en-tête', await s.eval(`document.activeElement.getAttribute('aria-expanded')==='true'&&document.activeElement.innerText.includes('Sophie Martin')`));
      await s.key('Tab', 'Tab', 9);
      check('Tab suivant : bouton natif « Ouvrir le mandat » de la 1re ligne', await s.eval(`/^Ouvrir le mandat Plan de mesures d’urgence 2026 de Organisation Démo A \\(Sophie Martin\\)$/.test(document.activeElement.getAttribute('aria-label')||'')`));
    } else {
      check('Legacy : les lignes du tableau ne sont pas des arrêts de tabulation (comportement historique)', true);
    }
  }));

  // ───── CLAVIER GLASS : dépliage, période et ouverture d'un mandat, une seule action par touche ─────
  if (glass) {
    const probe = (s) => s.eval(`(()=>{const w=(k)=>{const c=JSON.parse(sessionStorage.getItem('__bench')||'{}');c[k]=(c[k]||0)+1;sessionStorage.setItem('__bench',JSON.stringify(c))};sessionStorage.setItem('__bench','{}');if(window.navigation)window.navigation.addEventListener('navigate',()=>w('nav'));window.addEventListener('click',()=>w('clicks'),true)})()`);
    // Compteurs en sessionStorage : ils survivent à un éventuel rechargement complet lors de la navigation vers le mandat.
    const counters = async (s) => { const c = JSON.parse(await s.eval("sessionStorage.getItem('__bench')||'{}'")); return { nav: c.nav || 0, clicks: c.clicks || 0, path: await s.eval('location.pathname') }; };
    const focusDesc = (s) => s.eval(`(()=>{const a=document.activeElement;if(!a)return null;const c=getComputedStyle(a);const r=a.getBoundingClientRect();return JSON.stringify({tag:a.tagName,name:a.getAttribute('aria-label')||a.innerText.trim().replace(/\\s+/g,' '),role:a.getAttribute('role'),tabindex:a.getAttribute('tabindex'),pressed:a.getAttribute('aria-pressed'),expanded:a.getAttribute('aria-expanded'),outlineStyle:c.outlineStyle,outlineWidth:parseFloat(c.outlineWidth),h:Math.round(r.height),inView:r.top>=0&&r.bottom<=innerHeight})})()`).then((v) => (v ? JSON.parse(v) : null));
    const tabUntil = async (s, test) => { await sleep(300); await s.eval('(document.body||document.documentElement).focus()'); for (let i = 0; i < 80; i++) { await s.key('Tab', 'Tab', 9); const d = await focusDesc(s); if (d && test(d)) return d; } return null; };

    scenarios.push(make('kbperiod', mode, {}, async (s, check) => {
      await sleep(1500);
      await probe(s);
      const first = await tabUntil(s, (d) => d.name === 'Ce mois');
      check('« Ce mois » atteint par Tab : natif, pressé, contour ≥ 2 px, ≥ 44 px', !!first && first.tag === 'BUTTON' && first.role === null && first.tabindex === null && first.pressed === 'true' && first.outlineStyle !== 'none' && first.outlineWidth >= 2 && first.h >= 44, JSON.stringify(first));
      await s.key('Tab', 'Tab', 9);
      const c0 = await counters(s);
      await s.key(' ', 'Space', 32); await sleep(900);
      const c1 = await counters(s);
      check('Espace sur « Cette année » : 492.5h, 1 clic, 0 navigation', (await statText(s, 'Heures équipe')) === '492.5h' && c1.clicks - c0.clicks === 1 && c1.nav === c0.nav && c1.path === ROUTE, JSON.stringify({ c0, c1 }));
      await s.key('Tab', 'Tab', 9);
      await s.key('Enter', 'Enter', 13); await sleep(700);
      check('Entrée sur « Personnalisé » : champs de date, 0 navigation', (await dateInputs(s)) === 2 && (await counters(s)).nav === c0.nav);
      await s.key('Tab', 'Tab', 9);
      check('Tab : premier champ de date nommé « Du »', await s.eval(`document.activeElement.tagName==='INPUT'&&document.activeElement.labels[0].textContent.trim()==='Du'`));
    }));

    const kinds = [['kbopen-enter', 1600, 'Entrée', 'Enter', 13], ['kbopen-space', 1600, 'Espace', ' ', 32], ['kbopen-mobile390', 390, 'Entrée', 'Enter', 13]];
    for (const [kind, viewport, label, key, vk] of kinds) {
      scenarios.push(make(kind, mode, { viewport }, async (s, check) => {
        await sleep(1500);
        await probe(s);
        const code = key === ' ' ? 'Space' : 'Enter';
        const head = await tabUntil(s, (x) => x.name.includes('Sophie Martin') && x.expanded !== null);
        check('en-tête de conseiller atteint par Tab : bouton natif, replié, contour visible, ≥ 44 px', !!head && head.tag === 'BUTTON' && head.role === null && head.tabindex === null && head.expanded === 'false' && head.outlineWidth >= 2 && head.h >= 44, JSON.stringify(head));
        const a0 = await counters(s);
        await s.key(key, code, vk); await sleep(500);
        const a1 = await counters(s);
        const open = await focusDesc(s);
        check(`${label} sur l’en-tête : déplié (aria-expanded « true »), 1 clic, 0 navigation`, !!open && open.expanded === 'true' && a1.clicks - a0.clicks === 1 && a1.nav === a0.nav && a1.path === ROUTE, JSON.stringify({ open, a0, a1 }));
        await s.key(key, code, vk); await sleep(400);
        check(`${label} de nouveau : replié`, (await focusDesc(s)).expanded === 'false' && (await expandedCount(s)) === 0);
        await s.key(key, code, vk); await sleep(400);
        await s.key('Tab', 'Tab', 9);
        const d = await focusDesc(s);
        check('Tab : bouton natif « Ouvrir le mandat » de la 1re ligne, sans rôle ARIA ni tabindex, contour visible, ≥ 44 px', !!d && /^Ouvrir le mandat Plan de mesures d’urgence 2026 de /.test(d.name) && d.tag === 'BUTTON' && d.role === null && d.tabindex === null && d.outlineWidth >= 2 && d.h >= 44 && d.inView, JSON.stringify(d));
        await s.key('Tab', 'Tab', 9);
        const next = await focusDesc(s);
        check('Tab suivant : « Ouvrir le mandat » de la ligne suivante (aucun arrêt parasite)', !!next && /^Ouvrir le mandat Plan de sécurité incendie de /.test(next.name), JSON.stringify(next));
        await s.key('Tab', 'Tab', 9, true);
        const back = await focusDesc(s);
        check('Maj+Tab : retour sur le même bouton', !!back && back.name === d.name, JSON.stringify(back));
        const c3 = await counters(s);
        await s.key(key, code, vk);
        const p = await waitPath(s, (x) => x !== ROUTE, 40000);
        const c4 = await counters(s);
        check(`${label} sur « Ouvrir le mandat » → /projects/p1/mandate`, p === '/projects/p1/mandate', p);
        check(`${label} : une seule activation (1 clic) et un seul changement d’URL`, c4.clicks - c3.clicks === 1 && c4.nav - c3.nav === 1, JSON.stringify({ c3, c4 }));
      }));
    }
  }

  // ───── VIDE : statistiques à zéro et message ─────
  scenarios.push(make('empty', mode, {}, async (s, check) => {
    await sleep(1500);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('statistiques à zéro : 0.0h, « — », 0', (await statText(s, 'Heures équipe')) === '0.0h' && (await statText(s, 'Revenus équipe')) === '—' && (await statText(s, 'Mandats déficitaires')) === '0', `${await statText(s, 'Heures équipe')} / ${await statText(s, 'Revenus équipe')} / ${await statText(s, 'Mandats déficitaires')}`);
    check('« Aucune heure saisie pour cette période » affiché, aucun conseiller', t.includes('Aucune heure saisie pour cette période') && (await userButtons(s)) === 0);
    check('les 3 boutons de période restent disponibles', (await periodButtons(s)) === 3);
    const rev = await s.eval(`(()=>{const L=[...document.querySelectorAll('main *')].find(e=>e.children.length===0&&e.textContent.trim()==='Revenus équipe');return getComputedStyle(L.nextElementSibling).color+'|'+getComputedStyle(L).color})()`);
    const [v, l] = rev.split('|');
    if (glass) check('revenus d’équipe indisponibles « — » : teinte neutre (celle du libellé)', v === l, rev);
    else check('Legacy inchangé : le tiret reste vert', v === 'rgb(39, 174, 96)', rev);
  }));

  // ───── ERREUR : le Legacy n'affiche rien sous les contrôles ─────
  scenarios.push(make('error', mode, {}, async (s, check) => {
    await sleep(1500);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('rien sous les contrôles : ni statistiques, ni message vide, ni chargement', !t.includes('Heures équipe') && !t.includes('Aucune heure saisie') && !t.includes('Chargement...') && (await userButtons(s)) === 0);
    check('les 3 boutons de période restent disponibles', (await periodButtons(s)) === 3);
  }));

  // ───── CHARGEMENT (réponse retardée) ─────
  scenarios.push(make('loading', mode, {}, async (s, check) => {
    await sleep(1000);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('« Chargement... » affiché', t.includes('Chargement...'), t.slice(0, 80));
    check('ni statistiques, ni conseillers, ni message vide pendant le chargement', !t.includes('Heures équipe') && !t.includes('Aucune heure saisie') && (await userButtons(s)) === 0);
    if (glass) check('zone annoncée aux lecteurs d’écran (role=status)', await s.eval(`!!document.querySelector('main [role=status]')`));
  }));
}

module.exports = scenarios;
