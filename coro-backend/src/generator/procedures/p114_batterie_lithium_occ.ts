import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P114';
export const P114_BATTERIE_LITHIUM_OCC: ProcedureTemplate = {
  id: 'p114_batterie_lithium_occ', code: CODE,
  titleFR: 'FEU DE BATTERIE AU LITHIUM — OCCUPANTS',
  titleEN: 'LITHIUM BATTERY FIRE — OCCUPANTS',
  icon: '🔋', headerColor: COLORS.garnet,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.garnet,
    steps: [
      { id: sid(CODE,1), textFR: 'Être attentif aux signes précurseurs d\'une défaillance de batterie lithium : bruits inhabituels (sifflement, cliquetis, grésillement), chaleur excessive, odeur chimique ou de plastique brûlé, fumée blanche ou grisâtre, gonflement ou déformation de la batterie, fuite visible ou clignotement anormal sur le tableau de bord du chariot', textEN: 'Be alert to warning signs of lithium battery failure: unusual noises (hissing, clicking, crackling), excessive heat, chemical or burning plastic odor, white or gray smoke, swelling or deformation of the battery, visible leak, or abnormal dashboard blinking on the vehicle', isBold: false },
      { id: sid(CODE,2), textFR: '**Réagir immédiatement sans intervenir** — ne pas toucher la batterie ni au chariot', textEN: '**React immediately without intervening** — do not touch the battery or the vehicle', isBold: true, isRed: true },
      { id: sid(CODE,3), textFR: 'Avertir calmement les personnes à proximité de s\'éloigner', textEN: 'Calmly warn nearby persons to move away', isBold: false },
      { id: sid(CODE,4), textFR: 'Informer immédiatement le gestionnaire ou le coordonnateur d\'urgence', textEN: 'Immediately inform the manager or emergency coordinator', isBold: false },
      { id: sid(CODE,5), textFR: 'Si le chariot ou le palettier est en marche, l\'éteindre immédiatement et s\'éloigner sans délai', textEN: 'If the vehicle or racking system is in motion, immediately turn it off and move away without delay', isBold: false },
      { id: sid(CODE,6), textFR: 'Évacuer la zone et empêcher toute personne d\'y pénétrer', textEN: 'Evacuate the area and prevent any person from entering', isBold: false },
      { id: sid(CODE,7), textFR: 'Si l\'alarme incendie n\'est pas encore déclenchée, actionner une station manuelle pour avertir les secours', textEN: 'If the fire alarm has not yet activated, trigger a manual station to alert emergency services', isBold: false },
      { id: sid(CODE,8), textFR: 'Se diriger vers le point de rassemblement en suivant les consignes de l\'équipe d\'urgence', textEN: 'Proceed to the assembly point following emergency team instructions', isBold: false },
      { id: sid(CODE,9), textFR: '⚠️ Une batterie au lithium qui chauffe ou qui brûle émet des vapeurs hautement toxiques — seules les personnes formées et équipées d\'un appareil de protection respiratoire autonome (APRA) peuvent intervenir sur un feu de batterie au lithium', textEN: '⚠️ A lithium battery that heats up or burns emits highly toxic vapors — only persons trained and equipped with a self-contained breathing apparatus (SCBA) may intervene on a lithium battery fire', isBold: false, isRed: true },
      { id: sid(CODE,10), textFR: '**Prévention :** les éléments d\'une batterie endommagée peuvent surchauffer pendant plusieurs heures — un délai de 24 heures peut être nécessaire avant l\'extinction complète du feu — ne jamais réutiliser une batterie endommagée, tombée ou présentant des signes anormaux', textEN: '**Prevention:** damaged battery elements can overheat for several hours — a 24-hour delay may be necessary before complete fire extinction — never reuse a damaged, dropped, or abnormal battery', isBold: false },
    ],
  }],
};