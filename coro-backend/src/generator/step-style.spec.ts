import { harmonizeStep, harmonizeStepText as h } from './step-style';
import { getAllProcedures } from './procedures/index';
import { applyRoleCoverage } from './role-coverage';
import { templateIssues, toTemplateContent } from '../custom-procedures/procedure-template';

describe('harmonizeStepText', () => {
  it.each([
    ['Vérifier le panneau d’alarme', '**Vérifiez** le panneau d’alarme'],
    ["S'assurer que les issues sont dégagées", '**Assurez-vous** que les issues sont dégagées'],
    ['Se diriger vers le poste de commandement', '**Dirigez-vous** vers le poste de commandement'],
    ['Ne pas utiliser les ascenseurs', "**N'utilisez pas** les ascenseurs"],
    ['Ne jamais tenter de déplacer la victime', '**Ne tentez jamais** de déplacer la victime'],
    ['Faire évacuer la zone', '**Faites** évacuer la zone'],
    ['Être disponible pour le coordonnateur', '**Soyez** disponible pour le coordonnateur'],
    ['**Appeler le 9-1-1** et indiquer :', '**Appelez le 9-1-1** et indiquez :'],
    ['Rester calme et garder son sang-froid', '**Restez** calme et gardez votre sang-froid'],
    ['Rediriger les occupants ou leur demander d’attendre', '**Redirigez** les occupants ou demandez-leur d’attendre'],
    ['Confirmer la menace, sans s’exposer', '**Confirmez** la menace, sans vous exposer'],
    ['Participer au débriefing pour analyser la réponse et identifier les améliorations', '**Participez** au débriefing pour analyser la réponse et identifier les améliorations'],
    ['Ne pas réparer, contourner ou remettre en service le système', '**Ne réparez pas**, ne contournez pas ou ne remettez pas en service le système'],
    ["Ne jamais ouvrir — forcer les portes pourrait aggraver la situation", "**N'ouvrez jamais** — forcer les portes pourrait aggraver la situation"],
  ])('%s', (input, expected) => {
    expect(h(input)).toBe(expected);
  });

  it('ne touche pas au texte déjà vouvoyé, sinon pour mettre le verbe en gras', () => {
    expect(h('**Vérifiez** immédiatement le panneau')).toBe('**Vérifiez** immédiatement le panneau');
    expect(h('Vérifiez immédiatement le panneau')).toBe('**Vérifiez** immédiatement le panneau');
  });

  it('ne touche pas aux conditions, intertitres et mots inconnus', () => {
    expect(h('Si la fumée est visible :')).toBe('Si la fumée est visible :');
    expect(h('Communication avec le 9-1-1 :')).toBe('Communication avec le 9-1-1 :');
    expect(h('Atelier de soudure')).toBe('Atelier de soudure');
  });

  it('les sous-étapes ne reçoivent pas de gras', () => {
    const step = harmonizeStep({ textFR: 'Fermer les portes', subSteps: [{ textFR: 'Couper la ventilation' }] });
    expect(step.textFR).toBe('**Fermez** les portes');
    expect(step.subSteps![0].textFR).toBe('Coupez la ventilation');
  });
});

describe('bibliothèque harmonisée', () => {
  it('aucune étape de la bibliothèque ne commence par un infinitif', () => {
    const active = ['ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM', 'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS', 'ROLE-CHE', 'ROLE-ACC'];
    const issues = getAllProcedures().flatMap((p) =>
      templateIssues(toTemplateContent(applyRoleCoverage(p, active), {}))
        .filter((i) => i.problem.startsWith('verbe'))
        .map((i) => `${p.code} ${i.where}`),
    );
    expect(issues).toEqual([]);
  });
});
