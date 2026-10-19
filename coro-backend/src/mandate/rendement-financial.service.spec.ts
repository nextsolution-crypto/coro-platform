/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RendementFinancialService } from './rendement-financial.service';

const actor = (role = 'ADMIN', organizationId = 'org-a') => ({
  userId: 'admin-a',
  organizationId,
  role,
});

const entry = (id: string, userId: string, date: string, heures: number) => ({
  id,
  userId,
  date: new Date(date),
  heures,
});

const mandate = (overrides: Record<string, unknown> = {}) => ({
  id: 'mandate-a',
  projectId: 'project-a',
  montantVendu: 10000,
  soldAmountDecimal: new Prisma.Decimal('10000.00'),
  soldCurrency: 'CAD',
  soldAt: new Date('2026-01-10T00:00:00.000Z'),
  soldValidatedAt: new Date('2026-01-10T12:00:00.000Z'),
  project: {
    id: 'project-a',
    name: 'Mandat test',
    client: { name: 'Client test' },
    projectTasks: [
      {
        timeEntries: [entry('e1', 'advisor-a', '2026-02-01T15:00:00.000Z', 10)],
      },
      {
        timeEntries: [entry('e2', 'advisor-b', '2026-02-02T15:00:00.000Z', 20)],
      },
    ],
  },
  ...overrides,
});

describe('RendementFinancialService', () => {
  const authority = {
    requirePermission: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    projectMandate: { findMany: jest.fn() },
    advisorInternalCostRate: { findMany: jest.fn() },
    taskTimeEntry: { findMany: jest.fn() },
  } as any;
  const service = new RendementFinancialService(prisma, authority as never);

  beforeEach(() => jest.clearAllMocks());

  it.each(['USD', 'EUR', 'GBP', 'CHF', 'ZZZ', null])(
    'rejects unsupported new mandate sale currency %p before database access',
    async (soldCurrency) => {
      await expect(
        service.validateSale(
          'mandate-a',
          {
            soldAmount: '100.00',
            soldCurrency: soldCurrency as unknown as string,
            soldAt: '2026-01-01',
            reason: 'Currency policy regression',
            lockVersion: 0,
          },
          actor(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.projectMandate.findMany).not.toHaveBeenCalled();
    },
  );

  it('aggregates a sold mandate once across advisors with Decimal labor cost', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([mandate()]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([
      {
        userId: 'advisor-a',
        currency: 'CAD',
        hourlyCost: new Prisma.Decimal('80'),
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
        supersededEffectiveAt: null,
      },
      {
        userId: 'advisor-b',
        currency: 'CAD',
        hourlyCost: new Prisma.Decimal('100'),
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
        supersededEffectiveAt: null,
      },
    ]);

    const result = await service.financial(actor(), {
      view: 'cumulative',
    });

    expect(result.totals).toEqual([
      expect.objectContaining({
        currency: 'CAD',
        soldAmount: '10000.00',
        knownLaborCost: '2800.00',
        contributionMargin: '7200.00',
        completeMandates: 1,
        uniqueLossMakingMandates: 0,
      }),
    ]);
    expect(result.mandates[0]).toEqual(
      expect.objectContaining({
        contributionMargin: '7200.00',
        contributionMarginPercent: '72.00',
        totalTimeEntries: 2,
      }),
    );
  });

  it('does not claim a margin when a rate or governed sold amount is missing', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([
      mandate({
        soldAmountDecimal: null,
        soldCurrency: null,
        soldAt: null,
        soldValidatedAt: null,
      }),
    ]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([]);

    const result = await service.financial(actor(), {
      view: 'cumulative',
    });

    expect(result.mandates[0].completeness).toBe('INCOMPLETE');
    expect(result.mandates[0].contributionMargin).toBeNull();
    expect(result.mandates[0].incompleteReasons).toEqual(
      expect.arrayContaining([
        'LEGACY_SOLD_AMOUNT_UNVALIDATED',
        'MISSING_SOLD_CURRENCY',
        'MISSING_VALIDATED_SOLD_DATE',
        'MISSING_ADVISOR_COST_RATE',
      ]),
    );
  });

  it('preserves zero as a governed value distinct from null', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([
      mandate({
        soldAmountDecimal: new Prisma.Decimal(0),
        project: { ...mandate().project, projectTasks: [{ timeEntries: [] }] },
      }),
    ]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([]);

    const result = await service.financial(actor(), {
      view: 'cumulative',
    });

    expect(result.mandates[0].soldAmount).toBe('0.00');
    expect(result.mandates[0].incompleteReasons).not.toContain(
      'MISSING_SOLD_AMOUNT',
    );
  });

  it('rejects OPERATOR and cross-tenant financial access before querying', async () => {
    authority.requirePermission.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.financial(actor('OPERATOR'), { view: 'cumulative' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.projectMandate.findMany).not.toHaveBeenCalled();
  });

  it('forces OPERATOR operational queries to the authenticated user', async () => {
    prisma.taskTimeEntry.findMany.mockResolvedValue([]);

    await service.operational(actor('OPERATOR'), {
      userId: 'someone-else',
    });

    expect(prisma.taskTimeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'admin-a' }),
      }),
    );
  });

  it('maps only the governed sale authorization marker to a stable forbidden error', async () => {
    const databaseError = new Error(
      'PostgreSQL 23514: FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED',
    );
    Object.setPrototypeOf(
      databaseError,
      Prisma.PrismaClientUnknownRequestError.prototype,
    );
    const isolatedPrisma = {
      projectMandate: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-a' }),
      },
      $transaction: jest.fn().mockRejectedValue(databaseError),
    } as any;
    const isolatedService = new RendementFinancialService(
      isolatedPrisma,
      authority as never,
    );

    const rejection = isolatedService.validateSale(
      'mandate-a',
      {
        soldAmount: '100.00',
        soldCurrency: 'CAD',
        soldAt: '2026-01-01',
        reason: 'Governed sale validation',
        lockVersion: 0,
      },
      actor('SUPER_ADMIN', 'operator-a'),
    );
    await expect(rejection).rejects.toBeInstanceOf(ForbiddenException);
    await expect(rejection).rejects.toMatchObject({
      response: {
        code: 'FINANCIAL_SALE_ACTOR_NOT_AUTHORIZED',
        message: 'Autorisation de validation financière requise.',
      },
    });
  });
});
