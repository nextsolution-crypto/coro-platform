import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P122';
export const P122_DEVERSEMENT_MATDANG_OCC: ProcedureTemplate = {
  id: 'p122_deversement_matdang_occ', code: CODE,
  titleFR: 'DÉVERSEMENT DE MATIÈRES DANGEREUSES — OCCUPANTS',
  titleEN: 'HAZARDOUS MATERIALS SPILL — OCCUPANTS',
  icon: '⚠️', headerColor: COLORS.brown,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.brown,
    steps: [
      { id: sid(CODE,1), textFR: 'Éloigner immédiatement toutes les personnes de la zone affectée — éviter tout contact direct avec le produit déversé', textEN: 'Immediately move all persons away from the affected area — avoid any direct contact with the spilled product', isBold: false, isRed: true },
      { id: sid(CODE,2), textFR: 'Empêcher l\'accès à la zone à l\'aide de barrières physiques ou d\'une signalisation d\'urgence, si disponible', textEN: 'Prevent access to the area using physical barriers or emergency signage, if available', isBold: false },
      { id: sid(CODE,3), textFR: 'Informer sans délai le chef de bâtiment ou le technicien responsable — si le produit concerné est connu, communiquer cette information pour faciliter une réponse appropriée et sécuritaire', textEN: 'Immediately inform the building supervisor or responsible technician — if the involved product is known, communicate this information to facilitate an appropriate and safe response', isBold: false },
      { id: sid(CODE,4), textFR: 'Identifier les risques associés au produit : se référer à la fiche de données de sécurité (FDS) pour connaître les propriétés du produit, ses dangers potentiels (toxicité, inflammabilité, réactivité) et les précautions à adopter — porter les équipements de protection individuelle (ÉPI) recommandés par la FDS avant toute intervention', textEN: 'Identify product-related risks: refer to the safety data sheet (SDS) to know the product\'s properties, potential hazards (toxicity, flammability, reactivity) and precautions — wear personal protective equipment (PPE) recommended by the SDS before any intervention', isBold: false },
      { id: sid(CODE,5), textFR: 'Évaluer la gravité du déversement :',textEN: 'Assess the severity of the spill:', isBold: false,
        subSteps: [
          { id: sid(CODE,6), textFR: 'Si le déversement est mineur (moins de 10 litres et non dangereux), utiliser la trousse de déversement pour contenir et nettoyer la matière', textEN: 'If the spill is minor (less than 10 litres and non-hazardous), use the spill kit to contain and clean the material', isList: true },
          { id: sid(CODE,7), textFR: 'Si le déversement est majeur (plus de 10 litres ou produit dangereux), évacuer immédiatement la zone, appeler le 9-1-1 et signaler la nature du produit impliqué', textEN: 'If the spill is major (more than 10 litres or hazardous product), immediately evacuate the area, call 9-1-1, and report the nature of the involved product', isList: true, isRed: true },
        ],
      },
      { id: sid(CODE,8), textFR: 'Utiliser la trousse de déversement uniquement si la situation est sécuritaire : porter les ÉPI recommandés (gants, masque, lunettes, etc.), puis confiner la matière à l\'aide d\'absorbants adaptés (chiffons, granules) — nettoyer la zone conformément aux instructions de la FDS et déposer les matériaux contaminés dans des contenants scellés identifiés pour leur élimination', textEN: 'Use the spill kit only if the situation is safe: wear recommended PPE (gloves, mask, goggles, etc.), then confine the material using appropriate absorbents (cloths, granules) — clean the area per SDS instructions and place contaminated materials in sealed identified containers for disposal', isBold: false },
      { id: sid(CODE,9), textFR: 'Si vous n\'êtes pas formé ou équipé pour intervenir, s\'éloigner et attendre les secours spécialisés', textEN: 'If not trained or equipped to intervene, move away and wait for specialized emergency services', isBold: false, isRed: true },
      { id: sid(CODE,10), textFR: '⚠️ S\'assurer de connaître l\'emplacement des trousses de déversement et des ÉPI dans son secteur — en cas de doute, ne pas intervenir et laisser les personnes qualifiées prendre en charge la situation — tous les occupants doivent être formés à reconnaître les matières dangereuses et à savoir qui contacter en cas de déversement', textEN: '⚠️ Ensure you know the location of spill kits and PPE in your sector — when in doubt, do not intervene and let qualified persons handle the situation — all occupants must be trained to recognize hazardous materials and know who to contact in case of a spill', isBold: false, isRed: true },
    ],
  }],
};