import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P116';
export const P116_EXPOSITION_AMMONIAC_OCC: ProcedureTemplate = {
  id: 'p116_exposition_ammoniac_occ', code: CODE,
  titleFR: 'EXPOSITION À L\'AMMONIAC — OCCUPANTS',
  titleEN: 'AMMONIA EXPOSURE — OCCUPANTS',
  icon: '🧪', headerColor: COLORS.purple,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.purple,
    steps: [
      { id: sid(CODE,1), textFR: '**Inhalation :** amener immédiatement la personne à l\'air frais — desserrer les vêtements pour faciliter la respiration', textEN: '**Inhalation:** immediately bring the person to fresh air — loosen clothing to facilitate breathing', isBold: true, isRed: true },
      { id: sid(CODE,2), textFR: 'Surveiller attentivement les symptômes (difficulté à respirer, toux, douleur thoracique, irritation des yeux) — en cas de détresse respiratoire, appeler immédiatement le 9-1-1', textEN: 'Carefully monitor symptoms (difficulty breathing, cough, chest pain, eye irritation) — in case of respiratory distress, immediately call 9-1-1', isBold: false },
      { id: sid(CODE,3), textFR: 'Placer la victime en position assise ou semi-assise pour faciliter la respiration', textEN: 'Place the victim in a sitting or semi-sitting position to facilitate breathing', isBold: false },
      { id: sid(CODE,4), textFR: '**Contact cutané :** retirer sans délai les vêtements contaminés — rincer la peau à l\'eau propre et courante pendant au moins 15 minutes — ne pas utiliser de savon abrasif, ni produit chimique — consulter un médecin si des rougeurs ou des douleurs persistent après le rinçage', textEN: '**Skin contact:** immediately remove contaminated clothing — rinse skin with clean running water for at least 15 minutes — do not use abrasive soap or chemical products — consult a doctor if redness or pain persists after rinsing', isBold: true, isRed: true },
      { id: sid(CODE,5), textFR: '**Contact oculaire :** rincer immédiatement avec de l\'eau tiède et propre pendant 15 à 20 minutes, en maintenant les paupières ouvertes — ne pas frotter les yeux — consulter rapidement un médecin ou se rendre aux urgences, même si les symptômes s\'atténuent', textEN: '**Eye contact:** immediately rinse with warm clean water for 15 to 20 minutes, keeping eyelids open — do not rub eyes — quickly consult a doctor or go to the emergency room, even if symptoms subside', isBold: true, isRed: true },
      { id: sid(CODE,6), textFR: '**Ingestion :** ne jamais provoquer le vomissement — demander à la victime de rincer sa bouche avec de l\'eau propre sans avaler', textEN: '**Ingestion:** never induce vomiting — ask the victim to rinse their mouth with clean water without swallowing', isBold: true, isRed: true },
      { id: sid(CODE,7), textFR: 'Appeler immédiatement le centre antipoison au 1-800-463-5060 (au Québec) ou composer le 9-1-1 — suivre attentivement les instructions des spécialistes', textEN: 'Immediately call the Poison Control Centre at 1-800-463-5060 (in Quebec) or dial 9-1-1 — carefully follow specialist instructions', isBold: false, isRed: true },
      { id: sid(CODE,8), textFR: 'Contacter sans délai les services d\'urgence (9-1-1) si l\'exposition semble modérée à sévère (détresse respiratoire, brûlures graves, ingestion) — fournir les informations précises : nature du produit (ammoniac), durée d\'exposition, symptômes observés, nombre de victimes', textEN: 'Immediately contact emergency services (9-1-1) if exposure seems moderate to severe (respiratory distress, severe burns, ingestion) — provide precise information: product nature (ammonia), exposure duration, observed symptoms, number of victims', isBold: false },
      { id: sid(CODE,9), textFR: 'Ne pas fumer et ne pas utiliser d\'appareils électriques (téléphone, radio, cellulaire) à proximité du site d\'exposition — ces appareils peuvent produire des étincelles dangereuses en présence de vapeurs d\'ammoniac', textEN: 'Do not smoke and do not use electrical devices (telephone, radio, cell phone) near the exposure site — these devices can produce dangerous sparks in the presence of ammonia vapors', isBold: false, isRed: true },
      { id: sid(CODE,10), textFR: 'Attendre toujours l\'autorisation des autorités avant de réintégrer le bâtiment — participer au bilan post-incident pour améliorer les mesures de prévention et la sécurité du personnel', textEN: 'Always wait for authority authorization before re-entering the building — participate in the post-incident debrief to improve prevention measures and personnel safety', isBold: false },
    ],
  }],
};