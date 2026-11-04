import { PrismaService } from '../prisma/prisma.service';
import { RendementFinancialService } from '../mandate/rendement-financial.service';

const describeQa =
  process.env.CORO_DEMO_RENDEMENT_QA === 'true' ? describe : describe.skip;

describeQa('CORO Demo Rendement integration', () => {
  const organizationId = '916f54ec-af22-45e0-99db-a369d9630002';
  let prisma: PrismaService;
  let service: RendementFinancialService;

  beforeAll(async () => {
    if (!(process.env.DATABASE_URL ?? '').includes('coro_demo_qa'))
      throw new Error('QA_DATABASE_GUARD_FAILED');
    prisma = new PrismaService();
    await prisma.$connect();
    service = new RendementFinancialService(prisma, {
      requirePermission: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  afterAll(async () => prisma.$disconnect());

  it('calculates the expected operational workload from canonical time entries', async () => {
    const result = await service.operational(
      { userId: 'unused-admin', organizationId, role: 'ADMIN' },
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(result.advisors).toHaveLength(1);
    expect(result.advisors[0]).toMatchObject({
      userName: 'Démo CORO',
      hours: 11.5,
    });
    expect(result.advisors[0].activities).toHaveLength(3);
    expect(result.advisors[0].participatedMandates).toHaveLength(3);
  });

  it('reports synthetic legacy sale values honestly instead of inventing margins', async () => {
    const result = await service.financial(
      { userId: 'unused-admin', organizationId, role: 'ADMIN' },
      { organizationId, view: 'cumulative' },
    );
    const demoMandates = result.mandates.filter((mandate) =>
      mandate.projectId.startsWith('d3000003-'),
    );
    expect(demoMandates).toHaveLength(3);
    for (const mandate of demoMandates) {
      expect(mandate.completeness).toBe('INCOMPLETE');
      expect(mandate.contributionMargin).toBeNull();
      expect(mandate.incompleteReasons).toEqual(
        expect.arrayContaining([
          'LEGACY_SOLD_AMOUNT_UNVALIDATED',
          'MISSING_SOLD_CURRENCY',
          'MISSING_VALIDATED_SOLD_DATE',
          'MISSING_ADVISOR_COST_RATE',
        ]),
      );
    }
  });
});
