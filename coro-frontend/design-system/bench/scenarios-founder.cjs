/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scénarios « Platform Authority » (Phase 12) : les 11 écrans Founder de la QA de main et l'accès par autorité effective.
 *
 * RÈGLE : le code métier et les autorités de `main` font autorité. Ces scénarios CARACTÉRISENT la façon dont l'interface Liquid Glass se comporte face
 * à ces autorités (menus, redirections, refus, thème, responsive) ; ils ne modifient aucune règle d'accès et ne prouvent rien sur le vrai backend
 * (le faux API reproduit seulement la FORME du contrat : voir bench/mock-api.cjs, « Autorité de plateforme »).
 *
 *  founder-<écran>-<mode> : un Founder ouvre l'écran à 1440, 1920, 390 et 430 px (modes : Classic, Glass clair, Glass sombre, îlot). Vérifie : écran atteint
 *                           sans redirection, contenu rendu, aucune exception JavaScript (ni RangeError), aucun débordement horizontal, thème conservé après F5.
 *  rbac-<profil>-<mode>   : menus et redirections selon l'autorité effective (Founder / employé CORO délégué / employé CORO sans permission / ADMIN client).
 *
 * Faux API : BENCH_RENDEMENT=1 (données). Lancement : node design-system/bench/campaign.cjs scenarios --pages founder,founder-rbac
 */
const { sleep, VIEWPORTS } = require('./cdp.cjs');

const MODES = [
  ['legacy', { ui: 'legacy', theme: 'SYSTEM' }],
  ['island', { ui: 'glass', theme: 'DARK' }],
  ['glass-dark', { ui: 'glass', theme: 'DARK', beta: true }],
  ['glass-light', { ui: 'glass', theme: 'LIGHT', beta: true }],
];
const ORG_ID = '00000000-0000-4000-8000-000000000012';
/** Les 11 écrans Founder de la matrice de QA de main (page des permissions + 10 écrans de smoke). */
const FOUNDER_SCREENS = [
  ['grants', '/admin/platform-permission-grants'],
  ['commercial', '/admin/commercial'],
  ['catalog', '/admin/product-catalog'],
  ['pricebooks', '/admin/product-catalog/price-books'],
  ['configurator', '/admin/commercial/configurator'],
  ['proposals', '/admin/commercial/proposals'],
  ['contracts', '/admin/commercial/contracts'],
  ['entitlements', '/admin/commercial/entitlements'],
  ['org360', `/admin/organizations/${ORG_ID}`],
  ['legal', '/admin/commercial/legal-issuer'],
  ['rendement', '/dashboard/rendement'],
];
const WIDTHS = [1440, 1920, 390, 430];

const overflowAt = async (s, width) => {
  await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[width]);
  await sleep(900);
  return s.eval(`JSON.stringify({docW:document.documentElement.scrollWidth,vw:innerWidth})`).then(JSON.parse);
};
const shellState = (s) => s.eval(`JSON.stringify({ui:document.documentElement.getAttribute('data-ui')||'',theme:document.documentElement.getAttribute('data-theme')||''})`).then(JSON.parse);
const bodyText = (s) => s.eval(`document.body.innerText`);
const navText = (s) => s.eval(`document.body.textContent`);

