import { OccupancyService } from './occupancy.service';

describe('OccupancyService resilience indicator accuracy', () => {
  const prisma = {
    project: { findFirst: jest.fn() },
    evacuationEvent: { findFirst: jest.fn(), count: jest.fn() },
    incidentEvent: { findMany: jest.fn() },
  };
  const service = new OccupancyService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(service, 'getReadiness').mockResolvedValue({
      status: 'READY',
      readinessIndex: 100,
      totalMembers: 2,
      presentMembers: 2,
      roleCoverage: [
        { role: 'COORDINATOR', total: 1, present: 1 },
        { role: 'FIRST_AIDER', total: 1, present: 1 },
      ],
      gaps: [],
      reduced: [],
      substitutions: [],
      members: [
        { isPresent: true, qualifications: [{ type: 'FIRST_AID_CPR' }, { type: 'AED' }] },
        { isPresent: true, qualifications: [{ type: 'FIRST_AID_CPR' }] },
      ],
      computedAt: new Date().toISOString(),
    } as any);
    prisma.project.findFirst.mockResolvedValue({
      status: 'VALIDATED',
      updatedAt: new Date(),
      documentType: 'PMU',
    });
    prisma.evacuationEvent.findFirst.mockResolvedValue({ triggeredAt: new Date() });
    prisma.evacuationEvent.count.mockResolvedValue(1);
    prisma.incidentEvent.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('calcule exactement les quatre composantes et leur pondération', async () => {
    const result = await service.getReadinessEnriched('building-a', 'kiosk-token');

    expect(result.enriched).toEqual({
      score: 100,
      status: 'READY',
      components: {
        roles: { score: 100, weight: 40 },
        qualifications: { score: 100, weight: 20 },
        plans: { score: 100, weight: 25 },
        exercises: { score: 100, weight: 15 },
      },
    });
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ buildingId: 'building-a', isActive: true }),
    }));
    expect(prisma.evacuationEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { buildingId: 'building-a', status: 'RESOLVED' },
    }));
  });

  it('ne transforme pas des sources manquantes en résilience positive', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    prisma.evacuationEvent.findFirst.mockResolvedValue(null);
    prisma.evacuationEvent.count.mockResolvedValue(0);
    jest.spyOn(service, 'getReadiness').mockResolvedValue({
      status: 'CRITICAL',
      readinessIndex: 0,
      totalMembers: 1,
      presentMembers: 0,
      roleCoverage: [{ role: 'COORDINATOR', total: 1, present: 0 }],
      gaps: [{ role: 'COORDINATOR' }],
      reduced: [],
      substitutions: [],
      members: [{ isPresent: false, qualifications: [] }],
      computedAt: new Date().toISOString(),
    } as any);

    const result = await service.getReadinessEnriched('building-a', 'kiosk-token');

    expect(result.enriched.score).toBe(0);
    expect(result.enriched.status).toBe('CRITICAL');
    expect(result.recommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'CRITICAL', category: 'PLANS' }),
      expect.objectContaining({ type: 'CRITICAL', category: 'EXERCISES' }),
      expect.objectContaining({ type: 'CRITICAL', category: 'ROLES' }),
    ]));
  });
});
