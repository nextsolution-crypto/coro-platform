/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios de /settings (Phase 06A) : même parcours en Legacy, en île Legacy (bêta non activée) et en Glass (bêta activée).
 * Les libellés et destinations attendus viennent du code Legacy d'origine (app/settings/page.tsx) : ils ne sont pas dérivés
 * de la vue Glass, pour qu'une vue qui dériverait les détecte.
 */
const { sleep } = require('./cdp.cjs');

const ADMIN_LABELS = ['Mon profil', 'Organisation', 'Modèle Module 1', 'Membres de l’équipe', 'Types d’activités', 'Catégories de timelog', 'Modèles de tâches', 'Nous écrire'];
const CONSEILLER_LABELS = ['Mon profil', 'Catégories de timelog', 'Modèles de tâches', 'Nous écrire'];
const SECTIONS_ADMIN = ['Mon compte', 'Organisation', 'Outils'];
const SECTIONS_CONSEILLER = ['Mon compte', 'Outils'];
// Destination finale attendue après clic. « Mon profil » mène à /settings/profile, qui redirige vers /profile (comportement existant).
const FINAL_PATH = {
  'Mon profil': '/profile',
  'Organisation': '/settings/organization',
  'Modèle Module 1': '/settings/module1-template',
  'Membres de l’équipe': '/settings/users',
  'Types d’activités': '/settings/activity-types',
  'Catégories de timelog': '/settings/timelog-categories',
  'Modèles de tâches': '/settings/task-templates',
  'Nous écrire': '/settings/feedback',
};

const labels = (s) => s.eval(`JSON.stringify([...document.querySelectorAll('main button')].map(b=>b.innerText.split('\\n')[0].trim()))`).then(JSON.parse);
const sections = (s) => s.eval(`JSON.stringify([...document.querySelectorAll('main h2, main p')].filter(e=>/uppercase/.test(e.className)).map(e=>e.textContent.trim()))`).then(JSON.parse);
const state = (s) => s.eval(`JSON.stringify({ui:document.documentElement.dataset.ui,theme:document.documentElement.dataset.theme,islands:document.querySelectorAll('.cg-legacy-island').length,glassHeader:document.querySelectorAll('.cgx-page-header').length,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),cg:document.querySelectorAll('[class*="cg-"]').length,path:location.pathname})`).then(JSON.parse);
const waitPath = async (s, predicate, ms = 45000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await s.eval('location.pathname'); if (predicate(p)) return p; await sleep(500); } return s.eval('location.pathname'); };

/** Clique chaque carte, vérifie la destination, revient à /settings. */
async function navigationCheck(s, check, expectedLabels) {
  for (const label of expectedLabels) {
    await s.eval(`window.next.router.push('/settings')`); await waitPath(s, (p) => p === '/settings'); await sleep(700);
    const clicked = await s.eval(`(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.innerText.split('\\n')[0].trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true})()`);
    if (!clicked) { check(`« ${label} » : carte trouvée`, false); continue; }
    const final = await waitPath(s, (p) => p !== '/settings', 60000);
    // « Mon profil » : /settings/profile puis redirection ; on attend la destination finale.
    const settled = label === 'Mon profil' ? await waitPath(s, (p) => p === '/profile', 30000) : final;
    check(`clic « ${label} » → ${FINAL_PATH[label]}`, settled === FINAL_PATH[label], 'obtenu ' + settled);
  }
}

function base(name, description, extra) {
  return { name, description, route: '/settings', ui: 'glass', theme: 'DARK', viewport: 1600, ...extra };
}

function structureChecks(s, check, glass, adminLabels, adminSections) {
  return (async () => {
    const st = await state(s);
    if (glass) {
      // Le h1 « CORO » (logo du shell) existe déjà en Legacy ; la vue Glass ajoute le h1 de page « Paramètres » (le titre Legacy est un h2).
      check('vue Glass : pas d’îlot, en-tête du kit, h1 de page « Paramètres »', st.islands === 0 && st.glassHeader === 1 && st.h1.filter((t) => t === 'Paramètres').length === 1, JSON.stringify(st));
      const lists = await s.eval(`JSON.stringify({lists:document.querySelectorAll('main ul[role=list]').length,h2:[...document.querySelectorAll('main section h2')].map(h=>h.textContent.trim()),regions:document.querySelectorAll('main section[aria-labelledby]').length,types:[...document.querySelectorAll('main button')].every(b=>b.type==='button')})`).then(JSON.parse);
      check('structure sémantique : sections nommées, listes, boutons type="button"', lists.regions === adminSections.length && lists.lists === adminSections.length && lists.types, JSON.stringify(lists));
      check('titres de section identiques (h2)', JSON.stringify(lists.h2) === JSON.stringify(adminSections), JSON.stringify(lists.h2));
    }
    check('cartes : libellés et ordre identiques au Legacy', JSON.stringify(await labels(s)) === JSON.stringify(adminLabels), JSON.stringify(await labels(s)));
    if (!glass) check('sections (Legacy / îlot) : mêmes titres', JSON.stringify(await sections(s)) === JSON.stringify(adminSections), JSON.stringify(await sections(s)));
  })();
}

