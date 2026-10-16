/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de /profile/rendement (rendement opérationnel) et /dashboard/rendement (rendement financier gouverné) — Phase 11D.
 *
 * Ces deux routes sont LEGACY-ONLY (aucune vue Glass) depuis la refonte de main (modèle `operational` / `financial`). Les scénarios les
 * CARACTÉRISENT dans les quatre modes du banc : le contenu de <main> doit toujours être le Legacy de main (aucune carte `.cg-glass`, aucune
 * primitive `.cgx-*`), même avec la préférence Glass, la bêta activée ou un build à jeton. Ils vérifient aussi qu'aucun élément de l'ancien
 * modèle (conseillers, statistiques d'équipe, boutons de période, colonnes Budget / Montant vendu par conseiller) ne réapparaît.
 *
 * Faux API (voir bench/mock-api.cjs) :
 *   données    : BENCH_RENDEMENT=1       (opérationnel : 3 conseillers ; financier : 6 mandats, 2 devises)
 *   vide       : (défaut)
 *   erreur     : BENCH_FAIL_RENDEMENT=1  (500 sur les trois chemins)
 *   chargement : BENCH_DELAY_MS=20000
 * Lancement : node design-system/bench/cli.cjs scenarios --only rendement-op-data-legacy,rendement-fin-data-island,...
 * Les valeurs attendues viennent du code de main et du jeu de données du faux API ; le faux API ne valide AUCUN calcul du backend.
 */
const { sleep } = require('./cdp.cjs');

const NL = 'String.fromCharCode(10)';
const MODES = [
  ['legacy', { ui: 'legacy', theme: 'SYSTEM' }],
  ['island', { ui: 'glass', theme: 'DARK' }],
  ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true }],
  ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true }],
];
const OP = '/profile/rendement';
const FIN = '/dashboard/rendement';
/** Vocabulaire de l'ancien modèle (période en trois boutons, équipe, budget) : ne doit réapparaître sur aucune des deux pages. */
const OLD_MODEL = ['Heures équipe', 'Revenus équipe', 'Détail par mandat', 'Cette année', 'Personnalisé', 'Ce mois', 'Revenus générés', 'Mandats actifs', 'Budget'];

