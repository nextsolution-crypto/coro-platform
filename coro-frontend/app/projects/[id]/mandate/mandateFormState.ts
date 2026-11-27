export type MandateForm = {
  description: string;
  montantVendu: string;
  tauxHoraire: string;
  heuresBudgetees: string;
  lienDrive: string;
  ownerId: string;
  typeMandat: string;
  typeDelai: string;
  dateDebutDelai: string;
  alerteActive: boolean;
};

export const emptyMandateForm: MandateForm = {
  description: '', montantVendu: '', tauxHoraire: '', heuresBudgetees: '', lienDrive: '',
  ownerId: '', typeMandat: '', typeDelai: 'STANDARD', dateDebutDelai: '', alerteActive: true,
};

export function mandateFormFromServer(value: any): MandateForm {
  return {
    description: value?.description ?? '',
    montantVendu: value?.montantVendu == null ? '' : String(value.montantVendu),
    tauxHoraire: value?.tauxHoraire == null ? '' : String(value.tauxHoraire),
    heuresBudgetees: value?.heuresBudgetees == null ? '' : String(value.heuresBudgetees),
    lienDrive: value?.lienDrive ?? '', ownerId: value?.ownerId ?? '', typeMandat: value?.typeMandat ?? '',
    typeDelai: value?.typeDelai ?? 'STANDARD',
    dateDebutDelai: value?.dateDebutDelai ? new Date(value.dateDebutDelai).toISOString().slice(0, 10) : '',
    alerteActive: value?.alerteActive !== false,
  };
}

const nullableText = (value: unknown) => String(value ?? '').trim();
const nullableNumber = (value: unknown) => {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : String(value).trim();
};

export function normalizedMandateForm(value: MandateForm) {
  return {
    description: nullableText(value.description), montantVendu: nullableNumber(value.montantVendu),
    tauxHoraire: nullableNumber(value.tauxHoraire), heuresBudgetees: nullableNumber(value.heuresBudgetees),
    lienDrive: nullableText(value.lienDrive), ownerId: nullableText(value.ownerId),
    typeMandat: nullableText(value.typeMandat), typeDelai: nullableText(value.typeDelai) || 'STANDARD',
    dateDebutDelai: nullableText(value.dateDebutDelai), alerteActive: Boolean(value.alerteActive),
  };
}

export const mandateFieldsAreEqual = (a: MandateForm, b: MandateForm) =>
  JSON.stringify(normalizedMandateForm(a)) === JSON.stringify(normalizedMandateForm(b));

// Règles des mandats de l'organisation (Paramètres > Organisation). Valeurs par défaut CORO.
export type MandateRules = {
  mandateTargetMarginPercent: number;
  mandateLongThresholdHours: number;
  mandateShortDeliveryDays: number;
  mandateLongDeliveryDays: number;
  evacuationPlanDeliveryDays: number;
};
export const DEFAULT_MANDATE_RULES: MandateRules = {
  mandateTargetMarginPercent: 50,
  mandateLongThresholdHours: 80,
  mandateShortDeliveryDays: 21,
  mandateLongDeliveryDays: 90,
  evacuationPlanDeliveryDays: 10,
};

// La part (100 % − marge visée) du montant vendu paie le temps des conseillers au taux facturé.
export function heuresBudgeteesSuggerees(montantVendu: string, tauxHoraire: string,
  margePercent = DEFAULT_MANDATE_RULES.mandateTargetMarginPercent): string | null {
  const montant = parseFloat(montantVendu);
  const taux = parseFloat(tauxHoraire);
  if (!(montant > 0) || !(taux > 0)) return null;
  // Arrondi à la demi-heure, comme le pas du champ.
  return String(Math.round((montant * (1 - margePercent / 100) / taux) * 2) / 2);
}

export function deliveryDaysLabel(rules: MandateRules, typeDelai: string, heures: number): string {
  const days = typeDelai === 'EVACUATION' ? rules.evacuationPlanDeliveryDays
    : heures >= rules.mandateLongThresholdHours ? rules.mandateLongDeliveryDays : rules.mandateShortDeliveryDays;
  return `${days} jours max`;
}
