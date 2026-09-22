import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService profile allowlist', () => {
  const prisma: any = {
    user: { update: jest.fn().mockResolvedValue({ id: 'user-a' }), findFirst: jest.fn().mockResolvedValue({ id: 'user-a' }) },
  };
  const service = new UsersService(prisma, {} as any);
  beforeEach(() => jest.clearAllMocks());

  it.each(['role', 'organizationId', 'isActive', 'timeZoneVerified', 'timeZone', 'password'])('rejects %s mass assignment', async field => {
    await expect(service.updateMe('user-a', { [field]: true } as any, false)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('preserves legitimate profile fields and restricts organization settings to managers', async () => {
    await service.updateMe('user-a', { firstName: 'Amel', horaireBase: 37.5 }, false);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { firstName: 'Amel', horaireBase: 37.5 } }));
    await expect(service.updateMe('user-a', { companyName: 'CORO' }, false)).rejects.toBeInstanceOf(BadRequestException);
    await service.updateMe('user-a', { companyName: 'CORO' }, true);
    expect(prisma.user.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { companyName: 'CORO' } }));
  });

  it('verifies only an authorized, scoped IANA timezone', async () => {
    await expect(service.setTimeZone('user-a', 'org-a', 'Invalid/Zone')).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.setTimeZone('user-a', 'org-b', 'America/Toronto')).rejects.toBeInstanceOf(NotFoundException);
    await service.setTimeZone('user-a', 'org-a', 'America/Vancouver');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { timeZone: 'America/Vancouver', timeZoneVerified: true } }));
  });
});
