import { ForbiddenException } from '@nestjs/common';
import { createBookingFixture } from './booking-postgres-fixture';
import { AdvisorCostRatesService } from '../src/mandate/advisor-cost-rates.service';
import { RendementFinancialService } from '../src/mandate/rendement-financial.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Governed rendement financial authority on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('governs rates, supersession, sold amount, aggregation, isolation and direct DB protections', async () => {
    const fixture = await createBookingFixture(prisma, true);
    const secondAdmin = await prisma.user.update({
      where: { id: fixture.colleague.id },
      data: { role: 'ADMIN' },
    });
    const proposer = {
      userId: fixture.admin.id,
      organizationId: fixture.org.id,
      role: 'ADMIN',
    } as const;
    const approver = {
      userId: secondAdmin.id,
      organizationId: fixture.org.id,
      role: 'ADMIN',
    } as const;
    const rates = new AdvisorCostRatesService(prisma);
    const financial = new RendementFinancialService(prisma);
    const mandate = await prisma.projectMandate.create({
      data: {
        projectId: fixture.project.id,
        organizationId: fixture.org.id,
        montantVendu: 9999,
      },
    });
    const task = await prisma.projectTask.create({
      data: {
        projectId: fixture.project.id,
        organizationId: fixture.org.id,
        categoryName: 'Finance QA',
        taskTitle: 'Synthetic governed cost',
      },
    });
    await prisma.taskTimeEntry.createMany({
      data: [
        {
          taskId: task.id,
          userId: fixture.owner.id,
          organizationId: fixture.org.id,
          date: new Date('2026-02-15T17:00:00.000Z'),
          heures: 10,
        },
        {
          taskId: task.id,
          userId: fixture.target.id,
          organizationId: fixture.org.id,
          date: new Date('2026-02-16T17:00:00.000Z'),
          heures: 20,
        },
      ],
    });

    const createAndApprove = async (userId: string, hourlyCost: string) => {
      const draft = await rates.createDraft(
        { userId, currency: 'CAD', hourlyCost, effectiveFrom: '2026-01-01' },
        proposer,
      );
      const proposed = await rates.submit(
        draft.id,
        { lockVersion: draft.lockVersion, reason: 'Synthetic proposal' },
        proposer,
      );
      return rates.approve(
        draft.id,
        {
          lockVersion: proposed.lockVersion,
          reason: 'Independent synthetic approval',
        },
        approver,
      );
    };
    const oldRate = await createAndApprove(fixture.owner.id, '80');
    await createAndApprove(fixture.target.id, '100');
    await financial.validateSale(
      mandate.id,
      {
        soldAmount: '10000.00',
        soldCurrency: 'CAD',
        soldAt: '2026-01-10',
        reason: 'Synthetic sale validation',
        lockVersion: 0,
      },
      approver,
    );

    const projection = await financial.financial(approver, {
      view: 'cumulative',
    });
    expect(projection.totals).toEqual([
      expect.objectContaining({
        soldAmount: '10000.00',
        knownLaborCost: '2800.00',
        contributionMargin: '7200.00',
        completeMandates: 1,
      }),
    ]);
    expect(projection.mandates).toHaveLength(1);

    const replacement = await rates.createDraft(
      {
        userId: fixture.owner.id,
        currency: 'CAD',
        hourlyCost: '90',
        effectiveFrom: '2026-03-01',
        supersedesRateId: oldRate.id,
      },
      approver,
    );
    const replacementProposed = await rates.submit(
      replacement.id,
      { lockVersion: replacement.lockVersion, reason: 'Rate change' },
      approver,
    );
    await rates.approve(
      replacement.id,
      {
        lockVersion: replacementProposed.lockVersion,
        reason: 'Independent rate change approval',
      },
      proposer,
    );
    expect(
      await prisma.advisorInternalCostRate.findUniqueOrThrow({
        where: { id: oldRate.id },
      }),
    ).toMatchObject({
      status: 'SUPERSEDED',
      supersededEffectiveAt: new Date('2026-03-01'),
    });
    await expect(
      prisma.advisorInternalCostRate.update({
        where: { id: oldRate.id },
        data: { hourlyCost: '1' },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.advisorInternalCostRate.delete({ where: { id: oldRate.id } }),
    ).rejects.toBeDefined();

    await expect(
      financial.financial(
        {
          userId: fixture.owner.id,
          organizationId: fixture.org.id,
          role: 'OPERATOR',
        },
        { view: 'cumulative' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      financial.financial(
        {
          userId: fixture.outsider!.id,
          organizationId: fixture.otherOrg!.id,
          role: 'ADMIN',
        },
        { view: 'cumulative' },
      ),
    ).resolves.toEqual(expect.objectContaining({ mandates: [] }));
  });

  it('serializes concurrent approvals so only one overlapping rate is approved', async () => {
    const fixture = await createBookingFixture(prisma);
    const secondAdmin = await prisma.user.update({
      where: { id: fixture.colleague.id },
      data: { role: 'ADMIN' },
    });
    const proposer = {
      userId: fixture.admin.id,
      organizationId: fixture.org.id,
      role: 'ADMIN',
    } as const;
    const approver = {
      userId: secondAdmin.id,
      organizationId: fixture.org.id,
      role: 'ADMIN',
    } as const;
    const rates = new AdvisorCostRatesService(prisma);
    const proposed: Array<{ id: string; lockVersion: number }> = [];
    for (const effectiveFrom of ['2026-01-01', '2026-02-01']) {
      const draft = await rates.createDraft(
        {
          userId: fixture.owner.id,
          currency: 'CAD',
          hourlyCost: '75',
          effectiveFrom,
        },
        proposer,
      );
      proposed.push(
        await rates.submit(
          draft.id,
          { lockVersion: draft.lockVersion, reason: 'Concurrent proposal' },
          proposer,
        ),
      );
    }

    const results = await Promise.allSettled(
      proposed.map((rate) =>
        rates.approve(
          rate.id,
          { lockVersion: rate.lockVersion, reason: 'Concurrent approval' },
          approver,
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.advisorInternalCostRate.count({
        where: {
          organizationId: fixture.org.id,
          userId: fixture.owner.id,
          status: 'APPROVED',
        },
      }),
    ).toBe(1);
  });
});
