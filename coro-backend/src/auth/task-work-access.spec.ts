import { ForbiddenException } from '@nestjs/common';
import { lockProjectForTaskWork } from './project-access';

const operator = { userId: 'u2', organizationId: 'o1', role: 'OPERATOR' };

function tx(task: any, user: any = { email: 'u2@example.com', planningCoordinator: false }) {
  return {
    project: {
      findFirst: jest
        .fn()
        // 1) accès propriétaire : non
        .mockResolvedValueOnce(null)
        // 2) état du projet après verrou
        .mockResolvedValue({ status: 'VALIDATED', isActive: true }),
    },
    user: { findFirst: jest.fn().mockResolvedValue(user) },
    projectTask: { findFirst: jest.fn().mockResolvedValue(task) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as any;
}

describe('Travail sur une tâche par un conseiller affecté', () => {
  it('autorise le conseiller affecté à l’activité par réservation', async () => {
    const db = tx({ assigneeId: null, assignees: [], activity: { assigneeEmail: null, bookings: [{ id: 'b1' }] } });
    await expect(lockProjectForTaskWork(db, 'p1', 't1', operator)).resolves.toBeUndefined();
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it('autorise l’ancienne affectation par courriel', async () => {
    const db = tx({ assigneeId: null, assignees: [], activity: { assigneeEmail: 'U2@example.com ', bookings: [] } });
    await expect(lockProjectForTaskWork(db, 'p1', 't1', operator)).resolves.toBeUndefined();
  });

  it('refuse un conseiller sans lien avec l’activité', async () => {
    const db = tx({ assigneeId: 'other', assignees: [], activity: { assigneeEmail: null, bookings: [] } });
    await expect(lockProjectForTaskWork(db, 'p1', 't1', operator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('autorise le coordonnateur de planification', async () => {
    const db = tx(
      { assigneeId: null, assignees: [], activity: null },
      { email: 'u2@example.com', planningCoordinator: true },
    );
    await expect(lockProjectForTaskWork(db, 'p1', 't1', operator)).resolves.toBeUndefined();
  });
});
