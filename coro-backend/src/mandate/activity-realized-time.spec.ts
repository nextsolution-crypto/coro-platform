import { ConflictException } from '@nestjs/common';
import { MandateService } from './mandate.service';

function setup(existing = 0, tasks: any[] = [{ id: 't-op', categoryName: 'OPÉRATION', order: 1 }]) {
  const tx: any = {
    projectActivity: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'a1', label: 'Formation', customLabel: null, duration: '3h', customDuration: null,
        dureeHeures: 3, scheduledDate: new Date('2026-12-05T14:00:00Z'), status: 'planifie',
      }),
    },
    projectTask: {
      findMany: jest.fn().mockResolvedValue(tasks),
      create: jest.fn().mockResolvedValue({ id: 't-new', categoryName: 'OPÉRATION', order: 0 }),
    },
    project: {
      findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'o1', status: 'VALIDATED', isActive: true }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    taskTimeEntry: {
      count: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })),
    },
    timePeriodClosure: { findUnique: jest.fn().mockResolvedValue(null) },
    timeEntryCorrection: { create: jest.fn() },
  };
  const prisma: any = { $transaction: (fn: any) => fn(tx) };
  return { service: new MandateService(prisma), tx };
}

const actor: any = { userId: 'u1', organizationId: 'o1', role: 'ADMIN' };

describe('Temps d’une activité réalisée', () => {
  it('enregistre la durée de l’activité sur la tâche OPÉRATION, à la date de l’activité', async () => {
    const { service, tx } = setup();
    const result: any = await service.logActivityRealizedTime('p1', 'a1', actor, {});
    expect(tx.taskTimeEntry.create.mock.calls[0][0].data).toMatchObject({ taskId: 't-op', heures: 3, userId: 'u1' });
    expect(result.taskId).toBe('t-op');
  });

  it('crée une tâche « Réalisation » si l’activité n’a pas de tâche OPÉRATION', async () => {
    const { service, tx } = setup(0, []);
    await service.logActivityRealizedTime('p1', 'a1', actor, { heures: 2.5 });
    expect(tx.projectTask.create.mock.calls[0][0].data.taskTitle).toBe('Réalisation — Formation');
    expect(tx.taskTimeEntry.create.mock.calls[0][0].data.heures).toBe(2.5);
  });

  it('refuse un doublon le même jour', async () => {
    const { service, tx } = setup(1);
    await expect(service.logActivityRealizedTime('p1', 'a1', actor, {})).rejects.toBeInstanceOf(ConflictException);
    expect(tx.taskTimeEntry.create).not.toHaveBeenCalled();
  });
});
