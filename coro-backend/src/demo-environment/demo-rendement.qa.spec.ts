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
      userName: 'Conseiller Démo',
      hours: 11.5,
    });
    expect(result.advisors[0].activities).toHaveLength(3);
    expect(result.advisors[0].participatedMandates).toHaveLength(3);
  });

  it('calculates complete margins from isolated demonstration assumptions', async () => {
    const result = await service.financial(
      { userId: 'unused-admin', organizationId, role: 'ADMIN' },
      { organizationId, view: 'cumulative' },
    );
    const demoMandates = result.mandates.filter((mandate) =>
      mandate.projectId.startsWith('d3000003-'),
    );
    expect(demoMandates).toHaveLength(3);
    expect(
      demoMandates.map((mandate) => ({
        projectId: mandate.projectId,
        completeness: mandate.completeness,
        soldAmount: mandate.soldAmount,
        knownLaborCost: mandate.knownLaborCost,
        contributionMargin: mandate.contributionMargin,
      })),
    ).toEqual([
      {
        projectId: 'd3000003-0000-4000-8000-000000000001',
        completeness: 'COMPLETE',
        soldAmount: '12800.00',
        knownLaborCost: '342.00',
        contributionMargin: '12458.00',
      },
      {
        projectId: 'd3000003-0000-4000-8000-000000000005',
        completeness: 'COMPLETE',
        soldAmount: '9400.00',
        knownLaborCost: '288.00',
        contributionMargin: '9112.00',
      },
      {
        projectId: 'd3000003-0000-4000-8000-000000000008',
        completeness: 'COMPLETE',
        soldAmount: '17600.00',
        knownLaborCost: '198.00',
        contributionMargin: '17402.00',
      },
    ]);
    expect(
      result.totals.find((total) => total.currency === 'CAD'),
    ).toMatchObject({
      soldAmount: '39800.00',
      knownLaborCost: '828.00',
      contributionMargin: '38972.00',
      completeMandates: 3,
      incompleteMandates: 0,
    });
  });
});
