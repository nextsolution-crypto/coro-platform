import { IncidentNotificationDispatcherService, purposeRank } from './incident-notification-dispatcher.service';

describe('envoi immédiat des notifications d’incident (M2-04)', () => {
  it('fait passer coordonnateur et équipe avant les occupants', () => {
    expect(purposeRank('COORDINATOR_ALERT')).toBeLessThan(purposeRank('MEMBER_ALERT'));
    expect(purposeRank('MEMBER_ALERT')).toBeLessThan(purposeRank('TASK_ESCALATION'));
    expect(purposeRank('TASK_ESCALATION')).toBeLessThan(purposeRank('OCCUPANT_ALERT'));
  });

  it('envoie tout de suite, en parallèle et par priorité, les envois en file de l’incident', async () => {
    const t = new Date('2026-11-21T12:00:00Z');
    const prisma = {
      incidentNotificationDelivery: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'occ-1', purpose: 'OCCUPANT_ALERT', createdAt: t },
          { id: 'mem-1', purpose: 'MEMBER_ALERT', createdAt: t },
          { id: 'coord', purpose: 'COORDINATOR_ALERT', createdAt: new Date(t.getTime() + 1) },
          ...Array.from({ length: 25 }, (_, i) => ({ id: `occ-x${i}`, purpose: 'OCCUPANT_ALERT', createdAt: t })),
        ]),
      },
    };
    const service = new IncidentNotificationDispatcherService(prisma as any, {} as any);
    const order: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    jest.spyOn(service, 'dispatchOne').mockImplementation(async (id: string) => {
      order.push(id);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      if (id === 'occ-x3') throw new Error('panne fournisseur');
      return { claimed: true, accepted: true, delivered: false };
    });
    const result = await service.dispatchIncidentNow('incident-1');
    expect(prisma.incidentNotificationDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { incidentEventId: 'incident-1', status: 'QUEUED', attemptCount: 0 } }),
    );
    expect(order.slice(0, 2)).toEqual(['coord', 'mem-1']);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
    expect(result).toEqual({ attempted: 28, accepted: 27 });
  });
});
