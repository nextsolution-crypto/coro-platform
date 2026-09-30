import { OperationalStateService } from './operational-state.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OperationalStateService', () => {
  it('uses all authoritative active Incident statuses', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const prisma = {
      incidentEvent: { count },
    } as unknown as PrismaService;
    const result = await new OperationalStateService(prisma).incident('org');
    expect(result).toMatchObject({
      active: true,
      count: 2,
      quality: 'CANONICAL',
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org',
        isActive: true,
        status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] },
      },
    });
  });
  it('returns NOT_AVAILABLE rather than zero on source failure', async () => {
    const prisma = {
      evacuationEvent: {
        count: jest.fn().mockRejectedValue(new Error('down')),
      },
    } as unknown as PrismaService;
    await expect(
      new OperationalStateService(prisma).evacuation('org'),
    ).resolves.toMatchObject({
      active: null,
      count: null,
      quality: 'NOT_AVAILABLE',
    });
  });
});
