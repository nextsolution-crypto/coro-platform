import { openEvacuationWithSnapshot } from './occupancy.service';
import { EVACUATION_INCIDENT_TYPES } from './incident.service';

function prismaWith(active: any, present: any[]) {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    evacuationEvent: {
      findFirst: jest.fn().mockResolvedValue(active),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'evac-1', ...data })),
    },
    occupancyRecord: { findMany: jest.fn().mockResolvedValue(present) },
    evacuationCheckIn: { createMany: jest.fn().mockResolvedValue({ count: present.length }) },
  };
  return { tx, prisma: { $transaction: (cb: any) => cb(tx) } as any };
}

describe('un seul circuit incident → évacuation (M5-07)', () => {
  it("ouvre l'évacuation avec instantané, dénombrement et lien vers l'incident", async () => {
    const { prisma, tx } = prismaWith(null, [{ id: 'occ-1' }, { id: 'occ-2' }]);
    const result = await openEvacuationWithSnapshot(prisma, {
      buildingId: 'b', organizationId: 'o', triggeredBy: 'Ada', incidentEventId: 'inc-1', notes: 'Ouverte par l’incident',
    });
    expect(result.created).toBe(true);
    expect(tx.evacuationEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ incidentEventId: 'inc-1', totalPresent: 2, status: 'ACTIVE' }),
    }));
    expect(tx.evacuationCheckIn.createMany).toHaveBeenCalled();
  });

  it("réutilise l'évacuation déjà active au lieu d'en ouvrir une seconde", async () => {
    const { prisma, tx } = prismaWith({ id: 'evac-existing' }, []);
    const result = await openEvacuationWithSnapshot(prisma, { buildingId: 'b', organizationId: 'o' });
    expect(result).toEqual({ created: false, event: { id: 'evac-existing' } });
    expect(tx.evacuationEvent.create).not.toHaveBeenCalled();
  });

  it('évacue pour le feu, le gaz ou un colis suspect, pas pour une menace active ni une urgence médicale', () => {
    for (const type of ['FIRE_ALARM', 'SMOKE_DISCOVERY', 'GAS_LEAK', 'SUSPICIOUS_PACKAGE']) {
      expect(EVACUATION_INCIDENT_TYPES.has(type)).toBe(true);
    }
    for (const type of ['ACTIVE_THREAT', 'MEDICAL', 'POWER_OUTAGE', 'OTHER']) {
      expect(EVACUATION_INCIDENT_TYPES.has(type)).toBe(false);
    }
  });
});
