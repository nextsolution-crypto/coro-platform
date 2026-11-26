/**
 * Libellés affichés dans le PCA pour les valeurs des listes du configurateur.
 * Le configurateur enregistre des codes (« heures_bureau », « 1sem », « moins_1k »…) ;
 * le document doit montrer le libellé, en français ou en anglais.
 * Les valeurs saisies en clair en français (« Oui », « Annuel », secteurs…) sont
 * traduites pour le document anglais.
 */
const LABELS: Record<string, [string, string]> = {
  // Heures d'opération
  '24/7': ['24 h/7 j — opération continue', '24/7 — continuous operation'],
  heures_bureau: ['Heures de bureau (lundi au vendredi, 8 h à 17 h)', 'Business hours (Monday to Friday, 8 a.m. to 5 p.m.)'],
  heures_etendues: ['Heures étendues (lundi au vendredi, 7 h à 20 h)', 'Extended hours (Monday to Friday, 7 a.m. to 8 p.m.)'],
  semaine_weekend: ['Semaine et fin de semaine', 'Weekdays and weekends'],
  autre: ['Autre', 'Other'],

  // Durées (RTO, RPO, MAD, tolérances, délais)
  '0': ['Aucune perte de données (RPO = 0)', 'No data loss (RPO = 0)'],
  '1h': ['1 heure', '1 hour'],
  '2h': ['2 heures', '2 hours'],
  '4h': ['4 heures', '4 hours'],
  '8h': ['8 heures', '8 hours'],
  '24h': ['24 heures', '24 hours'],
  '48h': ['48 heures', '48 hours'],
  '72h': ['72 heures', '72 hours'],
  '1sem': ['1 semaine', '1 week'],
  '2sem': ['2 semaines', '2 weeks'],
  '1mois': ['1 mois', '1 month'],
  '3mois': ['3 mois', '3 months'],
  '6mois': ['6 mois', '6 months'],
  plus: ["Plus d'une semaine", 'More than one week'],
  indefini: ['Indéfini / selon la situation', 'Indefinite / depending on the situation'],
  immediate: ['Immédiat (contrat en place)', 'Immediate (contract in place)'],

  // Impact financier par jour
  moins_1k: ['Moins de 1 000 $', 'Less than $1,000'],
  '1k_10k': ['1 000 $ à 10 000 $', '$1,000 to $10,000'],
  '10k_50k': ['10 000 $ à 50 000 $', '$10,000 to $50,000'],
  '50k_100k': ['50 000 $ à 100 000 $', '$50,000 to $100,000'],
  '100k_500k': ['100 000 $ à 500 000 $', '$100,000 to $500,000'],
  plus_500k: ['Plus de 500 000 $', 'More than $500,000'],

  // Niveaux d'impact
  NEGLIGEABLE: ['Négligeable', 'Negligible'],
  FAIBLE: ['Faible', 'Low'],
  MOYEN: ['Modéré', 'Moderate'],
  MODERE: ['Modéré', 'Moderate'],
  ELEVE: ['Élevé', 'High'],
  CRITIQUE: ['Critique', 'Critical'],

  // Fréquence des sauvegardes
  temps_reel: ['Temps réel (continu)', 'Real time (continuous)'],
  horaire: ['Toutes les heures', 'Hourly'],
  quotidien: ['Quotidienne', 'Daily'],
  hebdo: ['Hebdomadaire', 'Weekly'],

  // Canaux de communication
  courriel: ['Courriel', 'Email'],
  sms: ['SMS / texto', 'SMS / text message'],
  telephone: ['Téléphone', 'Telephone'],
  teams: ['Microsoft Teams', 'Microsoft Teams'],
  slack: ['Slack', 'Slack'],
  application: ['Application dédiée', 'Dedicated application'],
  site_web: ['Site web', 'Website'],
  medias_sociaux: ['Médias sociaux', 'Social media'],
  communique: ['Communiqué de presse', 'Press release'],
  courriel_clients: ['Courriel aux clients', 'Email to clients'],
  multiple: ['Plusieurs canaux', 'Multiple channels'],

  // Valeurs saisies en français (traduites pour le document anglais)
  Oui: ['Oui', 'Yes'],
  Non: ['Non', 'No'],
  Partiel: ['Partiel', 'Partial'],
  Annuel: ['Annuel', 'Annual'],
  'Tous les 2 ans': ['Tous les 2 ans', 'Every 2 years'],
  'Tous les 3 ans': ['Tous les 3 ans', 'Every 3 years'],
  'Sur demande': ['Sur demande', 'On request'],
  'Non prévu': ['Non prévu', 'Not planned'],
  Semestriel: ['Semestriel', 'Semi-annual'],
  'Lors de changements significatifs': ['Lors de changements significatifs', 'When significant changes occur'],
  Manufacturier: ['Manufacturier', 'Manufacturing'],
  'Services professionnels': ['Services professionnels', 'Professional services'],
  Santé: ['Santé', 'Health care'],
  'Finance et assurances': ['Finance et assurances', 'Finance and insurance'],
  'Commerce de détail': ['Commerce de détail', 'Retail'],
  Construction: ['Construction', 'Construction'],
  'Transport et logistique': ['Transport et logistique', 'Transportation and logistics'],
  "Technologies de l'information": ["Technologies de l'information", 'Information technology'],
  'Gouvernement et secteur public': ['Gouvernement et secteur public', 'Government and public sector'],
  Éducation: ['Éducation', 'Education'],
  'Hôtellerie et restauration': ['Hôtellerie et restauration', 'Hospitality and food services'],
  Autre: ['Autre', 'Other'],
};

/** Libellé à afficher pour une valeur du configurateur PCA ; texte libre inchangé. */
export function pcaOption(value: unknown, lang: 'fr' | 'en'): string {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value);
  const label = LABELS[text];
  return label ? label[lang === 'en' ? 1 : 0] : text;
}
