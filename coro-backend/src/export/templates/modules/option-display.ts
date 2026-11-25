// Valeurs des listes du configurateur enregistrées sans accents (« D - Etablissements
// d affaires », « Incombustible - Beton »…) : on les affiche correctement sans toucher
// aux valeurs stockées, sur lesquelles reposent les règles.
const OPTION_DISPLAY: Array<[RegExp, string]> = [
  [/^SIMPLE$/, 'Simple étape'],
  [/^DOUBLE$/, 'Double étape (alerte et alarme)'],
  [/^AUCUN$/, 'Aucun'],
  [/^Quebec$/, 'Québec'],
  [/\bEtablissements\b/g, 'Établissements'],
  [/\bEtablissement\b/g, 'Établissement'],
  [/\breunion\b/g, 'réunion'],
  [/\bdetention\b/g, 'détention'],
  [/\barena\b/g, 'aréna'],
  [/\bd (habitation|affaires|eau|urgence|equipement)\b/g, 'd’$1'],
  [/\btres eleves\b/g, 'très élevés'],
  [/\ba risques\b/g, 'à risques'],
  [/\bBeton\b/g, 'Béton'],
  [/\bCentralise\b/g, 'Centralisé'],
  [/\bDecentralise\b/g, 'Décentralisé'],
  [/\bcentralise\b/g, 'centralisé'],
  [/\bdecentralise\b/g, 'décentralisé'],
  [/\bElectrique\b/g, 'Électrique'],
  [/\bGeothermique\b/g, 'Géothermique'],
  [/\bCable\b/g, 'Câble'],
  [/\bPre-action\b/g, 'Préaction'],
  [/\bCreation initiale\b/g, 'Création initiale'],
  [/\bMise a jour\b/g, 'Mise à jour'],
  [/\bsuite a\b/g, 'suite à'],
  [/\brenovation\b/g, 'rénovation'],
  [/\bCiviere\b/g, 'Civière'],
  [/\bDefibrillateur\b/g, 'Défibrillateur'],
  [/\bOxygene medical\b/g, 'Oxygène médical'],
];

export function displayOption(value: string): string {
  return OPTION_DISPLAY.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
