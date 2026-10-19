import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createBookingFixture } from './booking-postgres-fixture';
import { AdvisorCostRatesService } from '../src/mandate/advisor-cost-rates.service';
import { RendementFinancialService } from '../src/mandate/rendement-financial.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

async function financialRateActors(
  prisma: PrismaService,
  targetOrganizationId: string,
  legacyProposerId: string,
  legacyApproverId: string,
) {
  const authority = await prisma.platformAuthorityConfiguration.findUnique({
    where: { id: 'PRIMARY' },
  });
  if (!authority || authority.status === 'DRAFT') {
    const [proposer, approver] = await Promise.all([
      prisma.user.update({
        where: { id: legacyProposerId },
        data: { role: 'SUPER_ADMIN' },
      }),
      prisma.user.update({
        where: { id: legacyApproverId },
        data: { role: 'SUPER_ADMIN' },
      }),
    ]);
    return { proposer, approver };
  }
  const founder = await prisma.user.findUniqueOrThrow({
    where: { id: authority.founderUserId },
  });
  const approver = await prisma.user.create({
    data: {
      organizationId: authority.operatorOrganizationId,
      email: `${randomUUID()}@financial-rate.invalid`,
      password: 'synthetic-only',
      firstName: 'Financial',
      lastName: 'Approver',
      role: 'ADMIN',
    },
  });
  await prisma.platformPermissionGrant.create({
    data: {
      userId: approver.id,
      permission: 'FINANCIAL_ADVISOR_COST_MANAGE',
      scope: 'ORGANIZATION',
      targetOrganizationId,
      grantedByUserId: founder.id,
      grantReason: 'Synthetic financial PostgreSQL regression',
    },
  });
  return { proposer: founder, approver };
}

async function financialSaleActor(
  prisma: PrismaService,
  targetOrganizationId: string,
  legacyActorId: string,
) {
  const authority = await prisma.platformAuthorityConfiguration.findUnique({
    where: { id: 'PRIMARY' },
  });
  if (!authority || authority.status === 'DRAFT')
    return prisma.user.update({
      where: { id: legacyActorId },
      data: { role: 'SUPER_ADMIN' },
    });
  const founder = await prisma.user.findUniqueOrThrow({
    where: { id: authority.founderUserId },
  });
  const validator = await prisma.user.create({
    data: {
      organizationId: authority.operatorOrganizationId,
      email: `${randomUUID()}@financial-sale.invalid`,
      password: 'synthetic-only',
      firstName: 'Financial',
      lastName: 'Sale Validator',
      role: 'ADMIN',
    },
  });
  await prisma.platformPermissionGrant.create({
    data: {
      userId: validator.id,
      permission: 'FINANCIAL_SALE_VALIDATE',
      scope: 'ORGANIZATION',
      targetOrganizationId,
      grantedByUserId: founder.id,
      grantReason: 'Synthetic mandate sale PostgreSQL regression',
    },
  });
  return validator;
}

describePostgres('Governed rendement financial authority on PostgreSQL', () => {
  const authority = {
    requirePermission: jest.fn((actor: { role: string }) => {
      if (actor.role === 'OPERATOR') throw new ForbiddenException();
    }),
  };
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('governs rates, supersession, sold amount, aggregation, isolation and direct DB protections', async () => {
    const fixture = await createBookingFixture(prisma, true);
    const rateActors = await financialRateActors(
      prisma,
      fixture.org.id,
      fixture.admin.id,
      fixture.colleague.id,
    );
    const proposer = {
      userId: rateActors.proposer.id,
      organizationId: rateActors.proposer.organizationId,
      role: rateActors.proposer.role,
    } as const;
    const approver = {
      userId: rateActors.approver.id,
      organizationId: rateActors.approver.organizationId,
      role: rateActors.approver.role,
    } as const;
    const localFinancialAdmin = await financialSaleActor(
      prisma,
      fixture.org.id,
      fixture.colleague.id,
    );
    const saleApprover = {
      userId: localFinancialAdmin.id,
      organizationId: localFinancialAdmin.organizationId,
      role: localFinancialAdmin.role,
    } as const;
    const financialReadActor = {
      userId: fixture.admin.id,
      organizationId: fixture.org.id,
      role: fixture.admin.role,
    } as const;
    const rates = new AdvisorCostRatesService(prisma, authority as never);
    const financial = new RendementFinancialService(prisma, authority as never);
    const mandate = await prisma.projectMandate.create({
      data: {
        projectId: fixture.project.id,
        organizationId: fixture.org.id,
        montantVendu: 9999,
      },
    });
    const rateCountBeforeCurrencyRejections =
      await prisma.advisorInternalCostRate.count();
    for (const currency of ['USD', 'EUR', 'GBP', 'CHF', 'ZZZ']) {
      await expect(
        rates.createDraft(
          {
            userId: fixture.owner.id,
            currency,
            hourlyCost: '80',
            effectiveFrom: '2026-01-01',
          },
          proposer,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(await prisma.advisorInternalCostRate.count()).toBe(
      rateCountBeforeCurrencyRejections,
    );
    const mandateBeforeCurrencyRejections =
      await prisma.projectMandate.findUniqueOrThrow({
        where: { id: mandate.id },
      });
    for (const soldCurrency of ['USD', 'EUR', 'GBP', 'CHF', 'ZZZ']) {
      await expect(
        financial.validateSale(
          mandate.id,
          {
            soldAmount: '10000.00',
            soldCurrency,
            soldAt: '2026-01-10',
            reason: 'Synthetic currency rejection',
            lockVersion: 0,
          },
          saleApprover,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(
      await prisma.projectMandate.findUniqueOrThrow({
        where: { id: mandate.id },
      }),
    ).toEqual(mandateBeforeCurrencyRejections);
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
        {
          organizationId: fixture.org.id,
          userId,
          currency: 'CAD',
          hourlyCost,
          effectiveFrom: '2026-01-01',
        },
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
      saleApprover,
    );

    const projection = await financial.financial(financialReadActor, {
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
        organizationId: fixture.org.id,
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
    const rateActors = await financialRateActors(
      prisma,
      fixture.org.id,
      fixture.admin.id,
      fixture.colleague.id,
    );
    const proposer = {
      userId: rateActors.proposer.id,
      organizationId: rateActors.proposer.organizationId,
      role: rateActors.proposer.role,
    } as const;
    const approver = {
      userId: rateActors.approver.id,
      organizationId: rateActors.approver.organizationId,
      role: rateActors.approver.role,
    } as const;
    const rates = new AdvisorCostRatesService(prisma, authority as never);
    const proposed: Array<{ id: string; lockVersion: number }> = [];
    for (const effectiveFrom of ['2026-01-01', '2026-02-01']) {
      const draft = await rates.createDraft(
        {
          organizationId: fixture.org.id,
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
