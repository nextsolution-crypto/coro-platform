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
    rendementObjective: { findMany: jest.fn().mockResolvedValue([]) },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'advisor-a', firstName: 'Alex', lastName: 'A' },
        { id: 'advisor-b', firstName: 'Béa', lastName: 'B' },
      ]),
    },
  } as any;
  const service = new RendementFinancialService(prisma, authority as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rendementObjective.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'advisor-a', firstName: 'Alex', lastName: 'A' },
      { id: 'advisor-b', firstName: 'Béa', lastName: 'B' },
    ]);
  });

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
    // Rentabilité par conseiller : valeur au prorata des heures (base 30 h).
    expect(result.advisors).toEqual([
      expect.objectContaining({
        userId: 'advisor-b',
        userName: 'Béa B',
        hours: 20,
        knownLaborCost: '2000.00',
        producedValue: '6666.67',
        contributionMargin: '4666.67',
        completeness: 'COMPLETE',
      }),
      expect.objectContaining({
        userId: 'advisor-a',
        hours: 10,
        knownLaborCost: '800.00',
        producedValue: '3333.33',
        contributionMargin: '2533.33',
        valuePerHour: '333.33',
      }),
    ]);
  });

  it('builds the monthly view with the team objective and provisional months', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([
      {
        ...mandate(),
        heuresBudgetees: null,
        project: { ...mandate().project, status: 'IN_PROGRESS' },
      },
    ]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([
      { userId: 'advisor-a', currency: 'CAD', hourlyCost: new Prisma.Decimal('80'), effectiveFrom: new Date('2026-01-01'), effectiveUntil: null, supersededEffectiveAt: null },
      { userId: 'advisor-b', currency: 'CAD', hourlyCost: new Prisma.Decimal('100'), effectiveFrom: new Date('2026-01-01'), effectiveUntil: null, supersededEffectiveAt: null },
    ]);
    prisma.rendementObjective.findMany.mockResolvedValue([
      { userId: null, valueTarget: new Prisma.Decimal('120000') },
    ]);
    const result = await service.monthly(actor(), { year: 2026 });
    expect(result.team?.objective).toBe('120000.00');
    expect(result.team?.months[1]).toEqual(
      expect.objectContaining({ month: 2, hours: 30, producedValue: '10000.00', knownLaborCost: '2800.00', provisional: true }),
    );
    expect(result.team?.totals.producedValue).toBe('10000.00');
    expect(result.advisors.map((a: any) => a.userId)).toEqual(['advisor-b', 'advisor-a']);
  });

  it('limits the monthly view of an advisor to their own hours', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([mandate()]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([]);
    const result = await service.monthly({ userId: 'advisor-a', organizationId: 'org-a', role: 'OPERATOR' }, { year: 2026 });
    expect(result.team).toBeNull();
    expect(result.advisors.map((a: any) => a.userId)).toEqual(['advisor-a']);
    expect(result.advisors[0].totals.hours).toBe(10);
  });

  it('attributes only the realized share of a mandate still under its budgeted hours', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([mandate({ heuresBudgetees: 60 })]);
    prisma.advisorInternalCostRate.findMany.mockResolvedValue([
      {
        userId: 'advisor-a',
        currency: 'CAD',
        hourlyCost: new Prisma.Decimal('80'),
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
        supersededEffectiveAt: null,
      },
    ]);
    const result = await service.financial(actor(), { view: 'cumulative' });
    const a = result.advisors.find((advisor: any) => advisor.userId === 'advisor-a');
    const b = result.advisors.find((advisor: any) => advisor.userId === 'advisor-b');
    expect(a).toEqual(expect.objectContaining({ producedValue: '1666.67', completeness: 'COMPLETE' }));
    expect(b).toEqual(
      expect.objectContaining({
        completeness: 'INCOMPLETE',
        contributionMargin: null,
        incompleteReasons: ['MISSING_ADVISOR_COST_RATE'],
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

  it('lets an organization ADMIN read its own team without platform authority', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([]);
    const result = await service.financial(actor('ADMIN'), { view: 'cumulative' });
    expect(authority.requirePermission).not.toHaveBeenCalled();
    expect(result.scope.audience).toBe('ORGANIZATION');
    expect(prisma.projectMandate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }),
    );
  });

  it('limits an advisor to the mandates they worked on', async () => {
    prisma.projectMandate.findMany.mockResolvedValue([]);
    const result = await service.financial(actor('OPERATOR'), {
      view: 'cumulative',
      userId: 'someone-else',
    } as any);
    expect(authority.requirePermission).not.toHaveBeenCalled();
    expect(result.scope.audience).toBe('ADVISOR');
    const where = prisma.projectMandate.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('admin-a');
    expect(JSON.stringify(where)).not.toContain('someone-else');
  });

  it('requires platform authority for another organization before querying', async () => {
    authority.requirePermission
      .mockRejectedValueOnce(new ForbiddenException())
      .mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.financial(actor('ADMIN'), { view: 'cumulative', organizationId: 'org-b' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.financial(actor('OPERATOR'), { view: 'cumulative', organizationId: 'org-b' } as any),
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
