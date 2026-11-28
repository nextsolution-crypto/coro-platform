/**
 * Ordre par défaut des modules dans les documents CORO.
 *
 * PMU et PSI suivent l'ordre opérationnel CORO : la question que se pose la personne qui
 * ouvre le cartable en urgence. Qui j'appelle (2) → où je suis (plans, 6) → qui fait quoi
 * (rôles, 3) → quoi faire (procédures, 4) → détails techniques (description du site, 7) →
 * cadre du plan (introduction, 1) → registres et annexes (8).
 * Les modules sont renumérotés dans cet ordre dans le PDF et la table des matières.
 * Le PCA garde son ordre méthodologique.
 */
export const OPERATIONAL_MODULE_ORDER = [2, 6, 3, 4, 7, 1, 8] as const;
export const PCA_MODULE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function defaultModuleOrder(documentType?: string | null): number[] {
  if (documentType === 'PCA') return [...PCA_MODULE_ORDER];
  if (documentType === 'PSI') return OPERATIONAL_MODULE_ORDER.filter((n) => n !== 3);
  return [...OPERATIONAL_MODULE_ORDER];
}
