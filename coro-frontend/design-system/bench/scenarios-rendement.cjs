/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de /profile/rendement (Phase 08A) : mêmes vérifications en Legacy, en île (bêta non activée) et en Glass.
 * Ils supposent un faux API configuré par variables d'environnement (voir bench/mock-api.cjs) :
 *   données    : BENCH_RENDEMENT=1          (4 mandats ; la période change la réponse)
 *   vide       : (défaut)                   (aucun conseiller renvoyé)
 *   erreur     : BENCH_FAIL_RENDEMENT=1     (/api/rendement → 500 ; le Legacy affiche l'état vide)
 *   chargement : BENCH_DELAY_MS=20000
 * Lancement : node design-system/bench/cli.cjs scenarios --only rendement-data-legacy,...
 * Les valeurs attendues viennent du code Legacy et du jeu de données du faux API, pas de la vue Glass.
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

/** Texte (ligne suivante) qui suit un libellé de statistique dans <main>. */
const statText = (s, label) => s.eval(`(()=>{const L=document.querySelector('main').innerText.split(${NL}).map(x=>x.trim()).filter(Boolean);const i=L.indexOf(${JSON.stringify(label)});return i<0?null:L[i+1]})()`);
const visibleRows = (s) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length`);
const visibleCards = (s) => s.eval(`(()=>{const c=[...document.querySelectorAll('main [class~="md:hidden"]')].find(e=>e.getClientRects().length>0&&e.children.length>0);return c?c.children.length:0})()`);
const cell = (s, row, col) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[${row}].children[${col}].innerText.trim()`);
const clickPeriod = (s, label) => s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true})()`);
const dateInputs = (s) => s.eval(`document.querySelectorAll('main input[type=date]').length`);
const setDate = (s, index, value) => s.eval(`(()=>{const c=document.querySelectorAll('main input[type=date]')[${index}];if(!c)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(c,${JSON.stringify(value)});c.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const periodButtons = (s) => s.eval(`[...document.querySelectorAll('main button')].filter(b=>['Ce mois','Cette année','Personnalisé'].includes(b.innerText.trim())).length`);

function make(kind, mode, opts, run) {
  const [modeName, base] = mode;
  return { name: `rendement-${kind}-${modeName}`, description: `/profile/rendement — ${kind} (${modeName})`, route: '/profile/rendement', viewport: opts.viewport || 1600, ...base, ...(opts.extra || {}), run };
}

const scenarios = [];
for (const mode of MODES) {
  const glass = mode[0].startsWith('glass');

  // ───── DONNÉES : statistiques, tableau, changement de période, ouverture d'un mandat ─────
  scenarios.push(make('data', mode, {}, async (s, check) => {
    await sleep(1500);
    const stats = { h: await statText(s, 'Heures saisies'), r: await statText(s, 'Revenus générés'), m: await statText(s, 'Mandats actifs') };
    check('statistiques : 42.5h, 7800 $, 4 mandats', stats.h === '42.5h' && stats.r === '7800 $' && stats.m === '4', JSON.stringify(stats));
    check('4 lignes dans le tableau, titre « Détail par mandat »', (await visibleRows(s)) === 4 && (await s.eval(`document.querySelector('main').innerText.includes('Détail par mandat')`)), String(await visibleRows(s)));
    check('3 boutons de période', (await periodButtons(s)) === 3, String(await periodButtons(s)));
    check('marge positive « 2350 $ (56%) », montant vendu zéro → « — », marge négative « -500 $ (-50%) »',
      (await cell(s, 0, 5)) === '2350 $ (56%)' && (await cell(s, 2, 3)) === '—' && (await cell(s, 2, 5)) === '—' && (await cell(s, 3, 5)) === '-500 $ (-50%)', JSON.stringify([await cell(s, 0, 5), await cell(s, 2, 3), await cell(s, 2, 5), await cell(s, 3, 5)]));
    const color = (row, col) => s.eval(`getComputedStyle([...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[${row}].children[${col}]).color`);
    const [cPos, cDash, cNeg, cClient] = [await color(0, 5), await color(2, 5), await color(3, 5), await color(2, 0)];
    if (glass) check('marge indisponible « — » : teinte neutre (celle du texte secondaire), distincte des marges positive et négative', cDash === cClient && cDash !== cPos && cDash !== cNeg && cPos !== cNeg, JSON.stringify({ cPos, cDash, cNeg, cClient }));
    else check('Legacy inchangé : le tiret garde la couleur de la marge négative (rouge du Legacy)', cDash === cNeg && cDash !== cPos, JSON.stringify({ cPos, cDash, cNeg }));
    check('heures du tableau formatées à une décimale (18.5h) et coût réel arrondi (1850 $)', (await cell(s, 0, 2)) === '18.5h' && (await cell(s, 0, 4)) === '1850 $', `${await cell(s, 0, 2)} / ${await cell(s, 0, 4)}`);
    check('libellé de mandat très long : aucun débordement horizontal de la page', await s.eval(`document.documentElement.scrollWidth<=innerWidth`));
    if (glass) check('« Ce mois » est pressé (aria-pressed), les autres non', await s.eval(`(()=>{const b=[...document.querySelectorAll('main button[aria-pressed]')];return b.length===3&&b.filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.innerText.trim()).join()==='Ce mois'})()`));
    // Cette année
    await clickPeriod(s, 'Cette année'); await sleep(900);
    check('« Cette année » → 480.0h', (await statText(s, 'Heures saisies')) === '480.0h', String(await statText(s, 'Heures saisies')));
    if (glass) check('« Cette année » est maintenant pressé', await s.eval(`[...document.querySelectorAll('main button[aria-pressed="true"]')].map(x=>x.innerText.trim()).join()==='Cette année'`));
    // Personnalisé
    check('aucun champ de date hors période personnalisée', (await dateInputs(s)) === 0);
    await clickPeriod(s, 'Personnalisé'); await sleep(700);
    check('« Personnalisé » → 2 champs de date (Du, Au)', (await dateInputs(s)) === 2, String(await dateInputs(s)));
    await setDate(s, 0, '2026-01-01'); await sleep(200); await setDate(s, 1, '2026-01-10'); await sleep(1000);
    const custom = { h: await statText(s, 'Heures saisies'), r: await statText(s, 'Revenus générés'), rows: await visibleRows(s) };
    check('période de 10 jours → 12.0h, revenus « — », 1 ligne', custom.h === '12.0h' && custom.r === '—' && custom.rows === 1, JSON.stringify(custom));
    if (glass) check('champs de date étiquetés « Du » et « Au »', await s.eval(`[...document.querySelectorAll('main input[type=date]')].map(i=>i.labels&&i.labels[0]?i.labels[0].textContent.trim():'').join()==='Du,Au'`));
    // Retour au mois
    await clickPeriod(s, 'Ce mois'); await sleep(900);
    check('« Ce mois » → 42.5h et plus de champs de date', (await statText(s, 'Heures saisies')) === '42.5h' && (await dateInputs(s)) === 0);
    // Ouverture d'un mandat
    await s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0)[1].children[0].click()`);
    const p = await waitPath(s, (x) => x !== '/profile/rendement', 40000);
    check('clic sur une ligne → /projects/p2/mandate', p === '/projects/p2/mandate', p);
  }));

  // ───── MOBILE (390, 320) : cartes, pas de défilement horizontal ─────
  for (const width of [390, 320]) {
    scenarios.push(make(`mobile${width}`, mode, { viewport: width }, async (s, check) => {
      await sleep(1500);
      check('4 cartes visibles (le tableau est masqué)', (await visibleCards(s)) === 4 && (await visibleRows(s)) === 0, `${await visibleCards(s)} cartes / ${await visibleRows(s)} lignes`);
      const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,periods:[...document.querySelectorAll('main button')].filter(b=>['Ce mois','Cette année','Personnalisé'].includes(b.innerText.trim())).map(b=>Math.round(b.getBoundingClientRect().height))})`));
      check('aucun défilement horizontal de la page', m.docW <= m.vw, JSON.stringify(m));
      if (glass) check('cibles tactiles des boutons de période ≥ 44 px (Glass)', m.periods.length === 3 && m.periods.every((v) => v >= 44), JSON.stringify(m.periods));
      const txt = await s.eval(`document.querySelector('main').innerText`);
      check('cartes : libellés Heures, Montant vendu, Coût réel, Marge et « Voir le mandat »', /heures/i.test(txt) && /montant vendu/i.test(txt) && /coût réel/i.test(txt) && /marge/i.test(txt) && txt.includes('Voir le mandat'));
      if (glass) {
        // Carte 3 : montant vendu à zéro → marge « — » neutre ; carte 4 : marge négative colorée.
        const mc = JSON.parse(await s.eval(`(()=>{const c=[...document.querySelectorAll('main [class~="md:hidden"]')].find(e=>e.getClientRects().length>0&&e.children.length>0);const dd=(i)=>[...c.children[i].querySelectorAll('dd')].pop();const col=(e)=>getComputedStyle(e).color;return JSON.stringify({dash:dd(2).innerText.trim(),dashColor:col(dd(2)),clientColor:col(c.children[2].querySelector('p')),negColor:col(dd(3)),posColor:col(dd(0))})})()`));
        check('cartes : marge « — » neutre (couleur du texte secondaire), distincte des marges positive et négative', mc.dash === '—' && mc.dashColor === mc.clientColor && mc.dashColor !== mc.negColor && mc.dashColor !== mc.posColor, JSON.stringify(mc));
      }
      await s.eval(`(()=>{const c=[...document.querySelectorAll('main [class~="md:hidden"]')].find(e=>e.getClientRects().length>0&&e.children.length>0);c.children[1].querySelector('p').click()})()`);
      const p = await waitPath(s, (x) => x !== '/profile/rendement', 40000);
      check('clic sur une carte → /projects/p2/mandate', p === '/projects/p2/mandate', p);
    }));
  }

  // ───── TABLETTE 768 : tableau avec défilement interne, jamais de défilement de page ─────
  scenarios.push(make('tablet768', mode, { viewport: 768 }, async (s, check) => {
    await sleep(1500);
    const m = JSON.parse(await s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,rows:[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length,tableW:Math.round(document.querySelector('main table').getBoundingClientRect().width)})`));
    check('tableau visible (4 lignes), largeur mini 820 px', m.rows === 4 && m.tableW >= 819, JSON.stringify(m));
    check('aucun défilement horizontal de la page (le tableau défile dans son conteneur)', m.docW <= m.vw, JSON.stringify(m));
  }));

  // ───── CLAVIER : ordre de tabulation dans <main> ─────
  scenarios.push(make('keyboard', mode, {}, async (s, check) => {
    await sleep(1500);
    await s.eval('document.body.focus()');
    const order = [];
    for (let i = 0; i < 80 && order.length < 5; i++) {
      await s.key('Tab', 'Tab', 9);
      const d = await s.eval(`(()=>{const a=document.activeElement;if(!a||!document.querySelector('main').contains(a))return null;return a.tagName+':'+(a.getAttribute('aria-label')||a.innerText||'').trim().slice(0,60)})()`);
      if (d) order.push(d);
      else if (order.length) break; // sorti de <main>
    }
    check('Tab : les trois boutons de période en premier', order.slice(0, 3).join('|') === 'BUTTON:Ce mois|BUTTON:Cette année|BUTTON:Personnalisé', JSON.stringify(order));
    if (glass) check('Tab : puis le bouton « Ouvrir le mandat » de la 1re ligne', (order[3] || '').startsWith('BUTTON:Ouvrir le mandat Plan de mesures d’urgence 2026 de'), JSON.stringify(order));
    else check('Legacy : aucun arrêt sur les lignes (comportement historique conservé)', order.length === 3, JSON.stringify(order));
  }));

  // ───── CLAVIER GLASS : période et ouverture d'un mandat, une seule action par touche ─────
  if (glass) {
    const probe = (s) => s.eval(`(()=>{const w=(k)=>{const c=JSON.parse(sessionStorage.getItem('__bench')||'{}');c[k]=(c[k]||0)+1;sessionStorage.setItem('__bench',JSON.stringify(c))};sessionStorage.setItem('__bench','{}');if(window.navigation)window.navigation.addEventListener('navigate',()=>w('nav'));window.addEventListener('click',()=>w('clicks'),true)})()`);
    // Compteurs en sessionStorage : ils survivent à un éventuel rechargement complet lors de la navigation vers le mandat.
    const counters = async (s) => { const c = JSON.parse(await s.eval("sessionStorage.getItem('__bench')||'{}'")); return { nav: c.nav || 0, clicks: c.clicks || 0, path: await s.eval('location.pathname') }; };
    const focusDesc = (s) => s.eval(`(()=>{const a=document.activeElement;if(!a)return null;const c=getComputedStyle(a);const r=a.getBoundingClientRect();return JSON.stringify({tag:a.tagName,name:a.getAttribute('aria-label')||a.innerText.trim(),role:a.getAttribute('role'),tabindex:a.getAttribute('tabindex'),pressed:a.getAttribute('aria-pressed'),outlineStyle:c.outlineStyle,outlineWidth:parseFloat(c.outlineWidth),h:Math.round(r.height),inView:r.top>=0&&r.bottom<=innerHeight})})()`).then((v) => (v ? JSON.parse(v) : null));
    const tabUntil = async (s, test) => { await sleep(300); await s.eval('(document.body||document.documentElement).focus()'); for (let i = 0; i < 80; i++) { await s.key('Tab', 'Tab', 9); const d = await focusDesc(s); if (d && test(d)) return d; } return null; };

    scenarios.push(make('kbperiod', mode, {}, async (s, check) => {
      await sleep(1500);
      await probe(s);
      const first = await tabUntil(s, (d) => d.name === 'Ce mois');
      check('bouton « Ce mois » atteint par Tab, natif, pressé, contour visible ≥ 2 px et ≥ 44 px', !!first && first.tag === 'BUTTON' && first.role === null && first.tabindex === null && first.pressed === 'true' && first.outlineStyle !== 'none' && first.outlineWidth >= 2 && first.h >= 44, JSON.stringify(first));
      await s.key('Tab', 'Tab', 9);
      const year = await focusDesc(s);
      const c0 = await counters(s);
      await s.key(' ', 'Space', 32); await sleep(900);
      const c1 = await counters(s);
      check('Espace sur « Cette année » : 480.0h, bouton pressé, 1 clic, 0 navigation', (await statText(s, 'Heures saisies')) === '480.0h' && (await focusDesc(s)).pressed === 'true' && c1.clicks - c0.clicks === 1 && c1.nav === c0.nav && c1.path === '/profile/rendement', JSON.stringify({ year, c0, c1 }));
      await s.key('Tab', 'Tab', 9);
      await s.key('Enter', 'Enter', 13); await sleep(700);
      check('Entrée sur « Personnalisé » : champs de date apparus, 0 navigation', (await dateInputs(s)) === 2 && (await counters(s)).nav === c0.nav);
      await s.key('Tab', 'Tab', 9);
      const du = await focusDesc(s);
      check('Tab : premier champ de date, nommé « Du »', !!du && du.tag === 'INPUT' && du.name === '' ? await s.eval(`document.activeElement.labels[0].textContent.trim()==='Du'`) : false, JSON.stringify(du));
    }));

    const kinds = [['kbopen-enter', 1600, 'Entrée', 'Enter', 13], ['kbopen-space', 1600, 'Espace', ' ', 32], ['kbopen-mobile390', 390, 'Entrée', 'Enter', 13]];
    for (const [kind, viewport, label, key, vk] of kinds) {
      scenarios.push(make(kind, mode, { viewport }, async (s, check) => {
        await sleep(1500);
        await probe(s);
        const d = await tabUntil(s, (x) => /^Ouvrir le mandat /.test(x.name));
        check('bouton natif « Ouvrir le mandat » atteint par Tab, sans rôle ARIA ni tabindex artificiel', !!d && d.tag === 'BUTTON' && d.role === null && d.tabindex === null, JSON.stringify(d));
        check('focus visible (contour ≥ 2 px) et cible ≥ 44 px, dans la fenêtre', !!d && d.outlineStyle !== 'none' && d.outlineWidth >= 2 && d.h >= 44 && d.inView, JSON.stringify(d));
        await s.key('Tab', 'Tab', 9);
        const next = await focusDesc(s);
        check('Tab suivant : « Ouvrir le mandat » de la ligne suivante (aucun arrêt parasite)', !!next && /^Ouvrir le mandat Plan de sécurité incendie de Organisation Démo B$/.test(next.name), JSON.stringify(next));
        await s.key('Tab', 'Tab', 9, true);
        const back = await focusDesc(s);
        check('Maj+Tab : retour sur le même bouton', !!back && back.name === d.name, JSON.stringify(back));
        const c3 = await counters(s);
        await s.key(key, key === ' ' ? 'Space' : 'Enter', vk);
        const p = await waitPath(s, (x) => x !== '/profile/rendement', 40000);
        const c4 = await counters(s);
        check(`${label} sur « Ouvrir le mandat » → /projects/p1/mandate`, p === '/projects/p1/mandate', p);
        check(`${label} : une seule activation (1 clic) et un seul changement d’URL`, c4.clicks - c3.clicks === 1 && c4.nav - c3.nav === 1, JSON.stringify({ c3, c4 }));
      }));
    }
  }

  // ───── VIDE / ERREUR : même rendu (une erreur de chargement donne l'état vide en Legacy) ─────
  for (const kind of ['empty', 'error']) {
    scenarios.push(make(kind, mode, {}, async (s, check) => {
      await sleep(1500);
      const t = await s.eval(`document.querySelector('main').innerText`);
      check('« Aucune heure saisie pour cette période » affiché', t.includes('Aucune heure saisie pour cette période'));
      check('ni statistiques, ni tableau, ni cartes', !t.includes('Heures saisies') && (await visibleRows(s)) === 0 && !t.includes('Détail par mandat'));
      check('les 3 boutons de période restent disponibles', (await periodButtons(s)) === 3);
    }));
  }

  // ───── CHARGEMENT (réponse retardée) ─────
  scenarios.push(make('loading', mode, {}, async (s, check) => {
    await sleep(1000);
    const t = await s.eval(`document.querySelector('main').innerText`);
    check('« Chargement... » affiché', t.includes('Chargement...'), t.slice(0, 80));
    check('ni statistiques, ni tableau, ni message vide pendant le chargement', !t.includes('Heures saisies') && !t.includes('Aucune heure saisie') && (await visibleRows(s)) === 0);
    if (glass) check('zone annoncée aux lecteurs d’écran (role=status)', await s.eval(`!!document.querySelector('main [role=status]')`));
  }));
}

module.exports = scenarios;
