import { ForbiddenException } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { CapacityController } from '../mandate/capacity.controller';

describe('Existing team data routes', () => {
  it('filters organization bookings to an operator’s own projects or active assignments', async () => {
    const prisma = { booking: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new BookingsService(prisma as any, {} as any);
    await service.getBookingsForOrganization('org-a', { userId: 'u1', role: 'OPERATOR' });
    const where = prisma.booking.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe('org-a');
    expect(where.OR).toEqual(expect.arrayContaining([
      { project: { userId: 'u1' } },
      { assignments: { some: { userId: 'u1', status: { in: ['PENDING', 'ACCEPTED'] } } } },
    ]));
    await service.getBookingsForOrganization('org-a', { userId: 'admin', role: 'ADMIN' });
    expect(prisma.booking.findMany.mock.calls[1][0].where).toEqual({ organizationId: 'org-a' });
    await expect(service.getBookingsForOrganization('org-a', { userId: 'client', role: 'CLIENT' }))
      .rejects.toThrow(ForbiddenException);
  });

  it('denies capacity to an operator or client at the backend', () => {
    const service = { getCapacityPlanning: jest.fn() };
    const controller = new CapacityController(service as any);
    expect(() => controller.getCapacity({ user: { role: 'OPERATOR', organizationId: 'org-a' } })).toThrow(ForbiddenException);
    expect(() => controller.getCapacity({ user: { role: 'CLIENT', organizationId: 'org-a' } })).toThrow(ForbiddenException);
    controller.getCapacity({ user: { role: 'ADMIN', organizationId: 'org-a' } });
    expect(service.getCapacityPlanning).toHaveBeenCalledWith('org-a');
  });
});
