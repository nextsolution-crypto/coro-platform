/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { ForbiddenException } from '@nestjs/common';
import { AdvisorCostRatesService } from './advisor-cost-rates.service';

describe('AdvisorCostRatesService', () => {
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
      $transaction: jest.fn((callback) => callback(transaction)),
    } as any;
    const service = new AdvisorCostRatesService(prisma);

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
});