module.exports = [
  base('settings-legacy', 'Legacy : cartes, rôles et navigation (référence de comportement)', {
    ui: 'legacy', theme: 'SYSTEM',
    async run(s, check) {
      const st = await state(s);
      check('Legacy : aucun élément Glass', st.ui === 'legacy' && st.cg === 0 && st.islands === 0, JSON.stringify(st));
      await structureChecks(s, check, false, ADMIN_LABELS, SECTIONS_ADMIN);
      await navigationCheck(s, check, ADMIN_LABELS);
    },
  }),
  base('settings-island-no-beta', 'Glass choisi mais bêta NON activée : contenu Legacy dans l’îlot, strictement le rendu historique', {
    async run(s, check) {
      const st = await state(s);
      check('shell Glass + îlot, vue Legacy (pas d’en-tête du kit)', st.ui === 'glass' && st.islands === 1 && st.glassHeader === 0, JSON.stringify(st));
      await structureChecks(s, check, false, ADMIN_LABELS, SECTIONS_ADMIN);
    },
  }),
  base('settings-glass-beta', 'Glass + bêta activée : vue Glass, mêmes cartes, mêmes destinations', {
    beta: true,
    async run(s, check) {
      await structureChecks(s, check, true, ADMIN_LABELS, SECTIONS_ADMIN);
      await navigationCheck(s, check, ADMIN_LABELS);
    },
  }),
  base('settings-glass-beta-light', 'Glass Light + bêta : même structure', {
    beta: true, theme: 'LIGHT',
    async run(s, check) { await structureChecks(s, check, true, ADMIN_LABELS, SECTIONS_ADMIN); },
  }),
  base('settings-role-conseiller', 'Rôle non administrateur : les sections réservées restent masquées (Legacy et Glass)', {
    beta: true, role: 'CONSEILLER',
    async run(s, check) {
      await structureChecks(s, check, true, CONSEILLER_LABELS, SECTIONS_CONSEILLER);
      const text = await s.eval(`document.querySelector('main').innerText`);
      for (const hidden of ['Organisation', 'Modèle Module 1', 'Membres de l’équipe', 'Types d’activités']) check(`« ${hidden} » absent pour un conseiller`, !text.includes(hidden));
    },
  }),
  base('settings-role-conseiller-legacy', 'Rôle non administrateur en Legacy : mêmes cartes que la vue Glass', {
    ui: 'legacy', theme: 'SYSTEM', role: 'CONSEILLER',
    async run(s, check) { await structureChecks(s, check, false, CONSEILLER_LABELS, SECTIONS_CONSEILLER); },
  }),
  ...[['settings-keyboard', 'Clavier (Glass + bêta) : Tab atteint les cartes (focus visible), Entrée navigue', { beta: true }, true],
      ['settings-keyboard-legacy', 'Clavier (Legacy) : mêmes cartes dans le même ordre, Entrée navigue comme en Glass', { ui: 'legacy', theme: 'SYSTEM' }, false]].map(([name, description, extra, glass]) => base(name, description, {
    ...extra,
    async run(s, check) {
      await s.eval('document.body.focus()');
      let reached = false; let focusInfo = null;
      for (let i = 0; i < 60 && !reached; i++) {
        await s.key('Tab', 'Tab', 9);
        focusInfo = await s.eval(`(()=>{const a=document.activeElement;const main=document.querySelector('main');if(!a||!main.contains(a))return null;const cs=getComputedStyle(a);return JSON.stringify({label:a.innerText.split(String.fromCharCode(10))[0].trim(),outline:cs.outlineStyle,width:cs.outlineWidth})})()`);
        reached = !!focusInfo;
      }
      const f = focusInfo && JSON.parse(focusInfo);
      check('Tab atteint la première carte (« Mon profil »)', f && f.label === 'Mon profil', focusInfo);
      if (glass) check('anneau de focus visible sur la carte (contour Design System)', f && f.outline !== 'none' && parseFloat(f.width) >= 2, focusInfo);
      await s.key('Tab', 'Tab', 9);
      const second = await s.eval('document.activeElement.innerText.split(String.fromCharCode(10))[0].trim()');
      check('Tab suivant : carte suivante dans l’ordre (« Organisation »)', second === 'Organisation', second);
      await s.key('Tab', 'Tab', 9, true);
      const back = await s.eval('document.activeElement.innerText.split(String.fromCharCode(10))[0].trim()');
      check('Maj+Tab : retour sur « Mon profil »', back === 'Mon profil', back);
      await s.key('Enter', 'Enter', 13);
      const p = await waitPath(s, (x) => x === '/profile', 40000);
      check('Entrée sur « Mon profil » → /profile', p === '/profile', p);
    },
  })),
  ...[320, 390, 768, 1600].map((w) => ({
    name: `settings-responsive-${w}`, description: `mise en page à ${w} px : pas de défilement horizontal, cibles ≥ 44 px, colonnes attendues`,
    route: '/settings', ui: 'glass', theme: 'DARK', viewport: w, beta: true,
    async run(s, check) {
      const m = JSON.parse(await s.eval(`(()=>{const bs=[...document.querySelectorAll('main button')];const xs=[...new Set(bs.map(b=>Math.round(b.getBoundingClientRect().left)))];return JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth,count:bs.length,cols:xs.length,minH:Math.min(...bs.map(b=>b.getBoundingClientRect().height)),maxRight:Math.max(...bs.map(b=>b.getBoundingClientRect().right)),clipped:bs.filter(b=>b.scrollWidth>b.clientWidth+1).length})})()`));
      const expectedCols = w >= 1536 ? 3 : w >= 768 ? 2 : 1;
      check('aucun défilement horizontal de la page', m.docW <= m.vw, JSON.stringify(m));
      check('toutes les cartes dans la fenêtre', m.maxRight <= m.vw + 0.5, JSON.stringify(m));
      check('cibles tactiles ≥ 44 px de haut', m.minH >= 44, JSON.stringify(m));
      check(`${expectedCols} colonne(s) attendue(s)`, m.cols === expectedCols, JSON.stringify(m));
      check('aucun texte coupé dans les cartes', m.clipped === 0, JSON.stringify(m));
    },
  })),
];
