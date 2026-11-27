import { deliveryDays, loadMandateRules } from './mandate-rules';

// Types d'activité qui font démarrer le délai de livraison du mandat une fois réalisés.
export const SURVEY_ACTIVITY_CODES = new Set(['releve_technique']);
export const INSPECTION_ACTIVITY_CODES = new Set(['inspection_securite_physique', 'inspection_code']);

export type DelayKind = 'SURVEY' | 'INSPECTION';

export function delayKindForActivityCode(code: string | null | undefined): DelayKind | null {
  if (!code) return null;
  if (SURVEY_ACTIVITY_CODES.has(code)) return 'SURVEY';
  if (INSPECTION_ACTIVITY_CODES.has(code)) return 'INSPECTION';
  return null;
}

/**
 * Démarre le délai du mandat (forfaitaire, pas encore démarré) à la date de réalisation :
 * - relevé technique : délai du document (court/long selon les heures, ou plan d'évacuation) ;
 * - inspection : délai de remise du rapport d'inspection.
 * La date de départ est celle de l'activité si elle est passée, sinon aujourd'hui.
 */
export async function startMandateDelay(
  db: any,
  projectId: string,
  organizationId: string,
  kind: DelayKind,
  realizedAt?: Date | null,
): Promise<{ dateDebutDelai: Date; dateLimite: Date; delaiJours: number } | null> {
  const mandate = await db.projectMandate.findFirst({
    where: { projectId, organizationId },
    select: { typeMandat: true, dateDebutDelai: true, heuresBudgetees: true, typeDelai: true },
  });
  if (!mandate || mandate.typeMandat !== 'FORFAITAIRE' || mandate.dateDebutDelai) return null;
  const rules = await loadMandateRules(db, organizationId);
  const delaiJours =
    kind === 'INSPECTION' || mandate.typeDelai === 'INSPECTION'
      ? rules.inspectionReportDeliveryDays
      : deliveryDays(rules, mandate.typeDelai, mandate.heuresBudgetees || 0);
  const now = new Date();
  const dateDebutDelai = realizedAt && realizedAt.getTime() < now.getTime() ? new Date(realizedAt) : now;
  const dateLimite = new Date(dateDebutDelai);
  dateLimite.setDate(dateLimite.getDate() + delaiJours);
  await db.projectMandate.update({
    where: { projectId },
    data: { dateDebutDelai, dateLimite, delaiJours },
  });
  return { dateDebutDelai, dateLimite, delaiJours };
}
