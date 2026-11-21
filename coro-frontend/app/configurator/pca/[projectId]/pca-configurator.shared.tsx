// Constantes et règles pures du configurateur PCA, extraites de page.tsx
// (audit M1-09 : fichier unique de plus de 3 000 lignes).
import type { ReactNode } from 'react';

export const SECTIONS = [
  { id: 1, label: 'Informations générales' },
  { id: 2, label: 'Gouvernance' },
  { id: 3, label: 'Appréciation du risque' },
  { id: 4, label: 'Bilan d\'impact (BIA)' },
  { id: 5, label: 'Stratégies de continuité' },
  { id: 6, label: 'Communication de crise' },
  { id: 7, label: 'Activation et reprise' },
  { id: 8, label: 'Exercices et maintien' },
];

export const RISK_SCENARIOS = [
  { id: 'sinistre', label: 'Sinistre bâtiment (incendie, inondation, séisme)' },
  { id: 'meteo', label: 'Événement météorologique extrême (verglas, tempête, canicule)' },
  { id: 'cyber', label: 'Cyberattaque / panne informatique majeure' },
  { id: 'pandemie', label: 'Pandémie / absentéisme massif' },
  { id: 'electrique', label: 'Panne électrique prolongée' },
  { id: 'fournisseur', label: 'Perte d\'un fournisseur critique' },
  { id: 'personnel', label: 'Perte d\'un employé clé' },
  { id: 'approvisionnement', label: 'Interruption chaîne d\'approvisionnement' },
  { id: 'autre', label: 'Autre' },
];

export const REGULATORY_REQS = [
  'ISO 22301', 'BOMA BEST', 'AMF', 'OCRCVM', 'LEED', 'SQF', 'AS9100', 'IATF 16949', 'Autre',
];

export const SECTORS = [
  'Manufacturier', 'Services professionnels', 'Santé', 'Finance et assurances',
  'Commerce de détail', 'Construction', 'Transport et logistique',
  'Technologies de l\'information', 'Gouvernement et secteur public',
  'Éducation', 'Hôtellerie et restauration', 'Autre',
];

export const inputStyle = {
  border: '1px solid #CED4DA', color: '#2C3E50',
  backgroundColor: '#FFFFFF', width: '100%',
};

export const Label = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
    {children} {required && <span style={{ color: '#C0392B' }}>*</span>}
  </label>
);

export const TIME_TO_HOURS: Record<string, number> = {
  '1h': 1,
  '2h': 2,
  '4h': 4,
  '8h': 8,
  '24h': 24,
  '48h': 48,
  '72h': 72,
  '1sem': 168,
  '2sem': 336,
  '1mois': 720,
  'plus': 9999,
};

export const IMPACT_LEVEL: Record<string, number> = {
  'NEGLIGEABLE': 1,
  'FAIBLE': 2,
  'MODERE': 3,
  'ELEVE': 4,
  'CRITIQUE': 5,
};

export const getBiaWarnings = (service: any) => {
  const warnings: {
    level: 'critical' | 'warning' | 'info';
    message: string;
  }[] = [];

  const rtoHours = TIME_TO_HOURS[service.rto];
  const madHours = TIME_TO_HOURS[service.mad];

  // 1. RTO supérieur au MAD
  if (
    rtoHours &&
    madHours &&
    rtoHours > madHours
  ) {
    warnings.push({
      level: 'critical',
      message:
        'Le RTO est supérieur au MAD. L’activité serait rétablie après la limite maximale d’interruption tolérable.',
    });
  }

  // 2. Impact critique atteint avant le RTO
  const timeImpacts = [
    { field: 'impact4h', hours: 4, label: '4 heures' },
    { field: 'impact24h', hours: 24, label: '24 heures' },
    { field: 'impact72h', hours: 72, label: '72 heures' },
    { field: 'impact7d', hours: 168, label: '7 jours' },
  ];

  const firstCriticalImpact = timeImpacts.find(
    item => service[item.field] === 'CRITIQUE'
  );

  if (
    firstCriticalImpact &&
    rtoHours &&
    rtoHours > firstCriticalImpact.hours
  ) {
    warnings.push({
      level: 'critical',
      message:
        `Les impacts deviennent critiques après ${firstCriticalImpact.label}, mais le RTO est fixé au-delà de ce seuil.`,
    });
  }

  // 3. Priorité faible malgré des impacts élevés ou critiques rapidement
  const earlyHighImpact =
    IMPACT_LEVEL[service.impact4h] >= 4 ||
    IMPACT_LEVEL[service.impact24h] >= 5;

  if (
    earlyHighImpact &&
    ['MOYENNE', 'FAIBLE', ''].includes(service.recoveryPriority || '')
  ) {
    warnings.push({
      level: 'warning',
      message:
        'Les impacts deviennent élevés ou critiques rapidement, mais la priorité de reprise semble faible.',
    });
  }

  // 4. MAD court avec priorité faible
  if (
    madHours &&
    madHours <= 24 &&
    ['MOYENNE', 'FAIBLE', ''].includes(service.recoveryPriority || '')
  ) {
    warnings.push({
      level: 'warning',
      message:
        'Le MAD est de 24 heures ou moins. Une priorité de reprise plus élevée devrait être évaluée.',
    });
  }

  // 5. Mode dégradé plus long que le MAD
  const degradedHours =
    service.degradedModeDuration === 'indefini'
      ? null
      : TIME_TO_HOURS[service.degradedModeDuration];

  if (
    degradedHours &&
    madHours &&
    degradedHours > madHours
  ) {
    warnings.push({
      level: 'warning',
      message:
        'La durée soutenable déclarée du mode dégradé dépasse le MAD. Vérifiez la cohérence entre ces deux paramètres.',
    });
  }

  // 6. Dépendances non documentées
  const hasDependencies =
    (service.internalDependencies || '').trim() ||
    (service.externalDependencies || '').trim() ||
    (service.singlePointsOfFailure || '').trim() ||
    (service.recoveryPrerequisites || '').trim();

  if (!hasDependencies) {
    warnings.push({
      level: 'info',
      message:
        'Aucune dépendance critique ni aucun prérequis de reprise n’est documenté pour cette activité.',
    });
  }

  // 7. Ressources minimales non documentées
  const hasMinimumResources =
    (service.resourcePersonnel || '').trim() ||
    (service.resourceIT || '').trim() ||
    (service.resourceEquipment || '').trim() ||
    (service.resourceSuppliers || '').trim() ||
    (service.resourceSite || '').trim() ||
    (service.resourceEnergy || '').trim();

  if (!hasMinimumResources) {
    warnings.push({
      level: 'info',
      message:
        'Aucune ressource minimale nécessaire à la reprise n’est documentée.',
    });
  }

    return warnings;
};
