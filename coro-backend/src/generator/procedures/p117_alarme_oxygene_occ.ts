import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P117';
export const P117_ALARME_OXYGENE_OCC: ProcedureTemplate = {
  id: 'p117_alarme_oxygene_occ', code: CODE,
  titleFR: 'ALARME DE BAS NIVEAU D\'OXYGÈNE — OCCUPANTS',
  titleEN: 'LOW OXYGEN LEVEL ALARM — OCCUPANTS',
  icon: '🫁', headerColor: COLORS.blue,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.blue,
    steps: [
      { id: sid(CODE,1), textFR: 'Cesser immédiatement toute activité dès le déclenchement de l\'alarme ou du stroboscope', textEN: 'Immediately stop all activity upon alarm or strobe activation', isBold: false },
      { id: sid(CODE,2), textFR: 'Évacuer calmement la zone vers la sortie la plus proche — ne pas tenter de récupérer ses effets personnels', textEN: 'Calmly evacuate the area toward the nearest exit — do not attempt to retrieve personal belongings', isBold: false, isRed: true },
      { id: sid(CODE,3), textFR: 'Aider les autres si la situation est sécuritaire — si un collègue semble désorienté ou présente des difficultés respiratoires, l\'aider à sortir sans compromettre sa propre sécurité', textEN: 'Help others if the situation is safe — if a colleague seems disoriented or has breathing difficulties, help them out without compromising your own safety', isBold: false },
      { id: sid(CODE,4), textFR: 'Signaler toute personne en difficulté ou manquante aux responsables de l\'évacuation dès l\'arrivée au point de rassemblement', textEN: 'Report any person in difficulty or missing to evacuation supervisors upon arrival at the assembly point', isBold: false },
      { id: sid(CODE,5), textFR: 'Se diriger vers le point de rassemblement désigné à l\'extérieur du bâtiment, dans une zone bien ventilée et sécuritaire', textEN: 'Proceed to the designated assembly point outside the building, in a well-ventilated and safe area', isBold: false },
      { id: sid(CODE,6), textFR: 'Les responsables de secteur doivent confirmer la présence de tout le personnel et informer immédiatement les responsables si quelqu\'un est manquant', textEN: 'Sector supervisors must confirm all personnel are present and immediately inform supervisors if anyone is missing', isBold: false },
      { id: sid(CODE,7), textFR: 'Rester au point de rassemblement jusqu\'à nouvel ordre — ne pas retourner dans le bâtiment avant d\'avoir reçu l\'autorisation des autorités compétentes ou de l\'équipe de sécurité', textEN: 'Stay at the assembly point until further notice — do not return to the building before receiving authorization from competent authorities or the security team', isBold: false, isRed: true },
      { id: sid(CODE,8), textFR: 'Signaler immédiatement tout symptôme d\'hypoxie (maux de tête, vertiges, confusion, essoufflement, fatigue) — une assistance médicale doit être demandée sur place au besoin', textEN: 'Immediately report any hypoxia symptoms (headache, dizziness, confusion, shortness of breath, fatigue) — medical assistance must be requested on site if needed', isBold: false },
      { id: sid(CODE,9), textFR: 'Surveiller son état de santé après l\'incident — si des symptômes persistent (maux de tête, confusion, faiblesse), consulter un professionnel de la santé et informer son coordonnateur', textEN: 'Monitor your health after the incident — if symptoms persist (headache, confusion, weakness), consult a health professional and inform your coordinator', isBold: false },
      { id: sid(CODE,10), textFR: 'Participer à l\'évaluation post-incident pour aider à améliorer les mesures préventives futures', textEN: 'Participate in the post-incident assessment to help improve future preventive measures', isBold: false },
      { id: sid(CODE,11), textFR: '⚠️ Le seuil de 19,5 % est considéré comme la limite inférieure d\'oxygène sécuritaire selon le Règlement sur la santé et la sécurité du travail (RSST) du Québec — en dessous de ce seuil, l\'air est considéré dangereux sans équipement de protection respiratoire — toute alarme de bas niveau d\'oxygène doit être traitée comme une urgence critique', textEN: '⚠️ The 19.5% threshold is the minimum safe oxygen level per Quebec\'s Regulation respecting occupational health and safety (RSST) — below this threshold, air is considered dangerous without respiratory protection — any low oxygen alarm must be treated as a critical emergency', isBold: false, isRed: true },
    ],
  }],
};