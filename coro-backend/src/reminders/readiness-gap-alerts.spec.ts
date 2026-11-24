import { RemindersService } from './reminders.service';

describe('Alertes « Lacune opérationnelle » : seulement si occupé, une fois par jour', () => {
  function harness(opts: { occupants: number; alreadyToday: boolean }) {
    const created: any[] = [];
    const prisma: any = {
      building: { findMany: jest.fn(async () => [{ id: 'b1', name: 'Tour A', organizationId: 'o1', clientId: 'c1' }]) },
      buildingEmployee: { findMany: jest.fn(async () => [{ id: 'e1', emergencyRoles: [{ role: 'COORDINATOR' }] }]) },
      occupancyRecord: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => opts.occupants),
      },
      notification: {
        findFirst: jest.fn(async () => (opts.alreadyToday ? { id: 'n0' } : null)),
        create: jest.fn(async (args: any) => void created.push(args.data)),
      },
      clientUser: { findMany: jest.fn(async () => [{ id: 'cu', email: 'x@example.test', firstName: 'A', lastName: 'B' }]) },
      user: { findMany: jest.fn(async () => [{ id: 'admin1' }]) },
    };
    const service = new RemindersService(prisma, {} as any, { evaluate: jest.fn(async () => ({ allowed: false })) } as any);
    (service as any).sendGapAlertEmail = jest.fn(async () => undefined);
    return { service, created, prisma };
  }

  it('ne crée rien quand le bâtiment est vide (nuit, fin de semaine)', async () => {
    const h = harness({ occupants: 0, alreadyToday: false });
    await h.service.checkReadinessGaps();
    expect(h.created).toHaveLength(0);
    expect((h.service as any).sendGapAlertEmail).not.toHaveBeenCalled();
  });

  it('alerte une fois, avec un lien vers le bâtiment et sans identifiant dans le texte', async () => {
    const h = harness({ occupants: 4, alreadyToday: false });
    await h.service.checkReadinessGaps();
    expect(h.created).toHaveLength(1);
    expect(h.created[0]).toMatchObject({ userId: 'admin1', type: 'LACUNE_RESILIENCE', link: '/buildings/b1' });
    expect(h.created[0].message).not.toContain('b1');
  });

  it('ne répète pas une alerte déjà envoyée aujourd’hui', async () => {
    const h = harness({ occupants: 4, alreadyToday: true });
    await h.service.checkReadinessGaps();
    expect(h.created).toHaveLength(0);
  });
});
