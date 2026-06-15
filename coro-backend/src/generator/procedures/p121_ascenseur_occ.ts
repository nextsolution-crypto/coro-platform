import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P121';
export const P121_ASCENSEUR_OCC: ProcedureTemplate = {
  id: 'p121_ascenseur_occ', code: CODE,
  titleFR: 'PERSONNE COINCÉE DANS UN ASCENSEUR — OCCUPANTS',
  titleEN: 'PERSON TRAPPED IN AN ELEVATOR — OCCUPANTS',
  icon: '🛗', headerColor: COLORS.teal,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.teal,
    steps: [
      { id: sid(CODE,1), textFR: 'Rester calme et garder son sang-froid — les pannes d\'ascenseur sont généralement temporaires et se résolvent sans incident — rester immobile, respirer lentement et éviter toute panique', textEN: 'Stay calm and keep composure — elevator breakdowns are generally temporary and resolve without incident — remain still, breathe slowly, and avoid panic', isBold: false },
      { id: sid(CODE,2), textFR: '**Demander de l\'aide sans tarder :** appuyer sur le bouton d\'alarme de l\'ascenseur pour signaler la situation — utiliser le système d\'intercom pour parler à un préposé ou à un technicien du service d\'entretien — si accès à un téléphone cellulaire, composer le 9-1-1 pour signaler la position et la situation', textEN: '**Request help without delay:** press the elevator alarm button to signal the situation — use the intercom system to speak with an attendant or maintenance technician — if cell phone access is available, dial 9-1-1 to report position and situation', isBold: true, isRed: true },
      { id: sid(CODE,3), textFR: '**Ne jamais tenter d\'ouvrir les portes** — forcer les portes ou tenter de sortir sans assistance pourrait aggraver la situation et mettre en danger — rester à l\'intérieur de la cabine et attendre les consignes des secours ou du technicien d\'entretien', textEN: '**Never attempt to open the doors** — forcing doors or attempting to exit without assistance could worsen the situation and endanger — stay inside the cabin and wait for instructions from emergency services or the maintenance technician', isBold: true, isRed: true },
      { id: sid(CODE,4), textFR: 'Ne quitter l\'ascenseur qu\'à la demande expresse des intervenants et uniquement lorsque la cabine est sécurisée', textEN: 'Only leave the elevator at the express request of responders and only when the cabin is secured', isBold: false },
      { id: sid(CODE,5), textFR: '**En cas d\'aucune réponse ou d\'urgence immédiate :** composer le 9-1-1 — s\'identifier à l\'interlocuteur, décrire brièvement la situation et indiquer l\'adresse complète du bâtiment ainsi que l\'étage approximatif où la cabine est bloquée — suivre attentivement les consignes des services d\'urgence jusqu\'à l\'arrivée des secours', textEN: '**In case of no response or immediate emergency:** dial 9-1-1 — identify yourself to the dispatcher, briefly describe the situation and indicate the complete building address and approximate floor where the cabin is stuck — carefully follow emergency services instructions until help arrives', isBold: true, isRed: true },
    ],
  }],
};