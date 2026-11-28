/**
 * Libellés des règles d'activation automatique des procédures
 * (bibliothèque et éditeur). Jamais de clé technique affichée à l'écran.
 */
const LABELS: Record<string, { fr: string; en: string }> = {
  always: { fr: 'Toujours actif', en: 'Always active' },
  double_signal: { fr: 'Double signal', en: 'Two-stage alarm' },
  has_gas: { fr: 'Gaz naturel', en: 'Natural gas' },
  has_ammonia: { fr: 'Ammoniac', en: 'Ammonia' },
  has_sprinklers: { fr: 'Gicleurs', en: 'Sprinklers' },
  has_elevators: { fr: 'Ascenseurs', en: 'Elevators' },
  has_hazmat: { fr: 'Mat. dangereuses', en: 'Hazmat' },
  has_lithium: { fr: 'Batteries lithium-ion', en: 'Lithium-ion batteries' },
  has_pool: { fr: 'Piscine', en: 'Pool' },
  has_kitchen: { fr: 'Cuisine commerciale', en: 'Commercial kitchen' },
  has_oxygen_detection: { fr: 'Détection d’oxygène', en: 'Oxygen detection' },
  has_co2_detection: { fr: 'Détection de CO₂', en: 'CO₂ detection' },
  boma_certified: { fr: 'BOMA', en: 'BOMA' },
  manual: { fr: 'Ajout manuel', en: 'Manual' },
  is_industrial: { fr: 'Industriel', en: 'Industrial' },
  industrial_with_double_signal: { fr: 'Industriel · double signal', en: 'Industrial · two-stage alarm' },
  industrial_with_gas: { fr: 'Industriel · gaz naturel', en: 'Industrial · natural gas' },
  industrial_with_ammonia: { fr: 'Industriel · ammoniac', en: 'Industrial · ammonia' },
  industrial_with_hazmat: { fr: 'Industriel · mat. dangereuses', en: 'Industrial · hazmat' },
  industrial_with_sprinklers: { fr: 'Industriel · gicleurs', en: 'Industrial · sprinklers' },
};

export function activationLabel(rule: string | null | undefined, language: 'fr' | 'en' = 'fr'): string {
  const entry = rule ? LABELS[rule] : undefined;
  if (entry) return entry[language];
  return language === 'fr' ? 'Conditionnel' : 'Conditional';
}
