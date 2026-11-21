/**
 * Contrôle de complétude bloquant avant soumission (audit M1-08).
 *
 * Champs sans lesquels un PMU/PSI n'est pas opposable : responsable du plan,
 * classification du bâtiment, lieux de commandement et de rassemblement,
 * lieu de conservation. Le score de complétude reste indicatif ; cette
 * liste, elle, bloque la soumission.
 */
export interface MissingPlanField {
  key: string;
  label: string;
}

const REQUIRED: Array<{ key: string; label: string; ok: (c: any) => boolean }> = [
  { key: 'province', label: 'Province', ok: (c) => filled(c.province) },
  { key: 'responsableNom', label: 'Nom du responsable du plan', ok: (c) => filled(c.responsableNom) },
  { key: 'dateReleve', label: 'Date du relevé technique', ok: (c) => filled(c.dateReleve) },
  { key: 'buildingType', label: 'Type de bâtiment', ok: (c) => filled(c.buildingType) },
  { key: 'usagePrincipal', label: 'Usage principal (classification)', ok: (c) => filled(c.usagePrincipal) },
  { key: 'floors', label: "Nombre d'étages", ok: (c) => Number(c.floors) > 0 },
  { key: 'posteCommandement', label: 'Poste de commandement (lieu)', ok: (c) => filled(c.posteCommandement) },
  { key: 'pointRassemblement', label: 'Point de rassemblement principal (lieu)', ok: (c) => filled(c.pointRassemblement) },
  { key: 'lieuDocument', label: 'Lieu où est conservé le document', ok: (c) => filled(c.lieuDocument) },
];

function filled(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null && value !== '';
}

export function missingRequiredPlanFields(config: unknown): MissingPlanField[] {
  const c = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  return REQUIRED.filter((field) => !field.ok(c)).map(({ key, label }) => ({ key, label }));
}

/** Les PCA ont leur propre configurateur ; le contrôle vise PMU et PSI. */
export function planRequiresConfiguratorCompleteness(documentType: string): boolean {
  return documentType === 'PMU' || documentType === 'PSI';
}
