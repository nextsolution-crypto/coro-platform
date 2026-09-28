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