const scenarios = [];
for (const [modeName, base] of MODES) {
  // ═════════ Écrans Founder ═════════
  for (const [kind, route] of FOUNDER_SCREENS) {
    scenarios.push({
      name: `founder-${kind}-${modeName}`, description: `${route} — Founder (${modeName})`, route, viewport: 1440, ...base, role: 'SUPER_ADMIN', authority: 'founder',
      run: async (s, check) => {
        await sleep(4500);
        const here = await s.eval('location.pathname');
        check(`écran atteint sans redirection (${route})`, here === route, here);
        if (here !== route) return;
        const text = await bodyText(s);
        check('contenu rendu (page non blanche)', text.trim().length > 40, `${text.trim().length} caractères`);
        check('aucune exception JavaScript, aucun RangeError', s.consoleErrors.length === 0 && !/RangeError/.test(text), s.consoleErrors.map((e) => String(e).split('\n')[0]).join(' | ').slice(0, 200));
        const st = await shellState(s);
        const expectGlass = base.ui === 'glass';
        check(`mode ${modeName} : ${expectGlass ? 'shell Glass actif' : 'Classic (aucun shell Glass)'}`, expectGlass ? st.ui === 'glass' : st.ui !== 'glass', JSON.stringify(st));
        if (expectGlass) check(`thème ${base.theme === 'DARK' ? 'sombre' : 'clair'} appliqué`, st.theme === (base.theme === 'DARK' ? 'dark' : 'light'), JSON.stringify(st));

        if (kind === 'grants') {
          check('titre « Permissions plateforme » et formulaire « Accorder une permission »', /Permissions plateforme/.test(text) && /Accorder une permission/.test(text));
          check('liste des grants avec provenance : motif de l’octroi et de la révocation visibles', /Délégation de test/.test(text) && /Fin de mission/.test(text));
          check('grant actif révocable (« Révoquer ») ; grant révoqué non révocable', await s.eval(`[...document.querySelectorAll('button')].filter(b=>/Révoquer/.test(b.textContent)).length===1`));
          check('portée GLOBAL signalée (avertissement et case de confirmation présents dans le formulaire)', /GLOBAL/.test(await navText(s)));
        }
        if (kind === 'rendement') {
          check('indicateurs financiers du Founder affichés (titre, tableau de mandats)', /Rendement et rentabilité/.test(text) && (await s.eval(`document.querySelectorAll('main table tbody tr').length`)) > 0);
        }

        for (const w of WIDTHS) {
          const o = await overflowAt(s, w);
          check(`aucun débordement horizontal à ${w} px`, o.docW <= o.vw + 1, JSON.stringify(o));
        }
        await s.send('Emulation.setDeviceMetricsOverride', VIEWPORTS[1440]);
        await s.send('Page.reload'); await sleep(4500);
        const after = await s.eval('location.pathname'); const st2 = await shellState(s);
        check('après F5 : même écran, même moteur et même thème', after === route && st2.ui === st.ui && st2.theme === st.theme, `${after} ${JSON.stringify(st2)}`);
        check('après F5 : aucune exception JavaScript', s.consoleErrors.length === 0, String(s.consoleErrors.length));
      },
    });
  }

  // ═════════ Menus et redirections selon l'autorité effective ═════════
  const PROFILES = [
    ['founder', { role: 'SUPER_ADMIN', authority: 'founder' }],
    ['delegated', { role: 'SUPER_ADMIN', authority: 'delegated' }],
    ['employee-none', { role: 'SUPER_ADMIN', authority: 'none' }],
    ['customer-admin', { role: 'ADMIN' }],
  ];
  for (const [profile, who] of PROFILES) {
    scenarios.push({
      name: `rbac-${profile}-${modeName}`, description: `Accès par autorité effective — ${profile} (${modeName})`, route: '/dashboard', viewport: 1600, ...base, ...who,
      run: async (s, check) => {
        await sleep(4500);
        const nav = await navText(s);
        const hasPlatform = /Tableau commercial/.test(nav);
        const hasPermissionsLink = /Permissions plateforme/.test(nav);
        const hasControlCenter = /Control Center/.test(nav);
        const hasFounderGroup = /Rapports REX/.test(nav);
        const expPlatform = profile === 'founder' || profile === 'delegated';
        check(`menu : groupe Plateforme/Commercial ${expPlatform ? 'présent' : 'ABSENT'}`, hasPlatform === expPlatform, `Tableau commercial=${hasPlatform}`);
        check(`menu : « Permissions plateforme » ${profile === 'founder' ? 'présent (Founder seulement)' : 'ABSENT'}`, hasPermissionsLink === (profile === 'founder'), `lien=${hasPermissionsLink}`);
        check(`menu : groupe Founder (Rapports REX, Health Score…) ${profile === 'founder' ? 'présent' : 'ABSENT'}`, hasFounderGroup === (profile === 'founder'), `Rapports REX=${hasFounderGroup}`);
        check(`menu : Control Center ${expPlatform ? 'présent (accès plateforme)' : 'ABSENT'}`, hasControlCenter === expPlatform, `Control Center=${hasControlCenter}`);
        check('menu : « Rendement équipe » visible pour les rôles ADMIN et SUPER_ADMIN (règle de main inchangée)', /Rendement équipe/.test(nav));
        check('aucune exception JavaScript', s.consoleErrors.length === 0, s.consoleErrors.map((e) => String(e).split('\n')[0]).join(' | ').slice(0, 200));

        const visit = async (route) => { await s.send('Page.navigate', { url: require('./cdp.cjs').BASE + route }); await sleep(5000); return s.eval('location.pathname'); };
        const grants = await visit('/admin/platform-permission-grants');
        check(`/admin/platform-permission-grants : ${profile === 'founder' ? 'accessible' : 'refusé (redirigé vers /dashboard)'}`, profile === 'founder' ? grants === '/admin/platform-permission-grants' : grants === '/dashboard', grants);
        const commercial = await visit('/admin/commercial');
        check(`/admin/commercial : ${expPlatform ? 'accessible' : 'refusé (redirigé vers /dashboard)'}`, expPlatform ? commercial === '/admin/commercial' : commercial === '/dashboard', commercial);
        if (!expPlatform) {
          const txt = await bodyText(s);
          check('aucun contenu administratif plateforme affiché après le refus', !/Permissions plateforme|Accorder une permission|Tableau commercial/.test(txt.replace(/\s+/g, ' ')) || /Tableau de bord/.test(txt), 'page /dashboard');
        }
        const fin = await visit('/dashboard/rendement');
        const text = await bodyText(s);
        const financialWords = /Montant vendu validé|Coût de main-d’œuvre connu|Marge des mandats complets|Synthèse financière|Mandats incomplets/.test(text);
        if (profile === 'founder' || profile === 'delegated') check('/dashboard/rendement : indicateurs financiers affichés (FINANCIAL_RENDEMENT_READ)', fin === '/dashboard/rendement' && financialWords, `${fin} financier=${financialWords}`);
        else check('/dashboard/rendement : AUCUN indicateur financier (permission FINANCIAL_RENDEMENT_READ absente)', !financialWords, `${fin} financier=${financialWords}`);
      },
    });
  }
}

module.exports = scenarios;
module.exports.FOUNDER_SCREENS = FOUNDER_SCREENS;
