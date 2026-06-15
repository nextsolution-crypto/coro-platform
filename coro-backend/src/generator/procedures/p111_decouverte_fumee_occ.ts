import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P111';
export const P111_DECOUVERTE_FUMEE_OCC: ProcedureTemplate = {
  id: 'p111_decouverte_fumee_occ', code: CODE,
  titleFR: 'DÉCOUVERTE DE FUMÉE OU DE FLAMME — OCCUPANTS',
  titleEN: 'DISCOVERY OF SMOKE OR FLAME — OCCUPANTS',
  icon: '🔥', headerColor: COLORS.orange,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.orange,
    steps: [
      { id: sid(CODE,1), textFR: 'Rester calme — concentrez-vous sur votre sécurité et celle des autres', textEN: 'Stay calm — focus on your safety and that of others', isBold: false },
      { id: sid(CODE,2), textFR: '**Déclencher l\'alarme incendie** via la station manuelle la plus près', textEN: '**Activate the fire alarm** via the nearest manual station', isBold: true, isRed: true },
      { id: sid(CODE,3), textFR: 'Avertir immédiatement les occupants du secteur', textEN: 'Immediately warn occupants in the sector', isBold: false },
      { id: sid(CODE,4), textFR: 'Tenter d\'éteindre le début d\'incendie **uniquement si** : vous êtes formé à utiliser un extincteur ET votre santé et votre sécurité ne sont pas compromises', textEN: 'Attempt to extinguish the fire **only if**: you are trained to use an extinguisher AND your health and safety are not compromised', isBold: false },
      { id: sid(CODE,5), textFR: 'Si sur un équipement roulant, arrêtez-le immédiatement et descendez en sécurité avant de quitter', textEN: 'If on rolling equipment, stop it immediately and get off safely before leaving', isBold: false, isRed: true },
      { id: sid(CODE,6), textFR: 'Évacuer par la sortie la plus proche (ne pas utiliser les ascenseurs) — fermer les portes derrière vous', textEN: 'Evacuate through the nearest exit (do not use elevators) — close doors behind you', isBold: false },
      { id: sid(CODE,7), textFR: 'En présence de fumée, s\'abaisser au niveau du sol et quitter immédiatement les lieux', textEN: 'In the presence of smoke, lower yourself to the ground and immediately leave the premises', isBold: false, isRed: true },
      { id: sid(CODE,8), textFR: 'Rejoindre le point de rassemblement à l\'extérieur, à distance sécuritaire du bâtiment', textEN: 'Proceed to the assembly point outside, at a safe distance from the building', isBold: false },
      { id: sid(CODE,9), textFR: 'Composer le 9-1-1 une fois en sécurité et donner : l\'adresse complète du bâtiment et les détails de l\'incident', textEN: 'Dial 9-1-1 once safe and provide: the complete building address and incident details', isBold: false },
      { id: sid(CODE,10), textFR: 'Ne pas réintégrer le bâtiment sans l\'autorisation des services d\'urgence', textEN: 'Do not re-enter the building without emergency services authorization', isBold: false, isRed: true },
    ],
  }],
};