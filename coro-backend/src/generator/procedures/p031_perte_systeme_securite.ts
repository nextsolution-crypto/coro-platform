import { COLORS, ProcedureTemplate, sid } from './types';

const CODE = 'P031';

export const P031_PERTE_SYSTEME_SECURITE: ProcedureTemplate = {
  id: 'p031_perte_systeme_securite',
  code: CODE,
  titleFR: "PERTE D'UN SYSTÈME ESSENTIEL À LA SÉCURITÉ",
  titleEN: 'LOSS OF A SAFETY-CRITICAL SYSTEM',
  icon: '🛡️',
  headerColor: COLORS.slate,
  activationRule: 'manual',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-CU',
    roleLabelFR: "Coordonnateur d'urgence",
    roleLabelEN: 'Emergency Coordinator',
    headerColor: COLORS.slate,
    steps: [
      { id: sid(CODE, 1), textFR: '**Confirmer que la perte compromet la protection des personnes, l’intervention ou une fonction essentielle du bâtiment.**', textEN: '**Confirm that the loss compromises life safety, emergency response, or an essential building function.**', isBold: true, isRed: true },
      { id: sid(CODE, 2), textFR: 'Identifier le système, la zone, les fonctions dépendantes et les personnes exposées.', textEN: 'Identify the system, area, dependent functions, and exposed people.' },
      { id: sid(CODE, 3), textFR: 'Isoler ou restreindre la zone lorsque la sécurité ne peut être assurée.', textEN: 'Isolate or restrict the area when safety cannot be assured.' },
      { id: sid(CODE, 4), textFR: 'Appliquer les mesures compensatoires approuvées; ne pas inventer de procédure de réparation.', textEN: 'Apply approved compensating measures; do not invent a repair procedure.', isBold: true },
      { id: sid(CODE, 5), textFR: 'Aviser le responsable technique, la direction et les services d’urgence selon la conséquence observée.', textEN: 'Notify the technical lead, management, and emergency services according to the observed consequence.' },
      { id: sid(CODE, 6), textFR: 'Réévaluer le maintien des activités, le confinement ou l’évacuation à chaque changement significatif.', textEN: 'Reassess continued operations, shelter-in-place, or evacuation after each significant change.' },
      { id: sid(CODE, 7), textFR: 'Maintenir la surveillance et consigner les mesures compensatoires jusqu’à la remise en service confirmée.', textEN: 'Maintain monitoring and record compensating measures until restoration is confirmed.' },
      { id: sid(CODE, 8), textFR: 'Ouvrir un REX et une action corrective lorsque la perte révèle une lacune de préparation ou de résilience.', textEN: 'Open an after-action review and corrective action when the loss reveals a preparedness or resilience gap.' },
    ],
  }],
};
