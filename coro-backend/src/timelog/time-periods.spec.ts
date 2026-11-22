import { ConflictException } from '@nestjs/common';
import { assertPeriodWritable, periodOf, recordCorrectionIfNeeded } from './time-periods';

const db = (closure: any) => ({ timePeriodClosure: { findUnique: jest.fn().mockResolvedValue(closure) } });

describe('M6-02 — clôture mensuelle des saisies de temps', () => {
  it('lit le mois d’une date civile (minuit UTC)', () => {
    expect(periodOf(new Date(Date.UTC(2026, 10, 1)))).toBe('2026-11');
    expect(periodOf(new Date(Date.UTC(2026, 9, 31)))).toBe('2026-10');
  });

  it('refuse une écriture dans un mois fermé', async () => {
    await expect(
      assertPeriodWritable(db({ reopenedAt: null }) as any, 'org', new Date(Date.UTC(2026, 9, 15))),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepte un mois ouvert, et signale un mois rouvert pour consigner la correction', async () => {
    await expect(assertPeriodWritable(db(null) as any, 'org', new Date())).resolves.toMatchObject({ previouslyClosed: false });
    const reopened = await assertPeriodWritable(
      db({ reopenedAt: new Date(), reopenReason: 'Oubli de saisie du 14' }) as any, 'org', new Date(Date.UTC(2026, 9, 15)),
    );
    expect(reopened).toEqual({ period: '2026-10', previouslyClosed: true, reopenReason: 'Oubli de saisie du 14' });
    const correction = { timeEntryCorrection: { create: jest.fn() } };
    await recordCorrectionIfNeeded(correction as any, reopened, {
      organizationId: 'org', entryType: 'TIMELOG', entryId: 'e1', action: 'UPDATE', actorUserId: 'u1',
    });
    expect(correction.timeEntryCorrection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ period: '2026-10', reason: 'Oubli de saisie du 14', action: 'UPDATE' }),
    });
  });

  it('ne consigne rien pour un mois jamais fermé', async () => {
    const correction = { timeEntryCorrection: { create: jest.fn() } };
    await recordCorrectionIfNeeded(correction as any, { period: '2026-11', previouslyClosed: false, reopenReason: null }, {
      organizationId: 'org', entryType: 'TASK', entryId: 'e1', action: 'CREATE', actorUserId: 'u1',
    });
    expect(correction.timeEntryCorrection.create).not.toHaveBeenCalled();
  });
});