const waitPath = async (s, predicate, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await s.eval('location.pathname'); if (predicate(p)) return p; await sleep(400); } return s.eval('location.pathname'); };
const mainText = (s) => s.eval(`document.querySelector('main')?document.querySelector('main').innerText:''`);
/** Ligne qui suit un libellé dans <main> (cartes de statistiques : libellé puis valeur). */
const statText = (s, label) => s.eval(`(()=>{const L=document.querySelector('main').innerText.split(${NL}).map(x=>x.trim()).filter(Boolean);const i=L.indexOf(${JSON.stringify(label)});return i<0?null:L[i+1]})()`);
const renderer = (s) => s.eval(`(()=>{const m=document.querySelector('main');if(!m)return 'aucun-main';return m.querySelector('.cg-glass,[class*="cgx-"]')?'glass':'legacy'})()`);
const overflow = (s) => s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth})`).then(JSON.parse);
const tableRows = (s) => s.eval(`[...document.querySelectorAll('main table tbody tr')].filter(r=>r.getClientRects().length>0).length`);
const setDate = (s, index, value) => s.eval(`(()=>{const c=document.querySelectorAll('main input[type=date]')[${index}];if(!c)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(c,${JSON.stringify(value)});c.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const normalized = (t) => String(t).replace(/[  ]/g, ' ');

function make(prefix, route, kind, mode, opts, run) {
  const [modeName, base] = mode;
  return { name: `${prefix}-${kind}-${modeName}`, description: `${route} — ${kind} (${modeName})`, route, viewport: opts.viewport || 1600, ...base, ...(opts.extra || {}), run };
}
/** Vérifications communes : rendu Legacy dans tous les modes, aucun vestige de l'ancien modèle. */
async function commonChecks(s, check, { expectNoOldModel = true } = {}) {
  check('contenu de <main> = Legacy de main (aucune carte .cg-glass ni primitive .cgx-*), quel que soit le mode', (await renderer(s)) === 'legacy', String(await renderer(s)));
  if (expectNoOldModel) { const t = await mainText(s); const found = OLD_MODEL.filter((w) => t.includes(w)); check('aucun vestige de l’ancien modèle (équipe, période en boutons, budget, revenus)', found.length === 0, found.join(', ')); }
}

const scenarios = [];
for (const mode of MODES) {
  // ═════════ /profile/rendement — rendement opérationnel (aucune donnée financière) ═════════
  const op = (kind, opts, run) => scenarios.push(make('rendement-op', OP, kind, mode, opts, run));
  op('data', {}, async (s, check) => {
    await sleep(2500);
    await commonChecks(s, check);
    const t = await mainText(s);
    check('titre « Mon rendement opérationnel » et mention « Aucune donnée financière n’est affichée »', (await s.eval(`document.querySelector('main h1').textContent.trim()`)) === 'Mon rendement opérationnel' && t.includes('Aucune donnée financière n’est affichée'));
    check('statistiques : 42.5 h, 3 activités, 4 mandats avec participation', (await statText(s, 'Heures saisies')) === '42.5 h' && (await statText(s, 'Activités')) === '3' && (await statText(s, 'Mandats avec participation')) === '4', JSON.stringify([await statText(s, 'Heures saisies'), await statText(s, 'Activités'), await statText(s, 'Mandats avec participation')]));
    check('aucune donnée financière affichée (ni montant, ni marge, ni coût, ni devise)', !/Montant|Marge|Coût|Revenu|\$|CAD|USD/.test(t), t.match(/Montant|Marge|Coût|Revenu|\$|CAD|USD/)?.[0] || '');
    check('4 participations (boutons natifs), la 1re est « Plan de mesures d’urgence 2026 »', await s.eval(`(()=>{const b=[...document.querySelectorAll('main ul button')];return b.length===4&&b[0].innerText.includes('Plan de mesures d’urgence 2026')})()`));
    check('2 champs de date étiquetés « Du » et « Au »', await s.eval(`[...document.querySelectorAll('main input[type=date]')].map(i=>i.closest('label')&&i.closest('label').innerText.split(String.fromCharCode(10))[0].trim()).join()==='Du,Au'`));
    await setDate(s, 0, '2026-01-01'); await sleep(200); await setDate(s, 1, '2026-01-10'); await sleep(1200);
    check('période de 10 jours → 12.0 h, 1 activité, 1 participation (le changement de période recharge /rendement/operational)', (await statText(s, 'Heures saisies')) === '12.0 h' && (await statText(s, 'Activités')) === '1' && (await statText(s, 'Mandats avec participation')) === '1', JSON.stringify([await statText(s, 'Heures saisies'), await statText(s, 'Activités'), await statText(s, 'Mandats avec participation')]));
    await s.eval(`document.querySelector('main ul button').click()`);
    const p = await waitPath(s, (x) => x !== OP, 40000);
    check('clic sur une participation → /projects/p1/mandate', p === '/projects/p1/mandate', p);
  });
  for (const width of [390, 320]) op(`mobile${width}`, { viewport: width }, async (s, check) => {
    await sleep(2500);
    await commonChecks(s, check);
    const o = await overflow(s);
    check('aucun défilement horizontal de la page', o.docW <= o.vw, JSON.stringify(o));
    check('les 4 participations restent atteignables', await s.eval(`document.querySelectorAll('main ul button').length===4`));
  });
  op('tablet768', { viewport: 768 }, async (s, check) => { await sleep(2500); await commonChecks(s, check); const o = await overflow(s); check('aucun défilement horizontal de la page', o.docW <= o.vw, JSON.stringify(o)); });
  op('keyboard', {}, async (s, check) => {
    await sleep(2500);
    await s.eval('(document.body||document.documentElement).focus()');
    const order = [];
    // Un champ de date natif compte plusieurs arrêts Tab (jour, mois, année) : on collapse les arrêts consécutifs sur le MÊME élément.
    for (let i = 0; i < 120 && order.length < 6; i++) {
      await s.key('Tab', 'Tab', 9);
      const d = await s.eval(`(()=>{const a=document.activeElement;if(!a||!document.querySelector('main').contains(a))return null;const lab=a.closest('label');return a.tagName+(a.type?'['+a.type+']':'')+':'+(a.innerText||a.getAttribute('aria-label')||(lab?lab.innerText.split(String.fromCharCode(10))[0]:'')).trim().replace(/\\s+/g,' ').slice(0,36)})()`);
      if (d) { if (d !== order[order.length - 1]) order.push(d); } else if (order.length) break;
    }
    check('Tab : champ « Du », champ « Au », puis les 4 participations dans l’ordre', order.length === 6 && order[0] === 'INPUT[date]:Du' && order[1] === 'INPUT[date]:Au' && /^BUTTON.*:Plan de mesures d’urgence 2026/.test(order[2]) && order.slice(2).every((x) => x.startsWith('BUTTON')), JSON.stringify(order));
    for (let i = 0; i < 3; i++) await s.key('Tab', 'Tab', 9, true); // retour sur la 1re participation
    await s.key('Enter', 'Enter', 13);
    const p = await waitPath(s, (x) => x !== OP, 40000);
    check('Entrée sur la 1re participation → /projects/p1/mandate', p === '/projects/p1/mandate', p);
  });
  op('empty', {}, async (s, check) => {
    await sleep(2500); await commonChecks(s, check);
    const t = await mainText(s);
    check('« Aucune heure saisie pour cette période. » affiché, aucune statistique', t.includes('Aucune heure saisie pour cette période.') && !t.includes('Heures saisies'));
  });
  op('error', {}, async (s, check) => {
    await sleep(2500); await commonChecks(s, check);
    check('message d’erreur annoncé (role=alert) : « Votre rendement opérationnel ne peut pas être chargé. »', await s.eval(`(()=>{const a=document.querySelector('main [role=alert]');return !!a&&a.textContent.trim()==='Votre rendement opérationnel ne peut pas être chargé.'})()`));
    const t = await mainText(s); check('ni statistiques ni message « Aucune heure saisie » en cas d’erreur', !t.includes('Heures saisies') && !t.includes('Aucune heure saisie'));
  });
  op('loading', {}, async (s, check) => {
    await sleep(1200); await commonChecks(s, check, { expectNoOldModel: false });
    check('« Chargement du rendement… » annoncé (role=status)', await s.eval(`(()=>{const a=document.querySelector('main [role=status]');return !!a&&a.textContent.includes('Chargement du rendement')})()`));
  });

  // ═════════ /dashboard/rendement — rendement financier gouverné (ADMIN / SUPER_ADMIN) ═════════
  const fin = (kind, opts, run) => scenarios.push(make('rendement-fin', FIN, kind, mode, opts, run));
  fin('data', {}, async (s, check) => {
    await sleep(3000);
    await commonChecks(s, check);
    const t = normalized(await mainText(s));
    check('titre « Rendement et rentabilité » et mention de la vue cumulative gouvernée', (await s.eval(`document.querySelector('main h1').textContent.trim()`)) === 'Rendement et rentabilité' && t.includes('Vue cumulative gouvernée'));
    check('totaux par devise : CAD (vendu 8 300,00 ; coût connu 6 250,00) et USD (3 000,00)', /CAD/.test(t) && /USD/.test(t) && /8 300,00/.test(t) && /6 250,00/.test(t) && /3 000,00/.test(t), '');
    check('synthèse : 1 mandat déficitaire unique, 2 mandats incomplets', (await statText(s, 'Mandats déficitaires uniques')) === '1' && (await statText(s, 'Mandats incomplets')) === '2', JSON.stringify([await statText(s, 'Mandats déficitaires uniques'), await statText(s, 'Mandats incomplets')]));
    check('tableau : 6 mandats, 5 colonnes (Client / mandat, Vendu, Coût connu, Marge, Complétude)', (await tableRows(s)) === 6 && (await s.eval(`[...document.querySelectorAll('main table thead th')].map(h=>h.textContent.trim()).join('|')`)) === 'Client / mandat|Vendu|Coût connu|Marge|Complétude');
    check('valeurs indisponibles : « Non disponible » (vendu et marge du mandat sans montant validé, marge des mandats incomplets)', (t.match(/Non disponible/g) || []).length >= 3, String((t.match(/Non disponible/g) || []).length));
    check('complétude : 4 « Complet » et 2 « Incomplet », raisons visibles', (t.match(/Complet\b/g) || []).length >= 4 && (t.match(/Incomplet/g) || []).length === 2 && /MISSING_SOLD_AMOUNT/.test(t) && /MISSING_ADVISOR_COST_RATE/.test(t), '');
    check('marges en pourcentage : « 55.95 % » et perte « -50.00 % »', /55\.95 %/.test(t) && /-50\.00 %/.test(t));
    await s.eval(`document.querySelector('main table tbody button').click()`);
    const p = await waitPath(s, (x) => x !== FIN, 40000);
    check('clic sur le premier mandat → /projects/p1/mandate', p === '/projects/p1/mandate', p);
  });
  for (const width of [390, 320]) fin(`mobile${width}`, { viewport: width }, async (s, check) => {
    await sleep(3000); await commonChecks(s, check);
    const o = await overflow(s); check('aucun défilement horizontal de la page (le tableau défile dans son conteneur)', o.docW <= o.vw, JSON.stringify(o));
    check('le tableau de 6 mandats reste présent', (await tableRows(s)) === 6);
  });
  fin('tablet768', { viewport: 768 }, async (s, check) => { await sleep(3000); await commonChecks(s, check); const o = await overflow(s); check('aucun défilement horizontal de la page', o.docW <= o.vw, JSON.stringify(o)); });
  fin('keyboard', {}, async (s, check) => {
    await sleep(3000);
    await s.eval('(document.body||document.documentElement).focus()');
    const order = [];
    for (let i = 0; i < 80 && order.length < 3; i++) {
      await s.key('Tab', 'Tab', 9);
      const d = await s.eval(`(()=>{const a=document.activeElement;if(!a||!document.querySelector('main').contains(a))return null;return a.tagName+':'+(a.innerText||'').trim().replace(/\\s+/g,' ').slice(0,40)})()`);
      if (d) order.push(d); else if (order.length) break;
    }
    check('Tab : un bouton natif par mandat, dans l’ordre du tableau (1er : Organisation Démo A / Plan de mesures)', order.length === 3 && order.every((o) => o.startsWith('BUTTON:')) && order[0].includes('Organisation Démo A'), JSON.stringify(order));
    await s.key('Tab', 'Tab', 9, true); await s.key('Tab', 'Tab', 9, true);
    await s.key('Enter', 'Enter', 13);
    const p = await waitPath(s, (x) => x !== FIN, 40000);
    check('Entrée sur le 1er mandat → /projects/p1/mandate', p === '/projects/p1/mandate', p);
  });
  fin('empty', {}, async (s, check) => {
    await sleep(3000); await commonChecks(s, check);
    const t = await mainText(s);
    check('« Aucun mandat financier dans ce périmètre. » affiché, aucun tableau', t.includes('Aucun mandat financier dans ce périmètre.') && (await tableRows(s)) === 0);
  });
  fin('error', {}, async (s, check) => {
    await sleep(3000); await commonChecks(s, check);
    check('message d’erreur annoncé (role=alert) : « Les indicateurs financiers ne peuvent pas être chargés. »', await s.eval(`(()=>{const a=document.querySelector('main [role=alert]');return !!a&&a.textContent.trim()==='Les indicateurs financiers ne peuvent pas être chargés.'})()`));
    check('aucun indicateur financier affiché en cas d’erreur', (await tableRows(s)) === 0 && !(await mainText(s)).includes('Synthèse financière'));
  });
  fin('loading', {}, async (s, check) => {
    await sleep(1500); await commonChecks(s, check, { expectNoOldModel: false });
    check('« Chargement des indicateurs… » annoncé (role=status)', await s.eval(`(()=>{const a=document.querySelector('main [role=status]');return !!a&&a.textContent.includes('Chargement des indicateurs')})()`));
  });
  // Garde de rôle : un CONSEILLER qui ouvre l'URL est redirigé vers /profile/rendement, sans jamais voir d'indicateur financier.
  // Le rôle est SEMÉ dans la session du banc (jeton « bench-token:role:CONSEILLER ») ; le faux API le respecte dans /users/me, comme le backend de main.
  fin('role-conseiller', { extra: { role: 'CONSEILLER', redirectTo: OP } }, async (s, check) => {
    await sleep(4000);
    const path = await s.eval('location.pathname');
    check('un CONSEILLER est redirigé de /dashboard/rendement vers /profile/rendement', path === OP, path);
    const t = await mainText(s);
    check('aucun indicateur financier visible (ni synthèse, ni totaux, ni tableau)', !/Synthèse financière|Mandats incomplets|Vendu|Coût connu/.test(t) && (await tableRows(s)) === 0);
    check('la page affichée est le rendement opérationnel (« Mon rendement opérationnel »)', t.includes('Mon rendement opérationnel') || (await s.eval(`document.querySelector('main h1')?document.querySelector('main h1').textContent.trim():''`)) === 'Mon rendement opérationnel');
  });
}

// ───────── Défaut connu de main (à signaler, non corrigé ici) : mandat sans devise de vente → groupe « UNKNOWN » → plantage de la page ─────────
// Lancement : BENCH_FINANCIAL_UNKNOWN_CURRENCY=1 BENCH_RENDEMENT=1 (faux API) puis cli scenarios --only known-defect-rendement-fin-unknown-currency-legacy
// Le scénario vérifie le comportement CORRECT (l'écran s'affiche et montre le groupe « UNKNOWN ») : il échoue tant que main n'est pas corrigé.
// Il n'appartient volontairement à aucun plan de campagne (préfixe « known-defect- ») : il ne bloque pas la validation de l'intégration.
scenarios.push({
  name: 'known-defect-rendement-fin-unknown-currency-legacy', description: '/dashboard/rendement — mandat sans devise de vente (défaut connu de main)', route: FIN, viewport: 1600, ui: 'legacy', theme: 'SYSTEM',
  run: async (s, check) => {
    await sleep(3500);
    const hasMain = await s.eval(`!!document.querySelector('main')`);
    check('l’écran financier s’affiche malgré un mandat sans devise de vente (présence de <main>)', hasMain, hasMain ? '' : 'page plantée : ' + (s.consoleErrors[0] || 'aucune exception capturée').split('\n')[0].slice(0, 160));
    if (hasMain) { const t = await mainText(s); check('le groupe de devise « UNKNOWN » est affiché sans exception', /UNKNOWN/.test(t) && s.consoleErrors.length === 0, s.consoleErrors.length + ' exception(s)'); }
  },
});

module.exports = scenarios;
