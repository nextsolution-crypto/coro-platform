/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdvisorCostRatesService } from './advisor-cost-rates.service';

describe('AdvisorCostRatesService', () => {
  const authority = {
    requirePermission: jest.fn().mockResolvedValue(undefined),
  };
  it.each(['USD', 'EUR', 'GBP', 'CHF', 'ZZZ', null])(
    'rejects unsupported new rate currency %p before database access',
    async (currency) => {
      const userFindFirst = jest.fn();
      const prisma = {
        user: { findFirst: userFindFirst },
      } as any;
      const service = new AdvisorCostRatesService(prisma, authority as never);

      await expect(
        service.createDraft(
          {
            userId: 'advisor-a',
            currency: currency as unknown as string,
            hourlyCost: '80',
            effectiveFrom: '2026-01-01',
          },
          { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userFindFirst).not.toHaveBeenCalled();
    },
  );

  it('rejects self-approval without mutating the rate', async () => {
    const transaction = {
      $executeRaw: jest.fn(),
      advisorInternalCostRate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rate-a',
          organizationId: 'org-a',
          userId: 'advisor-a',
          currency: 'CAD',
          status: 'PROPOSED',
          lockVersion: 1,
          proposedByUserId: 'admin-a',
        }),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      advisorInternalCostRate: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-a' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    } as any;
    const service = new AdvisorCostRatesService(prisma, authority as never);

    await expect(
      service.approve(
        'rate-a',
        { lockVersion: 1, reason: 'Approval test' },
        {
          userId: 'admin-a',
          organizationId: 'org-a',
          role: 'ADMIN',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      transaction.advisorInternalCostRate.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('maps only the governed database authorization marker to a stable forbidden error', async () => {
    const databaseError = new Error(
      'PostgreSQL 23514: FINANCIAL_ACTOR_NOT_AUTHORIZED',
    );
    Object.setPrototypeOf(
      databaseError,
      Prisma.PrismaClientUnknownRequestError.prototype,
    );
    const prisma = {
      advisorInternalCostRate: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-a' }),
      },
      $transaction: jest.fn().mockRejectedValue(databaseError),
    } as any;
    const service = new AdvisorCostRatesService(prisma, authority as never);

    const rejection = service.submit(
      'rate-a',
      { lockVersion: 0, reason: 'Governed proposal' },
      {
        userId: 'founder-a',
        organizationId: 'operator-a',
        role: 'SUPER_ADMIN',
      },
    );
    await expect(rejection).rejects.toBeInstanceOf(ForbiddenException);
    await expect(rejection).rejects.toMatchObject({
      response: {
        code: 'FINANCIAL_ACTOR_NOT_AUTHORIZED',
        message: 'Autorisation financiÃ¨re requise.',
      },
    });
  });
});
