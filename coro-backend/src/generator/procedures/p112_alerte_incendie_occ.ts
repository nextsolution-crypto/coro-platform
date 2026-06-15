import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P112';
export const P112_ALERTE_INCENDIE_OCC: ProcedureTemplate = {
  id: 'p112_alerte_incendie_occ', code: CODE,
  titleFR: 'DÉCLENCHEMENT DE L\'ALERTE INCENDIE — OCCUPANTS',
  titleEN: 'FIRE ALERT ACTIVATION — OCCUPANTS',
  icon: '🔔', headerColor: COLORS.fireAlert,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'], phase: 'alerte',
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.fireAlert,
    steps: [
      { id: sid(CODE,1), textFR: 'Rester calme — votre sécurité dépend de votre capacité à suivre les instructions', textEN: 'Stay calm — your safety depends on your ability to follow instructions', isBold: false },
      { id: sid(CODE,2), textFR: 'Écouter attentivement les messages diffusés par le système d\'alarme ou par les haut-parleurs d\'urgence', textEN: 'Listen carefully to messages broadcast by the alarm system or emergency speakers', isBold: false },
      { id: sid(CODE,3), textFR: 'Cesser immédiatement toute activité — si sur un équipement roulant, descendre prudemment avant de quitter', textEN: 'Immediately stop all activity — if on rolling equipment, dismount carefully before leaving', isBold: false },
      { id: sid(CODE,4), textFR: 'Éteindre ou sécuriser les équipements électriques ou machines en cours d\'utilisation, sans retarder le départ', textEN: 'Turn off or secure electrical equipment or machines in use, without delaying departure', isBold: false },
      { id: sid(CODE,5), textFR: 'Se préparer à évacuer dès que l\'ordre en est donné — fermer les portes derrière vous pour limiter la propagation de la fumée et du feu', textEN: 'Prepare to evacuate as soon as the order is given — close doors behind you to limit smoke and fire spread', isBold: false },
      { id: sid(CODE,6), textFR: 'Ne jamais retourner chercher des effets personnels après le déclenchement de l\'alarme', textEN: 'Never return to retrieve personal belongings after the alarm activates', isBold: false, isRed: true },
      { id: sid(CODE,7), textFR: 'Suivre les instructions des membres de l\'équipe d\'urgence et utiliser la sortie la plus proche', textEN: 'Follow emergency team member instructions and use the nearest exit', isBold: false },
      { id: sid(CODE,8), textFR: 'Ne pas utiliser les ascenseurs', textEN: 'Do not use elevators', isBold: false, isRed: true },
      { id: sid(CODE,9), textFR: 'Se diriger calmement vers le point de rassemblement extérieur prévu pour votre secteur', textEN: 'Calmly proceed to the outdoor assembly point designated for your sector', isBold: false },
      { id: sid(CODE,10), textFR: 'Signaler immédiatement à l\'équipe d\'urgence toute personne manquante ou blessée', textEN: 'Immediately report to the emergency team any missing or injured person', isBold: false },
      { id: sid(CODE,11), textFR: 'Rester au point de rassemblement jusqu\'à l\'autorisation du coordonnateur d\'urgence ou des pompiers', textEN: 'Stay at the assembly point until authorized by the emergency coordinator or firefighters', isBold: false },
      { id: sid(CODE,12), textFR: 'Ne pas réintégrer le bâtiment avant l\'autorisation officielle des services d\'urgence', textEN: 'Do not re-enter the building before official emergency services authorization', isBold: false, isRed: true },
      { id: sid(CODE,13), textFR: '⚠️ En présence de fumée, s\'abaisser au niveau du sol pour éviter son inhalation et se diriger vers la sortie la plus proche', textEN: '⚠️ In the presence of smoke, lower yourself to the ground to avoid inhalation and proceed to the nearest exit', isBold: false, isRed: true },
    ],
  }],
};