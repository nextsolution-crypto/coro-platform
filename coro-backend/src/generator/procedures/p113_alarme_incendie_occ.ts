import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P113';
export const P113_ALARME_INCENDIE_OCC: ProcedureTemplate = {
  id: 'p113_alarme_incendie_occ', code: CODE,
  titleFR: 'DÉCLENCHEMENT DE L\'ALARME INCENDIE — OCCUPANTS',
  titleEN: 'FIRE ALARM ACTIVATION — OCCUPANTS',
  icon: '🚨', headerColor: COLORS.red,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'], phase: 'alarme',
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.red,
    steps: [
      { id: sid(CODE,1), textFR: 'Rester calme et se concentrer sur sa sécurité', textEN: 'Stay calm and focus on your safety', isBold: false },
      { id: sid(CODE,2), textFR: 'Écouter attentivement les messages diffusés par le système d\'alarme ou les haut-parleurs', textEN: 'Listen carefully to messages broadcast by the alarm system or speakers', isBold: false },
      { id: sid(CODE,3), textFR: 'Arrêter immédiatement toute activité en cours — si sur un équipement roulant, descendre prudemment et s\'assurer qu\'il est immobilisé avant de quitter la zone', textEN: 'Immediately stop all current activity — if on rolling equipment, dismount carefully and ensure it is immobilized before leaving the area', isBold: false, isRed: true },
      { id: sid(CODE,4), textFR: 'Fermer les portes derrière vous sans les verrouiller pour limiter la propagation de la fumée et du feu', textEN: 'Close doors behind you without locking them to limit smoke and fire spread', isBold: false },
      { id: sid(CODE,5), textFR: 'Évacuer calmement par la sortie la plus proche', textEN: 'Calmly evacuate through the nearest exit', isBold: false },
      { id: sid(CODE,6), textFR: 'Ne pas prendre ses effets personnels et ne pas utiliser les ascenseurs', textEN: 'Do not take personal belongings and do not use elevators', isBold: false, isRed: true },
      { id: sid(CODE,7), textFR: 'Si de la fumée est présente, s\'abaisser au niveau du sol pour éviter son inhalation et se diriger vers la sortie la plus proche', textEN: 'If smoke is present, lower yourself to the ground to avoid inhalation and proceed to the nearest exit', isBold: false },
      { id: sid(CODE,8), textFR: 'Si témoin d\'un départ de feu, ne pas intervenir si la sécurité peut être compromise', textEN: 'If witnessing a fire start, do not intervene if safety may be compromised', isBold: false },
      { id: sid(CODE,9), textFR: 'Rejoindre le point de rassemblement extérieur désigné et maintenir une distance sécuritaire du bâtiment', textEN: 'Proceed to the designated outdoor assembly point and maintain a safe distance from the building', isBold: false },
      { id: sid(CODE,10), textFR: 'Écouter et suivre les instructions données par les membres de l\'équipe d\'urgence ou les pompiers', textEN: 'Listen and follow instructions given by emergency team members or firefighters', isBold: false },
      { id: sid(CODE,11), textFR: 'Ne pas retourner dans le bâtiment tant que l\'autorisation officielle n\'a pas été donnée par les services d\'incendie', textEN: 'Do not return to the building until official authorization has been given by fire services', isBold: false, isRed: true },
      { id: sid(CODE,12), textFR: '⚠️ Il est strictement interdit de retourner à l\'intérieur du bâtiment sans autorisation préalable du service incendie', textEN: '⚠️ It is strictly forbidden to return inside the building without prior authorization from the fire department', isBold: false, isRed: true },
    ],
  }],
};