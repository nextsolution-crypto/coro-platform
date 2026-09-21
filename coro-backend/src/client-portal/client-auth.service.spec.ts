import { UnauthorizedException } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';

describe('ClientAuthService current user contract', () => {
  const prisma: any = { clientUser: { findFirst: jest.fn() } };
  const service = new ClientAuthService(prisma, {} as any);

  it('returns current database permissions without sensitive fields', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      id: 'cu-1', email: 'client@example.test', password: 'hash', firstName: 'M', lastName: 'G',
      role: 'CLIENT_MANAGER', clientId: 'client-1', organizationId: 'org-1', isActive: true,
      buildingIds: ['building-1'], populationPermissions: ['POPULATION_PREPARE'],
      operationalReviewPermissions: ['REX_CREATE'], correctiveActionPermissions: ['CORRECTIVE_ACTION_VERIFY'],
      client: { name: 'Client' },
    });
    const result = await service.getCurrentUser('cu-1', 'org-1');
    expect(result.operationalReviewPermissions).toEqual(['REX_CREATE']);
    expect(result.correctiveActionPermissions).toEqual(['CORRECTIVE_ACTION_VERIFY']);
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('buildingIds');
    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cu-1', organizationId: 'org-1', isActive: true } }));
  });

  it('rejects an inactive or out-of-tenant client user', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    await expect(service.getCurrentUser('cu-1', 'org-2')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
