import { OccupancyService } from './occupancy.service';

describe('OccupancyService resilience indicator accuracy', () => {
  const prisma = {
    project: { findFirst: jest.fn() },
    evacuationEvent: { findFirst: jest.fn(), count: jest.fn() },
    incidentEvent: { findMany: jest.fn() },
    exerciseReport: { findFirst: jest.fn(), count: jest.fn() },
    trainingQuestionnaireResponse: { findMany: jest.fn() },
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
    prisma.exerciseReport.findFirst.mockResolvedValue(null);
    prisma.exerciseReport.count.mockResolvedValue(0);
    prisma.trainingQuestionnaireResponse.findMany.mockResolvedValue([
      { percent: 90, passed: true, sessionId: 's1' },
      { percent: 85, passed: true, sessionId: 's1' },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('calcule exactement les cinq composantes et leur pondération', async () => {
    const result = await service.getReadinessEnriched('building-a', 'kiosk-token');

    expect(result.enriched).toEqual({
      score: 100,
      status: 'READY',
      components: {
        roles: { score: 100, weight: 35 },
        qualifications: { score: 100, weight: 15 },
        plans: { score: 100, weight: 25 },
        exercises: { score: 100, weight: 15 },
        training: { score: 100, weight: 10 },
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
    prisma.trainingQuestionnaireResponse.findMany.mockResolvedValue([]);
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
      expect.objectContaining({ type: 'WARNING', category: 'TRAINING' }),
    ]));
  });

  it('compte un rapport d’exercice d’évacuation approuvé comme exercice réalisé', async () => {
    prisma.evacuationEvent.findFirst.mockResolvedValue(null);
    prisma.evacuationEvent.count.mockResolvedValue(0);
    prisma.exerciseReport.findFirst.mockResolvedValue({ occurredAt: new Date() });
    prisma.exerciseReport.count.mockResolvedValue(1);

    const result: any = await service.getReadinessEnriched('building-a', 'kiosk-token');

    expect(result.enriched.components.exercises.score).toBe(100);
    expect(prisma.exerciseReport.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ buildingId: 'building-a', type: 'EVACUATION' }),
    }));
  });

  it('une formation à 50 % de réussite pèse 5 points sur 10', async () => {
    prisma.trainingQuestionnaireResponse.findMany.mockResolvedValue([
      { percent: 90, passed: true, sessionId: 's1' },
      { percent: 40, passed: false, sessionId: 's1' },
    ]);
    const result: any = await service.getReadinessEnriched('building-a', 'kiosk-token');
    expect(result.enriched.components.training.score).toBe(50);
    expect(result.enriched.score).toBe(95);
  });
});
