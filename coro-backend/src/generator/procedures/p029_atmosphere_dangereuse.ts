import { COLORS, ProcedureTemplate, sid } from './types';

const CODE = 'P029';

export const P029_ATMOSPHERE_DANGEREUSE: ProcedureTemplate = {
  id: 'p029_atmosphere_dangereuse',
  code: CODE,
  titleFR: 'ATMOSPHÈRE DANGEREUSE OU VENTILATION DE SÉCURITÉ INDISPONIBLE',
  titleEN: 'HAZARDOUS ATMOSPHERE OR SAFETY VENTILATION UNAVAILABLE',
  icon: '⚠️',
  headerColor: COLORS.purple,
  activationRule: 'manual',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-CU',
    roleLabelFR: "Coordonnateur d'urgence",
    roleLabelEN: 'Emergency Coordinator',
    headerColor: COLORS.purple,
    steps: [
      { id: sid(CODE, 1), textFR: '**Reconnaître le seuil d’urgence** : odeur, alarme, symptômes, mesure anormale ou perte d’une ventilation requise pour la sécurité.', textEN: '**Recognize the emergency threshold**: odour, alarm, symptoms, abnormal reading, or loss of ventilation required for safety.', isBold: true, isRed: true },
      { id: sid(CODE, 2), textFR: 'Éloigner les personnes de la zone touchée sans les diriger à travers la zone suspecte.', textEN: 'Move people away from the affected area without routing them through the suspected area.' },
      { id: sid(CODE, 3), textFR: 'Ne pas tenter de réparer, redémarrer ou modifier le système de ventilation.', textEN: 'Do not attempt to repair, restart, or alter the ventilation system.', isBold: true },
      { id: sid(CODE, 4), textFR: 'Déterminer, selon le PMU et les autorités compétentes, si la mesure appropriée est l’évacuation, le confinement ou l’isolement local.', textEN: 'Determine, according to the ERP and competent authorities, whether evacuation, shelter-in-place, or local isolation is appropriate.' },
      { id: sid(CODE, 5), textFR: 'Aviser les services d’urgence si une personne présente des symptômes, si la substance est inconnue ou si le danger ne peut être exclu.', textEN: 'Notify emergency services if anyone has symptoms, the substance is unknown, or danger cannot be ruled out.' },
      { id: sid(CODE, 6), textFR: 'Transmettre aux intervenants les accès, coupures, plans et informations techniques approuvés disponibles.', textEN: 'Provide responders with available approved access, shutoff, plan, and technical information.' },
      { id: sid(CODE, 7), textFR: 'Maintenir les restrictions jusqu’à confirmation documentée que la zone est sécuritaire.', textEN: 'Maintain restrictions until documented confirmation that the area is safe.' },
      { id: sid(CODE, 8), textFR: 'Consigner les décisions, mesures, heures et sources d’information dans la chronologie Incident.', textEN: 'Record decisions, readings, times, measures, and information sources in the Incident timeline.' },
    ],
  }],
};
