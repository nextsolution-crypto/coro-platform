import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Période AAAA-MM d'une saisie. Les dates de saisie sont des dates civiles
 * stockées à minuit UTC : on lit donc le mois en UTC.
 */
export function periodOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function assertPeriodFormat(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? ''))
    throw new BadRequestException('Période invalide (AAAA-MM attendu).');
}

type ClosureDb = {
  timePeriodClosure: { findUnique: (args: any) => Promise<any> };
};

/**
 * M6-02 : refuse toute écriture dans un mois fermé. Indique si le mois a déjà
 * été fermé puis rouvert, auquel cas l'écriture doit être consignée.
 */
export async function assertPeriodWritable(
  db: ClosureDb,
  organizationId: string,
  date: Date,
): Promise<{ period: string; previouslyClosed: boolean; reopenReason: string | null }> {
  const period = periodOf(date);
  const closure = await db.timePeriodClosure.findUnique({
    where: { organizationId_period: { organizationId, period } },
  });
  if (closure && !closure.reopenedAt)
    throw new ConflictException(
      `La période ${period} est fermée. Un administrateur doit la rouvrir, avec un motif, pour la corriger.`,
    );
  return { period, previouslyClosed: Boolean(closure), reopenReason: closure?.reopenReason ?? null };
}

type CorrectionDb = { timeEntryCorrection: { create: (args: any) => Promise<any> } };

export async function recordCorrectionIfNeeded(
  db: CorrectionDb,
  check: { period: string; previouslyClosed: boolean; reopenReason: string | null },
  data: {
    organizationId: string;
    entryType: 'TIMELOG' | 'TASK';
    entryId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    before?: unknown;
    after?: unknown;
    actorUserId: string;
  },
) {
  if (!check.previouslyClosed) return;
  await db.timeEntryCorrection.create({
    data: {
      ...data,
      period: check.period,
      reason: check.reopenReason,
      before: (data.before ?? undefined) as any,
      after: (data.after ?? undefined) as any,
    },
  });
}
